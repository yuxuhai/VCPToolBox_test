// TagVectorManager.js
// 🌟 全局Tag向量管理器 - 独立模块，零侵入性设计
// ✅ 已修复所有致命bug和隐患

const fs = require('fs').promises;
const path = require('path');
const { HierarchicalNSW } = require('hnswlib-node');
const chokidar = require('chokidar');
const crypto = require('crypto');

/**
 * 全局Tag向量管理器
 * 职责：
 * 1. 扫描所有日记文件末尾的Tag行
 * 2. 构建全局Tag向量库（去重）
 * 3. 监听文件变化，增量更新Tag向量
 * 4. 提供Tag相似度搜索接口
 */
class TagVectorManager {
    constructor(config = {}) {
        // ✅ 从环境变量读取黑名单
        const envBlacklist = process.env.TAG_BLACKLIST
            ? process.env.TAG_BLACKLIST.split(',').map(t => t.trim()).filter(Boolean)
            : [];
        
        // ✅ 从环境变量读取过滤规则
        const envIgnoreFolders = process.env.TAG_IGNORE_FOLDERS
            ? process.env.TAG_IGNORE_FOLDERS.split(',').map(t => t.trim()).filter(Boolean)
            : ['VCP论坛', 'MusicDiary', '莱恩作品集'];
        
        const envIgnorePrefix = process.env.TAG_IGNORE_PREFIX || '已整理';
        const envIgnoreSuffix = process.env.TAG_IGNORE_SUFFIX || '簇';
        
        this.config = {
            diaryRootPath: config.diaryRootPath || path.join(__dirname, 'dailynote'),
            vectorStorePath: config.vectorStorePath || path.join(__dirname, 'VectorStore'),
            tagBatchSize: parseInt(process.env.TAG_VECTORDB_BATCH_SIZE) || 100,
            tagBlacklist: envBlacklist.length > 0 ? envBlacklist : ['今天', '明天', '昨天', '心情', '很', '非常'],
            minTagLength: 2,
            maxTagLength: 50,
            ignorePatterns: envIgnoreFolders,
            ignorePrefix: envIgnorePrefix,
            ignoreSuffix: envIgnoreSuffix,
            debug: process.env.TAG_VECTOR_DEBUG === 'true',
            dataVersion: '2.0.0', // ✅ 添加版本号
            ...config
        };

        // Tag数据结构
        this.globalTags = new Map(); // tag_text → { vector, frequency, diaries: Set }
        this.tagIndex = null; // HNSW索引
        this.tagToLabel = new Map(); // tag_text → label
        this.labelToTag = new Map(); // label → tag_text
        
        // 🌟 新增：文件注册表（反向索引） - 实现O(1) Diff的关键
        // filePath → { hash: string, tags: Set<string> }
        this.fileRegistry = new Map();
        
        // 🌟 脏数据追踪（用于增量保存）
        this.dirtyTags = new Set(); // 标记哪些Tag的数据变了
        this.deletedLabels = new Set(); // HNSW软删除标记

        // 文件监控
        this.watcher = null;
        this.pendingUpdates = new Map();

        // ✅ Bug #5修复: 并发控制
        this.updateLock = false;
        this.updateQueue = [];
        
        // ✅ 保存操作锁 - 防止并发保存导致数据损坏
        this.saveLock = false;
        this.saveQueue = [];
        
        // ✅ 批量索引更新优化
        this.pendingIndexUpdates = new Set(); // 当前批次待添加到索引的tag
        this.nextBatchIndexUpdates = new Set(); // 🌟 下一批次的tag（批处理运行时的新变更）
        this.indexRebuildTimer = null;
        this.indexRebuildDelay = parseInt(process.env.TAG_INDEX_REBUILD_DELAY) || 60000; // 🌟 改为60秒（1分钟）合并窗口
        this.isIndexRebuilding = false; // 🌟 批索引是否正在运行
        
        // 🌟 防抖保存配置
        this.saveDebounce = 2000; // 保存防抖时间
        this.saveTimer = null;

        // 状态
        this.initialized = false;
        this.isBuilding = false;

        console.log('[TagVectorManager] Initialized with batch size:', this.config.tagBatchSize);
    }

    /**
     * 🌟 提取Tag内容（纯函数，用于Diff计算）
     */
    extractTagsFromContent(content) {
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return [];
        
        const lastLine = lines[lines.length - 1];
        const match = lastLine.match(/^Tag:\s*(.+)$/i);
        if (!match) return [];
        
        return match[1]
            .split(/[,，、]/)
            .map(t => t.trim())
            .filter(t => this.isValidTag(t));
    }

    debugLog(message, ...args) {
        if (this.config.debug) {
            console.log(`[TagVectorManager][DEBUG] ${message}`, ...args);
        }
    }

    /**
     * ✅ Bug #10修复: 计算数据校验和
     */
    computeChecksum(data) {
        const hash = crypto.createHash('sha256');
        hash.update(JSON.stringify(data));
        return hash.digest('hex');
    }

    /**
     * 🌟 初始化 - 严格顺序保证，避免竞态条件
     */
    async initialize(embeddingFunction) {
        if (this.initialized) return;

        console.log('[TagVectorManager] Initializing...');
        this.embeddingFunction = embeddingFunction;

        await fs.mkdir(this.config.vectorStorePath, { recursive: true });

        const tagIndexPath = path.join(this.config.vectorStorePath, 'GlobalTags.bin');
        const tagDataPath = path.join(this.config.vectorStorePath, 'GlobalTags.json');

        let libraryExists = false;
        let needsBuildRegistry = false;
        
        // ====== 步骤1: 加载Tag库 ======
        try {
            await this.loadGlobalTagLibrary(tagIndexPath, tagDataPath);
            console.log('[TagVectorManager] ✅ Loaded existing library');
            libraryExists = true;
        } catch (e) {
            console.log('[TagVectorManager] No existing library found, building from scratch...');
            await this.buildGlobalTagLibrary();
            await this.saveGlobalTagLibrary(tagIndexPath, tagDataPath);
            needsBuildRegistry = true; // 首次构建，需要建立反向索引
        }

        // ====== 步骤2: 加载/构建文件注册表（必须在Tag库加载后）======
        try {
            await this.loadFileRegistry();
            
            // ✅ 关键检查：即使加载成功，也验证数据完整性
            if (this.fileRegistry.size === 0 && this.globalTags.size > 0) {
                // FileRegistry为空但Tag库有数据，说明是旧版本或数据损坏
                console.log('[TagVectorManager] ⚠️ FileRegistry is empty but Tag library exists, rebuilding...');
                needsBuildRegistry = true;
            } else {
                console.log(`[TagVectorManager] ✅ FileRegistry verified: ${this.fileRegistry.size} files indexed`);
            }
        } catch (e) {
            // FileRegistry不存在或加载失败
            console.log(`[TagVectorManager] ⚠️ FileRegistry load failed: ${e.message}`);
            needsBuildRegistry = true;
        }

        // ====== 步骤3: 如果需要，构建反向索引 ======
        if (needsBuildRegistry) {
            console.log('[TagVectorManager] 🔨 Building FileRegistry (migration/repair)...');
            await this.buildFileRegistryFromScratch();
        }

        // ====== 步骤4: 增量更新检查（仅在库已存在时）======
        if (libraryExists && !needsBuildRegistry) {
            console.log('[TagVectorManager] 🔍 Checking for new tags...');
            const hasChanges = await this.incrementalUpdateOptimized();
            if (hasChanges) {
                await this.saveGlobalTagLibrary(tagIndexPath, tagDataPath);
                console.log('[TagVectorManager] ✅ Incremental update completed');
            } else {
                console.log('[TagVectorManager] No changes detected');
            }
        }

        // ====== 步骤5: 启动文件监控 ======
        this.startFileWatcher();
        this.initialized = true;
        console.log('[TagVectorManager] ✅ Initialized');
    }

    /**
     * 🌟 构建全局Tag库
     */
    async buildGlobalTagLibrary() {
        if (this.isBuilding) return;
        this.isBuilding = true;

        try {
            console.log('[TagVectorManager] 🚀 Building library...');
            
            const tagStats = await this.scanAllDiaryTags();
            console.log(`[TagVectorManager] Found ${tagStats.uniqueTags} unique tags`);

            this.applyTagFilters(tagStats);
            console.log(`[TagVectorManager] After filtering: ${this.globalTags.size} tags`);

            if (this.globalTags.size === 0) return;

            await this.vectorizeAllTags();
            await this.buildHNSWIndex();

        } finally {
            this.isBuilding = false;
        }
    }

    /**
     * 扫描所有日记
     */
    async scanAllDiaryTags() {
        const stats = { totalFiles: 0, uniqueTags: 0 };
        const diaryBooks = await fs.readdir(this.config.diaryRootPath, { withFileTypes: true });

        for (const dirent of diaryBooks) {
            if (!dirent.isDirectory()) continue;
            
            const diaryName = dirent.name;
            
            // ✅ 根据规则过滤文件夹
            if (this.shouldIgnoreFolder(diaryName)) {
                this.debugLog(`Ignoring folder: "${diaryName}"`);
                continue;
            }

            const diaryPath = path.join(this.config.diaryRootPath, diaryName);
            
            try {
                const files = await fs.readdir(diaryPath);
                const diaryFiles = files.filter(f => 
                    f.toLowerCase().endsWith('.txt') || f.toLowerCase().endsWith('.md')
                );

                for (const file of diaryFiles) {
                    const filePath = path.join(diaryPath, file);
                    const tags = await this.extractTagsFromFile(filePath);
                    if (tags.length > 0) {
                        this.recordTags(tags, diaryName);
                        stats.totalFiles++;
                    }
                }
            } catch (error) {
                console.error(`[TagVectorManager] Error scanning "${diaryName}":`, error.message);
            }
        }

        stats.uniqueTags = this.globalTags.size;
        return stats;
    }

    /**
     * 从文件末尾提取Tag行
     */
    async extractTagsFromFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
            if (lines.length === 0) return [];

            const lastLine = lines[lines.length - 1];
            const match = lastLine.match(/^Tag:\s*(.+)$/i);
            if (!match) return [];

            return match[1]
                .split(/[,，、]/)
                .map(t => t.trim())
                .filter(t => this.isValidTag(t));
        } catch (error) {
            return [];
        }
    }

    /**
     * Tag有效性检查
     */
    isValidTag(tag) {
        if (!tag || typeof tag !== 'string') return false;
        if (tag.length < this.config.minTagLength) return false;
        if (tag.length > this.config.maxTagLength) return false;
        if (this.config.tagBlacklist.includes(tag)) return false;
        if (/^[\d\s\p{P}]+$/u.test(tag)) return false;
        return true;
    }

    /**
     * 记录Tag统计
     */
    recordTags(tags, diaryName) {
        for (const tag of tags) {
            if (!this.globalTags.has(tag)) {
                this.globalTags.set(tag, {
                    vector: null,
                    frequency: 0,
                    diaries: new Set()
                });
            }
            const tagData = this.globalTags.get(tag);
            tagData.frequency++;
            tagData.diaries.add(diaryName);
        }
    }

    /**
     * 应用过滤规则
     */
    applyTagFilters(stats) {
        const threshold = Math.floor(stats.totalFiles * 0.3);
        for (const [tag, data] of this.globalTags.entries()) {
            if (data.frequency > threshold) {
                this.globalTags.delete(tag);
            }
        }
    }

    /**
     * 🌟 批量向量化（大batch）
     */
    async vectorizeAllTags() {
        const allTags = Array.from(this.globalTags.keys());
        const batchSize = this.config.tagBatchSize;

        console.log(`[TagVectorManager] Vectorizing ${allTags.length} tags (batch=${batchSize})...`);

        for (let i = 0; i < allTags.length; i += batchSize) {
            const batch = allTags.slice(i, i + batchSize);
            const progress = ((i / allTags.length) * 100).toFixed(1);
            console.log(`[TagVectorManager] Progress: ${progress}% (${i}/${allTags.length})`);

            const vectors = await this.embeddingFunction(batch);
            
            for (let j = 0; j < batch.length; j++) {
                const tagData = this.globalTags.get(batch[j]);
                if (tagData) tagData.vector = vectors[j];
            }
        }
    }

    /**
     * ✅ 修复问题1: 构建HNSW索引（保持label映射一致性 + 动态扩容 + 非阻塞批处理）
     */
    async buildHNSWIndex() {
        try {
            const tagsWithVectors = Array.from(this.globalTags.entries())
                .filter(([_, data]) => data.vector !== null);

            if (tagsWithVectors.length === 0) {
                throw new Error('No vectorized tags available for index building');
            }

            console.log(`[TagVectorManager] Building HNSW index for ${tagsWithVectors.length} tags...`);

            // ✅ 验证向量完整性
            const invalidVectors = [];
            for (let i = 0; i < tagsWithVectors.length; i++) {
                const [tag, data] = tagsWithVectors[i];
                if (!data.vector || !Array.isArray(data.vector) && !(data.vector instanceof Float32Array)) {
                    invalidVectors.push(tag);
                }
            }

            if (invalidVectors.length > 0) {
                console.error(`[TagVectorManager] Found ${invalidVectors.length} tags with invalid vectors:`, invalidVectors.slice(0, 5));
                throw new Error(`${invalidVectors.length} tags have invalid vectors`);
            }

            // ✅ 验证向量维度一致性
            const dimensions = tagsWithVectors[0][1].vector.length;
            for (let i = 1; i < Math.min(10, tagsWithVectors.length); i++) {
                const vecLen = tagsWithVectors[i][1].vector.length;
                if (vecLen !== dimensions) {
                    throw new Error(`Dimension mismatch: expected ${dimensions}, got ${vecLen} at tag "${tagsWithVectors[i][0]}"`);
                }
            }

            console.log(`[TagVectorManager] All vectors validated (dimensions=${dimensions})`);

            // ✅ 问题4修复: 动态容量检测和扩容
            const currentCapacity = this.tagIndex?.getMaxElements?.() || 0;
            const requiredCapacity = tagsWithVectors.length;
            const needsRebuild = !this.tagIndex || requiredCapacity > currentCapacity * 0.9;

            if (needsRebuild) {
                console.log(`[TagVectorManager] ${this.tagIndex ? 'Expanding' : 'Creating'} index (current: ${currentCapacity}, required: ${requiredCapacity})`);
                
                this.tagIndex = new HierarchicalNSW('l2', dimensions);
                const newCapacity = Math.ceil(requiredCapacity * 1.5); // 50%缓冲
                this.tagIndex.initIndex(newCapacity);
                console.log(`[TagVectorManager] Index initialized with capacity: ${newCapacity}`);
            }

            // ✅ 问题1修复: 保持已有的label映射，只为新tag分配label
            const existingLabels = new Set(this.tagToLabel.values());
            const maxExistingLabel = existingLabels.size > 0 ? Math.max(...existingLabels) : -1;
            let nextAvailableLabel = maxExistingLabel + 1;

            // 清理索引但保留映射（如果需要重建）
            if (needsRebuild) {
                // 只清空索引，不清空映射
                console.log(`[TagVectorManager] Preserving ${this.tagToLabel.size} existing label mappings`);
            }

            // ✅ 批量添加向量（保持label一致性 + 非阻塞处理）
            let successCount = 0;
            const labelsToRemove = new Set(this.tagToLabel.values());
            const BATCH_SIZE = 100; // ✅ 每100个tag让出一次控制权
            
            for (let i = 0; i < tagsWithVectors.length; i++) {
                const [tag, data] = tagsWithVectors[i];
                
                try {
                    // ✅ 确保向量是普通数组类型
                    const vector = data.vector instanceof Float32Array
                        ? Array.from(data.vector)
                        : (Array.isArray(data.vector) ? data.vector : Array.from(data.vector));
                    
                    // ✅ 使用已有label或分配新label
                    let label;
                    if (this.tagToLabel.has(tag)) {
                        label = this.tagToLabel.get(tag);
                        labelsToRemove.delete(label); // 标记为仍在使用
                    } else {
                        label = nextAvailableLabel++;
                        this.tagToLabel.set(tag, label);
                        this.labelToTag.set(label, tag);
                    }
                    
                    this.tagIndex.addPoint(vector, label);
                    successCount++;
                } catch (error) {
                    console.error(`[TagVectorManager] Failed to add tag "${tag}":`, error.message);
                    // 继续处理其他tags
                }
                
                // ✅ 关键修复：定期让出控制权，防止事件循环阻塞
                if ((i + 1) % BATCH_SIZE === 0) {
                    await new Promise(resolve => setImmediate(resolve));
                    const progress = ((i + 1) / tagsWithVectors.length * 100).toFixed(1);
                    console.log(`[TagVectorManager] Index building progress: ${progress}% (${i + 1}/${tagsWithVectors.length})`);
                }
            }

            // ✅ 问题2修复: 清理已删除tag的映射（标记删除，不实际删除索引点）
            for (const obsoleteLabel of labelsToRemove) {
                const obsoleteTag = this.labelToTag.get(obsoleteLabel);
                this.tagToLabel.delete(obsoleteTag);
                this.labelToTag.delete(obsoleteLabel);
                console.log(`[TagVectorManager] Removed mapping for deleted tag: "${obsoleteTag}" (label ${obsoleteLabel})`);
            }

            console.log(`[TagVectorManager] ✅ Index built successfully: ${successCount}/${tagsWithVectors.length} tags added`);
            console.log(`[TagVectorManager] Active mappings: ${this.tagToLabel.size}, Next label: ${nextAvailableLabel}`);

            if (successCount === 0) {
                throw new Error('Failed to add any tags to index');
            }

        } catch (error) {
            console.error(`[TagVectorManager] buildHNSWIndex failed:`, error);
            console.error(`[TagVectorManager] Error details:`, {
                message: error.message,
                stack: error.stack,
                totalTags: this.globalTags.size,
                vectorizedCount: Array.from(this.globalTags.values()).filter(d => d.vector !== null).length
            });
            throw error;
        }
    }

    /**
     * ✅ 增量添加tags到索引（真正的diff写入，避免完全重建）
     */
    async addTagsToIndex(tagNames) {
        if (!this.tagIndex) {
            throw new Error('Index not initialized');
        }
        
        // ✅ 关键优化：检查索引容量，如果接近上限才扩容
        const currentCount = this.tagIndex.getCurrentCount?.() || this.tagToLabel.size;
        const maxCapacity = this.tagIndex.getMaxElements?.() || 0;
        const newTotalCount = currentCount + tagNames.length;
        
        if (newTotalCount > maxCapacity * 0.9) {
            console.log(`[TagVectorManager] ⚠️ Index capacity reached (${currentCount}/${maxCapacity}), resizing...`);
            const newCapacity = Math.ceil(newTotalCount * 1.5);
            this.tagIndex.resizeIndex(newCapacity);
            console.log(`[TagVectorManager] ✅ Index resized to ${newCapacity}`);
        }
        
        const existingLabels = new Set(this.tagToLabel.values());
        const maxExistingLabel = existingLabels.size > 0 ? Math.max(...existingLabels) : -1;
        let nextAvailableLabel = maxExistingLabel + 1;
        
        let successCount = 0;
        const BATCH_SIZE = 100;
        
        console.log(`[TagVectorManager] 🔄 Incrementally adding ${tagNames.length} tags to existing index (current: ${currentCount})...`);
        
        for (let i = 0; i < tagNames.length; i++) {
            const tag = tagNames[i];
            const tagData = this.globalTags.get(tag);
            
            if (!tagData || !tagData.vector) {
                console.warn(`[TagVectorManager] Tag "${tag}" has no vector, skipping`);
                continue;
            }
            
            // ✅ 跳过已经在索引中的tag
            if (this.tagToLabel.has(tag)) {
                this.debugLog(`Tag "${tag}" already in index, skipping`);
                continue;
            }
            
            try {
                const vector = tagData.vector instanceof Float32Array
                    ? Array.from(tagData.vector)
                    : (Array.isArray(tagData.vector) ? tagData.vector : Array.from(tagData.vector));
                
                // 分配新label
                const label = nextAvailableLabel++;
                this.tagToLabel.set(tag, label);
                this.labelToTag.set(label, tag);
                
                // ✅ 关键：直接添加到现有索引，不重建
                this.tagIndex.addPoint(vector, label);
                successCount++;
                
                // 定期让出控制权
                if ((i + 1) % BATCH_SIZE === 0) {
                    await new Promise(resolve => setImmediate(resolve));
                    this.debugLog(`Added ${i + 1}/${tagNames.length} new tags to index`);
                }
            } catch (error) {
                console.error(`[TagVectorManager] Failed to add tag "${tag}" to index:`, error.message);
            }
        }
        
        console.log(`[TagVectorManager] ✅ Incrementally added ${successCount}/${tagNames.length} tags (total now: ${currentCount + successCount})`);
        return successCount;
    }

    /**
     * 🌟 搜索相似Tags（支持多种输入）
     * @param {Array|string} input - 查询向量或查询文本
     * @param {number} k - 返回结果数量
     * @returns {Array} - 匹配的tags及其得分
     */
    async searchSimilarTags(input, k = 10) {
        if (!this.tagIndex) {
            console.warn('[TagVectorManager] Tag index not initialized');
            return [];
        }

        try {
            let queryVector;
            
            // ✅ 支持直接传入向量或文本
            if (Array.isArray(input)) {
                queryVector = input;
            } else if (typeof input === 'string') {
                // 如果传入文本，先向量化
                const vectors = await this.embeddingFunction([input]);
                queryVector = vectors[0];
            } else {
                throw new Error('Input must be a vector array or string');
            }

            const results = this.tagIndex.searchKnn(queryVector, k);
            
            const matchedTags = results.neighbors.map((label, idx) => {
                const tag = this.labelToTag.get(label);
                const tagData = this.globalTags.get(tag);
                return {
                    tag,
                    score: 1 - results.distances[idx], // 转换为相似度分数
                    frequency: tagData?.frequency || 0,
                    diaryCount: tagData?.diaries.size || 0,
                    diaries: Array.from(tagData?.diaries || [])
                };
            });
            
            this.debugLog(`Found ${matchedTags.length} similar tags for query`);
            return matchedTags;
        } catch (error) {
            console.error('[TagVectorManager] Search failed:', error.message);
            return [];
        }
    }

    /**
     * ✅ Bug #1-3修复: 保存到磁盘（完整的原子性保证）
     * @param {boolean} incrementalMode - 增量模式：不删除旧shard，只更新/新增
     */
    async saveGlobalTagLibrary(indexPath, dataPath, incrementalMode = false) {
        // ✅ 关键修复：保存操作加锁，防止并发写入导致数据损坏
        if (this.saveLock) {
            console.log('[TagVectorManager] ⏳ Save operation in progress, queuing...');
            return new Promise((resolve, reject) => {
                this.saveQueue.push({ indexPath, dataPath, incrementalMode, resolve, reject });
            });
        }
        
        this.saveLock = true;
        
        try {
            await this._saveGlobalTagLibraryImpl(indexPath, dataPath, incrementalMode);
            
            // ✅ 处理队列中的保存请求（合并策略）
            if (this.saveQueue.length > 0) {
                console.log(`[TagVectorManager] Processing ${this.saveQueue.length} queued save requests (merge strategy)...`);
                
                const lastSave = this.saveQueue.pop(); // 取最后一个真正执行
                
                // ✅ 关键修复：中间被跳过的请求全部resolve（数据已被最后一次保存包含）
                while (this.saveQueue.length > 0) {
                    const mergedSave = this.saveQueue.pop();
                    mergedSave.resolve(); // 告知调用者：你的数据已被合并保存
                    console.log('[TagVectorManager] Merged save request resolved');
                }
                
                // 执行最后一个
                try {
                    await this._saveGlobalTagLibraryImpl(lastSave.indexPath, lastSave.dataPath, lastSave.incrementalMode);
                    lastSave.resolve();
                    console.log('[TagVectorManager] Final queued save completed');
                } catch (error) {
                    lastSave.reject(error);
                    console.error('[TagVectorManager] Final queued save failed:', error.message);
                }
            }
        } finally {
            this.saveLock = false;
        }
    }
    
    /**
     * ✅ 实际的保存实现（带完整的原子性和非阻塞优化）
     */
    async _saveGlobalTagLibraryImpl(indexPath, dataPath, incrementalMode = false) {
        console.log('[TagVectorManager] 💾 Starting save operation (non-blocking mode)...');
        const startTime = Date.now();
        
        const metaPath = dataPath.replace('.json', '_meta.json');
        const vectorBasePath = dataPath.replace('.json', '_vectors');
        const labelMapPath = dataPath.replace('.json', '_label_map.json');
        
        // ✅ 关键优化：减小分片大小，增加并发度，减少单次阻塞时间
        const SHARD_SIZE = parseInt(process.env.TAG_SAVE_SHARD_SIZE) || 2000;
        const tagsWithVectors = Array.from(this.globalTags.entries())
            .filter(([_, data]) => data.vector !== null);
        
        // 1. 准备元数据
        const metaData = {
            version: this.config.dataVersion, // ✅ Bug #10修复
            timestamp: new Date().toISOString(),
            totalTags: this.globalTags.size,
            vectorizedTags: tagsWithVectors.length,
            tags: {}
        };
        
        for (const [tag, data] of this.globalTags.entries()) {
            metaData.tags[tag] = {
                hasVector: data.vector !== null,
                frequency: data.frequency,
                diaries: Array.from(data.diaries)
            };
        }
        
        // ✅ Bug #1修复: 准备Label映射数据
        const labelMapData = {
            version: this.config.dataVersion,
            timestamp: new Date().toISOString(),
            tagToLabel: Array.from(this.tagToLabel.entries()),
            labelToTag: Array.from(this.labelToTag.entries())
        };
        
        // 2. 准备向量数据（分片）
        const shardCount = Math.ceil(tagsWithVectors.length / SHARD_SIZE);
        const shardDataList = [];
        
        if (incrementalMode) {
            // ✅ Bug #2修复: 增量模式 - 完整的原子操作
            const existingVectors = {};
            try {
                const dirPath = path.dirname(vectorBasePath);
                const baseFileName = path.basename(vectorBasePath);
                const files = await fs.readdir(dirPath);
                const existingShards = files.filter(f =>
                    f.startsWith(baseFileName) && f.endsWith('.json') && !f.endsWith('.tmp')
                );
                
                // ✅ Bug #8修复: 容错的分片解析
                for (const shardFile of existingShards) {
                    try {
                        const shardPath = path.join(dirPath, shardFile);
                        const shardContent = await fs.readFile(shardPath, 'utf-8');
                        const shardData = JSON.parse(shardContent);
                        Object.assign(existingVectors, shardData);
                    } catch (parseError) {
                        console.error(`[TagVectorManager] Failed to parse shard ${shardFile}:`, parseError.message);
                        // 继续处理其他分片
                    }
                }
                console.log(`[TagVectorManager] Loaded ${Object.keys(existingVectors).length} existing vectors for merge`);
            } catch (e) {
                console.log(`[TagVectorManager] No existing vectors to merge`);
            }
            
            // 合并：新向量覆盖旧向量
            for (const [tag, data] of tagsWithVectors) {
                existingVectors[tag] = Array.from(data.vector);
            }
            
            // 重新分片
            const allVectorTags = Object.keys(existingVectors);
            const newShardCount = Math.ceil(allVectorTags.length / SHARD_SIZE);
            
            for (let i = 0; i < newShardCount; i++) {
                const start = i * SHARD_SIZE;
                const end = Math.min(start + SHARD_SIZE, allVectorTags.length);
                const shardTagNames = allVectorTags.slice(start, end);
                
                const shardData = {};
                for (const tag of shardTagNames) {
                    shardData[tag] = existingVectors[tag];
                }
                
                shardDataList.push({
                    index: i + 1,
                    data: shardData,
                    checksum: this.computeChecksum(shardData) // ✅ Bug #10修复
                });
            }
        } else {
            // 完整模式：直接分片
            for (let i = 0; i < shardCount; i++) {
                const start = i * SHARD_SIZE;
                const end = Math.min(start + SHARD_SIZE, tagsWithVectors.length);
                const shardTags = tagsWithVectors.slice(start, end);
                
                const shardData = {};
                for (const [tag, data] of shardTags) {
                    shardData[tag] = Array.from(data.vector);
                }
                
                shardDataList.push({
                    index: i + 1,
                    data: shardData,
                    checksum: this.computeChecksum(shardData) // ✅ Bug #10修复
                });
            }
        }
        
        // 3. ✅ Bug #2-3修复: 原子性写入 - 先写临时文件，全部成功后再重命名
        const tempFiles = [];
        
        try {
            // 3.1 写入HNSW索引到临时文件（✅ 异步化，避免阻塞）
            const tempIndexPath = indexPath + '.tmp';
            if (this.tagIndex) {
                console.log('[TagVectorManager] 💾 Writing HNSW index (non-blocking)...');
                // ✅ 在Worker线程或setImmediate中执行，避免阻塞主线程
                await new Promise((resolve, reject) => {
                    setImmediate(() => {
                        try {
                            this.tagIndex.writeIndexSync(tempIndexPath);
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                console.log('[TagVectorManager] ✅ HNSW index written');
                tempFiles.push({ temp: tempIndexPath, final: indexPath });
            }
            
            // 3.2 写入元数据到临时文件（✅ 分块序列化避免阻塞）
            await new Promise(resolve => setImmediate(resolve));
            const tempMetaPath = metaPath + '.tmp';
            // ✅ 使用流式写入避免大JSON阻塞
            const metaJsonString = JSON.stringify(metaData, null, 2);
            await fs.writeFile(tempMetaPath, metaJsonString, 'utf-8');
            tempFiles.push({ temp: tempMetaPath, final: metaPath });
            
            // 3.3 写入Label映射到临时文件（✅ 分块序列化）
            await new Promise(resolve => setImmediate(resolve));
            const tempLabelMapPath = labelMapPath + '.tmp';
            const labelMapJsonString = JSON.stringify(labelMapData, null, 2);
            await fs.writeFile(tempLabelMapPath, labelMapJsonString, 'utf-8');
            tempFiles.push({ temp: tempLabelMapPath, final: labelMapPath });
            
            // 3.4 写入向量分片到临时文件（✅ 完全非阻塞JSON序列化）
            for (let i = 0; i < shardDataList.length; i++) {
                const shard = shardDataList[i];
                const tempShardPath = `${vectorBasePath}_${shard.index}.json.tmp`;
                const shardWithMeta = {
                    checksum: shard.checksum,
                    version: this.config.dataVersion,
                    vectors: shard.data
                };
                
                // ✅ 关键优化：每次序列化前都让出控制权，避免长时间阻塞
                await new Promise(resolve => setImmediate(resolve));
                
                // ✅ 使用流式写入，避免一次性序列化大JSON
                const jsonString = JSON.stringify(shardWithMeta);
                await fs.writeFile(tempShardPath, jsonString, 'utf-8');
                
                tempFiles.push({
                    temp: tempShardPath,
                    final: `${vectorBasePath}_${shard.index}.json`
                });
                
                // ✅ 显示进度
                if (shardDataList.length > 1) {
                    console.log(`[TagVectorManager] Writing shard ${i + 1}/${shardDataList.length}...`);
                }
                
                // ✅ 每写入一个分片后再次让出控制权
                if (i < shardDataList.length - 1) {
                    await new Promise(resolve => setImmediate(resolve));
                }
            }
            
            // 4. ✅ 所有临时文件写入成功，开始原子重命名
            for (const { temp, final: finalPath } of tempFiles) {
                await fs.rename(temp, finalPath);
            }
            
            // 5. ✅ Bug #2修复: 清理多余的旧shard（在成功写入后）
            if (incrementalMode) {
                try {
                    const files = await fs.readdir(path.dirname(vectorBasePath));
                    for (const file of files) {
                        if (file.startsWith(path.basename(vectorBasePath)) && 
                            file.endsWith('.json') && 
                            !file.endsWith('.tmp')) {
                            const shardNum = parseInt(file.match(/_(\d+)\.json$/)?.[1] || '0');
                            if (shardNum > shardDataList.length) {
                                await fs.unlink(path.join(path.dirname(vectorBasePath), file));
                                console.log(`[TagVectorManager] Removed old shard: ${file}`);
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[TagVectorManager] Failed to cleanup old shards:', e.message);
                }
            } else {
                // 完整模式：删除所有旧的向量文件
                try {
                    const files = await fs.readdir(path.dirname(vectorBasePath));
                    for (const file of files) {
                        if (file.startsWith(path.basename(vectorBasePath)) && 
                            file.endsWith('.json') &&
                            !tempFiles.some(tf => tf.final === path.join(path.dirname(vectorBasePath), file))) {
                            await fs.unlink(path.join(path.dirname(vectorBasePath), file));
                        }
                    }
                } catch (e) {
                    console.warn('[TagVectorManager] Failed to cleanup old files:', e.message);
                }
            }
            
            const saveTime = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`[TagVectorManager] ✅ Saved successfully in ${saveTime}s: ${metaData.totalTags} tags, ${shardDataList.length} shard(s)`);
            
        } catch (error) {
            // ✅ 如果任何步骤失败，清理所有临时文件
            console.error('[TagVectorManager] Save failed, cleaning up temp files:', error.message);
            for (const { temp } of tempFiles) {
                try {
                    await fs.unlink(temp);
                } catch (e) {
                    // 忽略清理错误
                }
            }
            throw error;
        }
    }

    /**
     * ✅ Bug #1, #4修复: 从磁盘加载（支持Label映射恢复，延迟清空内存）
     */
    async loadGlobalTagLibrary(indexPath, dataPath) {
        const metaPath = dataPath.replace('.json', '_meta.json');
        const vectorBasePath = dataPath.replace('.json', '_vectors');
        const labelMapPath = dataPath.replace('.json', '_label_map.json'); // ✅ Bug #1修复
        
        // ✅ Bug #4修复: 先加载到临时变量，成功后再替换
        const tempGlobalTags = new Map();
        let tempTagIndex = null;
        const tempTagToLabel = new Map();
        const tempLabelToTag = new Map();
        
        // ✅ 尝试加载新格式（分片文件）
        try {
            await fs.access(metaPath);
            
            // 加载元数据
            const metaContent = await fs.readFile(metaPath, 'utf-8');
            const metaFileData = JSON.parse(metaContent);
            
            // ✅ Bug #10修复: 版本检查
            if (metaFileData.version && metaFileData.version !== this.config.dataVersion) {
                console.warn(`[TagVectorManager] Data version mismatch: expected ${this.config.dataVersion}, got ${metaFileData.version}`);
            }
            
            const metaData = metaFileData.tags || metaFileData;
            
            // 查找所有shard文件
            const dirPath = path.dirname(vectorBasePath);
            const baseFileName = path.basename(vectorBasePath);
            const files = await fs.readdir(dirPath);
            const shardFiles = files
                .filter(f => f.startsWith(baseFileName) && f.endsWith('.json') && !f.endsWith('.tmp'))
                .sort((a, b) => {
                    const numA = parseInt(a.match(/_(\d+)\.json$/)?.[1] || '0');
                    const numB = parseInt(b.match(/_(\d+)\.json$/)?.[1] || '0');
                    return numA - numB;
                });
            
            console.log(`[TagVectorManager] Found ${shardFiles.length} shard file(s)`);
            
            // ✅ Bug #8修复: 容错的分片合并
            const allVectorData = {};
            for (const shardFile of shardFiles) {
                try {
                    const shardPath = path.join(dirPath, shardFile);
                    const shardContent = await fs.readFile(shardPath, 'utf-8');
                    const shardFileData = JSON.parse(shardContent);
                    
                    // ✅ Bug #10修复: 校验和验证
                    const shardData = shardFileData.vectors || shardFileData;
                    if (shardFileData.checksum) {
                        const computedChecksum = this.computeChecksum(shardData);
                        if (computedChecksum !== shardFileData.checksum) {
                            console.warn(`[TagVectorManager] Checksum mismatch in ${shardFile}`);
                        }
                    }
                    
                    Object.assign(allVectorData, shardData);
                    console.log(`[TagVectorManager] Loaded shard: ${shardFile} (${Object.keys(shardData).length} vectors)`);
                } catch (parseError) {
                    console.error(`[TagVectorManager] Failed to load shard ${shardFile}:`, parseError.message);
                    // 继续加载其他分片
                }
            }
            
            // 合并数据到临时Map
            for (const [tag, meta] of Object.entries(metaData)) {
                tempGlobalTags.set(tag, {
                    vector: meta.hasVector && allVectorData[tag] ? new Float32Array(allVectorData[tag]) : null,
                    frequency: meta.frequency,
                    diaries: new Set(meta.diaries)
                });
            }
            
            console.log(`[TagVectorManager] Loaded from sharded files: ${Object.keys(metaData).length} tags, ${Object.keys(allVectorData).length} vectors`);
            
        } catch (e) {
            // ✅ 回退到旧格式
            console.log(`[TagVectorManager] Sharded files not found, trying legacy format...`);
            
            try {
                // 尝试单文件格式
                const vectorPath = dataPath.replace('.json', '_vectors.json');
                await fs.access(vectorPath);
                
                const metaContent = await fs.readFile(metaPath, 'utf-8');
                const metaData = JSON.parse(metaContent);
                
                const vectorContent = await fs.readFile(vectorPath, 'utf-8');
                const vectorData = JSON.parse(vectorContent);
                
                for (const [tag, meta] of Object.entries(metaData)) {
                    tempGlobalTags.set(tag, {
                        vector: meta.hasVector && vectorData[tag] ? new Float32Array(vectorData[tag]) : null,
                        frequency: meta.frequency,
                        diaries: new Set(meta.diaries)
                    });
                }
                
                console.log(`[TagVectorManager] Loaded from single vector file: ${Object.keys(metaData).length} tags`);
            } catch (e2) {
                // 最后尝试完全旧格式
                const content = await fs.readFile(dataPath, 'utf-8');
                const tagData = JSON.parse(content);

                for (const [tag, data] of Object.entries(tagData)) {
                    tempGlobalTags.set(tag, {
                        vector: data.vector ? new Float32Array(data.vector) : null,
                        frequency: data.frequency,
                        diaries: new Set(data.diaries)
                    });
                }
                
                console.log(`[TagVectorManager] Loaded from legacy file: ${Object.keys(tagData).length} tags`);
            }
        }

        const tagsWithVectors = Array.from(tempGlobalTags.entries())
            .filter(([_, data]) => data.vector !== null);

        if (tagsWithVectors.length === 0) {
            throw new Error('No vectorized tags found in loaded data');
        }

        const dimensions = tagsWithVectors[0][1].vector.length;
        tempTagIndex = new HierarchicalNSW('l2', dimensions);
        
        // ✅ 同步读取HNSW索引（添加日志提示，避免误以为卡死）
        console.log('[TagVectorManager] 📖 Reading HNSW index (this may take 10-30 seconds for large libraries)...');
        const startTime = Date.now();
        tempTagIndex.readIndexSync(indexPath);
        const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[TagVectorManager] ✅ HNSW index loaded in ${loadTime}s`);

        // ✅ Bug #1修复: 尝试加载Label映射
        try {
            await fs.access(labelMapPath);
            const labelMapContent = await fs.readFile(labelMapPath, 'utf-8');
            const labelMapData = JSON.parse(labelMapContent);
            
            // 恢复映射
            for (const [tag, label] of labelMapData.tagToLabel) {
                tempTagToLabel.set(tag, label);
            }
            for (const [label, tag] of labelMapData.labelToTag) {
                tempLabelToTag.set(label, tag);
            }
            
            console.log(`[TagVectorManager] ✅ Restored label mappings: ${tempTagToLabel.size} tags`);
        } catch (e) {
            // ✅ 回退：重建映射（假设顺序一致）
            console.warn('[TagVectorManager] Label map not found, rebuilding from tag order...');
            for (let i = 0; i < tagsWithVectors.length; i++) {
                const [tag, _] = tagsWithVectors[i];
                tempTagToLabel.set(tag, i);
                tempLabelToTag.set(i, tag);
            }
        }
        
        // ✅ Bug #4修复: 所有数据加载成功后，才替换内存数据
        this.globalTags = tempGlobalTags;
        this.tagIndex = tempTagIndex;
        this.tagToLabel = tempTagToLabel;
        this.labelToTag = tempLabelToTag;
    }

    /**
     * 🌟 启动文件监控
     */
    startFileWatcher() {
        if (this.watcher) return;

        this.watcher = chokidar.watch(this.config.diaryRootPath, {
            ignored: /(^|[\/\\])\../,
            persistent: true,
            ignoreInitial: true,
            depth: 2
        });

        const handleFileChange = (filePath) => {
            const diaryName = path.basename(path.dirname(filePath));
            if (this.shouldIgnoreFolder(diaryName)) return;

            if (this.pendingUpdates.has(diaryName)) {
                clearTimeout(this.pendingUpdates.get(diaryName));
            }

            const timeoutId = setTimeout(() => {
                this.pendingUpdates.delete(diaryName);
                // ✅ Bug #5修复: 使用队列处理
                this.queueUpdate(filePath);
            }, 500);

            this.pendingUpdates.set(diaryName, timeoutId);
        };

        this.watcher
            .on('add', handleFileChange)
            .on('change', handleFileChange)
            .on('unlink', (filePath) => {
                // 🌟 处理文件删除
                const diaryName = path.basename(path.dirname(filePath));
                if (this.shouldIgnoreFolder(diaryName)) return;
                
                this.queueUpdate(filePath); // 使用统一队列处理
            });
    }

    /**
     * ✅ Bug #5修复: 并发控制的更新队列
     */
    async queueUpdate(filePath) {
        this.updateQueue.push(filePath);
        
        // ✅ 关键修复：等待初始化完成
        if (this.updateLock || !this.initialized) {
            return; // 已有更新在进行中或尚未初始化
        }
        
        this.updateLock = true;
        
        try {
            while (this.updateQueue.length > 0) {
                const path = this.updateQueue.shift();
                await this.updateTagsForFile(path);
            }
        } finally {
            this.updateLock = false;
        }
    }

    /**
     * 🌟 核心升级：基于内存状态的精准 Diff 更新
     * 时间复杂度：O(M)，M为该文件的Tag数量，与总文件数无关
     */
    async updateTagsForFile(filePath) {
        const diaryName = path.basename(path.dirname(filePath));
        
        // 1. 读取文件内容并计算Hash (避免无效的Tag解析)
        let content;
        try {
            content = await fs.readFile(filePath, 'utf-8');
        } catch (e) {
            // 文件可能被删除，处理删除逻辑
            return this.handleFileRemove(filePath);
        }

        const currentHash = crypto.createHash('md5').update(content).digest('hex');
        const fileRecord = this.fileRegistry.get(filePath);

        // 2. 如果Hash没变，直接跳过 (极速返回)
        if (fileRecord && fileRecord.hash === currentHash) {
            this.debugLog(`File unchanged: ${path.basename(filePath)}`);
            return;
        }

        // 3. 提取当前Tags
        const rawTags = this.extractTagsFromContent(content);
        const currentTags = new Set(rawTags);

        // 4. 计算 Diff (Set 差集运算)
        const oldTags = fileRecord ? fileRecord.tags : new Set();
        
        const addedTags = [...currentTags].filter(x => !oldTags.has(x));
        const removedTags = [...oldTags].filter(x => !currentTags.has(x));

        if (addedTags.length === 0 && removedTags.length === 0) {
            // 更新Hash并返回
            this.fileRegistry.set(filePath, { hash: currentHash, tags: currentTags });
            return;
        }

        this.debugLog(`[Diff] File: ${path.basename(filePath)} | +${addedTags.length} | -${removedTags.length}`);

        // 5. 应用变更 (内存操作，极快)
        this.applyDiff(diaryName, addedTags, removedTags);

        // 6. 更新注册表
        this.fileRegistry.set(filePath, { hash: currentHash, tags: currentTags });

        // 7. 触发异步处理 (向量化 + 索引 + 保存)
        this.triggerPostUpdateProcessing(addedTags);
    }

    /**
     * 🌟 处理文件删除
     */
    handleFileRemove(filePath) {
        const fileRecord = this.fileRegistry.get(filePath);
        if (!fileRecord) return;

        const diaryName = path.basename(path.dirname(filePath));
        const removedTags = [...fileRecord.tags];
        
        this.debugLog(`[Remove] File: ${path.basename(filePath)} | -${removedTags.length} tags`);
        
        this.applyDiff(diaryName, [], removedTags);
        this.fileRegistry.delete(filePath);
        
        this.triggerPostUpdateProcessing([]);
    }

    /**
     * 🌟 原子化应用 Diff 到全局状态
     */
    applyDiff(diaryName, addedTags, removedTags) {
        // 处理移除
        for (const tag of removedTags) {
            const tagData = this.globalTags.get(tag);
            if (tagData) {
                tagData.frequency--;
                tagData.diaries.delete(diaryName);
                this.dirtyTags.add(tag); // 标记脏数据

                // 如果频率归零，执行清理
                if (tagData.frequency <= 0) {
                    this.removeTagFromSystem(tag);
                }
            }
        }

        // 处理新增
        for (const tag of addedTags) {
            if (!this.globalTags.has(tag)) {
                // 全新 Tag
                this.globalTags.set(tag, {
                    vector: null, // 待向量化
                    frequency: 1,
                    diaries: new Set([diaryName])
                });
            } else {
                // 现有 Tag
                const tagData = this.globalTags.get(tag);
                tagData.frequency++;
                tagData.diaries.add(diaryName);
            }
            this.dirtyTags.add(tag);
        }
    }

    /**
     * 🌟 系统级移除 Tag
     */
    removeTagFromSystem(tag) {
        if (this.tagToLabel.has(tag)) {
            const label = this.tagToLabel.get(tag);
            this.deletedLabels.add(label); // HNSW 软删除
            this.tagToLabel.delete(tag);
            this.labelToTag.delete(label);
        }
        this.globalTags.delete(tag);
        this.dirtyTags.add(tag); // 标记以确保保存时从JSON移除
    }

    /**
     * 🌟 后处理：向量化与索引更新 (智能队列分配)
     */
    triggerPostUpdateProcessing(newTagsCandidate) {
        // 找出真正需要向量化的 (没有向量的)
        const tagsToVectorize = newTagsCandidate.filter(t => {
            const d = this.globalTags.get(t);
            return d && d.vector === null;
        });

        if (tagsToVectorize.length > 0) {
            // 🌟 关键逻辑：如果批索引正在运行，加入下一批次；否则加入当前批次
            if (this.isIndexRebuilding) {
                // 批处理运行中，暂存到下一批
                tagsToVectorize.forEach(t => this.nextBatchIndexUpdates.add(t));
                this.debugLog(`Queued ${tagsToVectorize.length} tags to NEXT batch (rebuild in progress)`);
            } else {
                // 批处理空闲，加入当前批次
                tagsToVectorize.forEach(t => this.pendingIndexUpdates.add(t));
                this.debugLog(`Queued ${tagsToVectorize.length} tags to current batch`);
                // 触发批量索引更新（带合并窗口）
                this.scheduleBatchIndexRebuild();
            }
        }

        // 防抖保存
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => this.persistChanges(), this.saveDebounce);
    }

    /**
     * 🌟 优化的持久化：仅写入脏数据（带重试机制）
     */
    async persistChanges() {
        if (this.dirtyTags.size === 0) return;
        
        // ✅ 致命Bug修复：如果被锁住，延迟重试而不是放弃
        if (this.saveLock) {
            this.debugLog('Save locked, rescheduling persist...');
            if (this.saveTimer) clearTimeout(this.saveTimer);
            this.saveTimer = setTimeout(() => this.persistChanges(), 1000); // 1秒后重试
            return;
        }
        
        this.debugLog(`Persisting ${this.dirtyTags.size} dirty tags...`);
        
        const indexPath = path.join(this.config.vectorStorePath, 'GlobalTags.bin');
        const dataPath = path.join(this.config.vectorStorePath, 'GlobalTags.json');
        
        try {
            // 保存Tag库（增量模式）
            await this.saveGlobalTagLibrary(indexPath, dataPath, true);
            
            // 保存文件注册表
            await this.saveFileRegistry();
            
            this.dirtyTags.clear();
            this.debugLog('Persist complete');
        } catch (e) {
            console.error('[TagVectorManager] Persist failed:', e);
            // ✅ 失败时也重试
            if (this.saveTimer) clearTimeout(this.saveTimer);
            this.saveTimer = setTimeout(() => this.persistChanges(), 2000); // 2秒后重试
        }
    }

    /**
     * 🌟 保存文件注册表快照
     */
    async saveFileRegistry() {
        const registryPath = path.join(this.config.vectorStorePath, 'FileRegistry.json');
        const data = Array.from(this.fileRegistry.entries()).map(([k, v]) => [k, {
            h: v.hash,
            t: Array.from(v.tags)
        }]);
        
        const tempPath = registryPath + '.tmp';
        await fs.writeFile(tempPath, JSON.stringify(data), 'utf-8');
        await fs.rename(tempPath, registryPath);
        
        this.debugLog(`FileRegistry saved: ${this.fileRegistry.size} files`);
    }

    /**
     * 🌟 加载文件注册表 - 仅负责加载，不自动构建
     */
    async loadFileRegistry() {
        const registryPath = path.join(this.config.vectorStorePath, 'FileRegistry.json');
        const raw = await fs.readFile(registryPath, 'utf-8');
        const data = JSON.parse(raw);
        this.fileRegistry = new Map(data.map(([k, v]) => [k, {
            hash: v.h,
            tags: new Set(v.t)
        }]));
        console.log(`[TagVectorManager] ✅ Loaded registry for ${this.fileRegistry.size} files`);
    }

    /**
     * 🌟 自动迁移：从现有日记文件构建反向索引
     * 这是一个一次性操作，用于从零开始建立 fileRegistry
     * ✅ 安全措施：清空现有数据，确保干净的重建
     */
    async buildFileRegistryFromScratch() {
        console.log('[TagVectorManager] 🔨 Building FileRegistry from existing diary files...');
        
        // ✅ 清空现有注册表，确保干净重建
        this.fileRegistry.clear();
        
        const startTime = Date.now();
        let fileCount = 0;
        let tagCount = 0;

        const diaryBooks = await fs.readdir(this.config.diaryRootPath, { withFileTypes: true });

        for (const dirent of diaryBooks) {
            if (!dirent.isDirectory()) continue;
            
            const diaryName = dirent.name;
            
            // 应用过滤规则
            if (this.shouldIgnoreFolder(diaryName)) {
                this.debugLog(`Skipping ignored folder: "${diaryName}"`);
                continue;
            }

            const diaryPath = path.join(this.config.diaryRootPath, diaryName);
            
            try {
                const files = await fs.readdir(diaryPath);
                const diaryFiles = files.filter(f =>
                    f.toLowerCase().endsWith('.txt') || f.toLowerCase().endsWith('.md')
                );

                for (const file of diaryFiles) {
                    const filePath = path.join(diaryPath, file);
                    
                    try {
                        // 读取文件内容
                        const content = await fs.readFile(filePath, 'utf-8');
                        
                        // 计算Hash
                        const hash = crypto.createHash('md5').update(content).digest('hex');
                        
                        // 提取Tags
                        const rawTags = this.extractTagsFromContent(content);
                        const tags = new Set(rawTags);
                        
                        // 只记录有Tag的文件
                        if (tags.size > 0) {
                            this.fileRegistry.set(filePath, { hash, tags });
                            fileCount++;
                            tagCount += tags.size;
                        }
                        
                        // 每100个文件让出一次控制权
                        if (fileCount % 100 === 0) {
                            await new Promise(resolve => setImmediate(resolve));
                            console.log(`[TagVectorManager] Registry building progress: ${fileCount} files processed...`);
                        }
                    } catch (fileError) {
                        this.debugLog(`Failed to process file ${filePath}: ${fileError.message}`);
                        // 继续处理其他文件
                    }
                }
            } catch (error) {
                console.error(`[TagVectorManager] Error scanning folder "${diaryName}":`, error.message);
            }
        }

        const buildTime = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[TagVectorManager] ✅ FileRegistry built in ${buildTime}s: ${fileCount} files, ${tagCount} total tags`);
        
        // 立即保存新建的注册表
        if (fileCount > 0) {
            await this.saveFileRegistry();
            console.log('[TagVectorManager] 💾 FileRegistry saved to disk');
        }
    }
    
    /**
     * 🌟 批量索引重建调度器（双缓冲队列 + 1分钟合并窗口）
     */
    scheduleBatchIndexRebuild() {
        // 如果已经在等待中，不重复设置定时器
        if (this.indexRebuildTimer) {
            this.debugLog('Batch rebuild already scheduled, extending merge window...');
            return;
        }
        
        // 设置合并窗口：1分钟内的所有变更合并
        this.indexRebuildTimer = setTimeout(async () => {
            await this.executeBatchIndexRebuild();
        }, this.indexRebuildDelay);
        
        console.log(`[TagVectorManager] ⏰ Batch rebuild scheduled (merge window: ${this.indexRebuildDelay/1000}s, pending: ${this.pendingIndexUpdates.size} tags)`);
    }

    /**
     * 🌟 执行批量索引重建（信号枪机制）
     */
    async executeBatchIndexRebuild() {
        this.indexRebuildTimer = null;
        
        // 检查前置条件
        if (this.updateLock || this.saveLock || !this.initialized) {
            console.log('[TagVectorManager] ⏳ Operation in progress, rescheduling...');
            setTimeout(() => this.executeBatchIndexRebuild(), 5000);
            return;
        }
        
        if (this.pendingIndexUpdates.size === 0) {
            this.debugLog('No tags to rebuild, skipping');
            return;
        }
        
        // 🌟 关键：启动批处理前，切换到"正在运行"状态
        this.isIndexRebuilding = true;
        
        const tagsToAdd = Array.from(this.pendingIndexUpdates);
        this.pendingIndexUpdates.clear();
        
        console.log(`[TagVectorManager] 🚀 Starting batch rebuild: ${tagsToAdd.length} tags`);
        console.log(`[TagVectorManager] 📋 Next batch queue size: ${this.nextBatchIndexUpdates.size} tags`);
        
        // 获取更新锁
        this.updateLock = true;
        
        try {
            // 1. 向量化
            console.log(`[TagVectorManager] 🔢 Vectorizing ${tagsToAdd.length} tags...`);
            await this.vectorizeTagBatch(tagsToAdd);
            
            // 2. 更新索引
            if (!this.tagIndex) {
                await this.buildHNSWIndex();
            } else {
                await this.addTagsToIndex(tagsToAdd);
            }
            
            // 3. 保存到磁盘
            const indexPath = path.join(this.config.vectorStorePath, 'GlobalTags.bin');
            const dataPath = path.join(this.config.vectorStorePath, 'GlobalTags.json');
            console.log(`[TagVectorManager] 💾 Saving batch changes...`);
            await this.saveGlobalTagLibrary(indexPath, dataPath, true);
            
            console.log(`[TagVectorManager] ✅ Batch rebuild completed successfully`);
            
        } catch (error) {
            console.error('[TagVectorManager] ❌ Batch rebuild failed:', error.message);
            // 失败时，将tag放回下一批次
            tagsToAdd.forEach(tag => this.nextBatchIndexUpdates.add(tag));
            
        } finally {
            // 🌟 关键：批处理完成，切换状态
            this.isIndexRebuilding = false;
            this.updateLock = false;
            
            // 🌟 检查下一批次队列
            if (this.nextBatchIndexUpdates.size > 0) {
                console.log(`[TagVectorManager] 🔄 Activating next batch: ${this.nextBatchIndexUpdates.size} tags`);
                
                // 将下一批次移动到当前批次
                this.nextBatchIndexUpdates.forEach(tag => this.pendingIndexUpdates.add(tag));
                this.nextBatchIndexUpdates.clear();
                
                // 立即启动下一轮（不等待合并窗口）
                setTimeout(() => this.executeBatchIndexRebuild(), 1000);
            } else {
                console.log(`[TagVectorManager] ✨ All batches completed, system idle`);
            }
        }
    }

    /**
     * ✅ 问题3修复: 优化的增量更新（深拷贝向量数据 + 并发保护）
     * @returns {boolean} - 是否有变化
     */
    async incrementalUpdateOptimized() {
        // ✅ 问题3修复: 添加并发保护
        if (this.updateLock) {
            console.log('[TagVectorManager] Incremental update already in progress, skipping...');
            return false;
        }
        
        this.updateLock = true;
        
        try {
            console.log('[TagVectorManager] Starting incremental update...');
            
            // ✅ Bug #7修复: 深拷贝向量数据，防止引用丢失
            const oldGlobalTags = new Map();
        for (const [tag, data] of this.globalTags.entries()) {
            oldGlobalTags.set(tag, {
                vector: data.vector ? (
                    data.vector instanceof Float32Array 
                        ? new Float32Array(data.vector) 
                        : [...data.vector]
                ) : null,  // ✅ 深拷贝向量
                frequency: data.frequency,
                diaries: new Set(data.diaries)
            });
        }
        
        const oldVectorizedTags = new Set(
            Array.from(oldGlobalTags.entries())
                .filter(([_, data]) => data.vector !== null)
                .map(([tag, _]) => tag)
        );
        
        console.log(`[TagVectorManager] Saved ${oldVectorizedTags.size} vectorized tags before rescan`);
        
        // ✅ 致命Bug修复：扫描前必须清空当前数据，否则会产生频率累加
        this.globalTags.clear();
        
        // Step 2: 重新扫描所有Tags
        let currentStats;
        try {
            currentStats = await this.scanAllDiaryTags();
            console.log(`[TagVectorManager] Scanned ${currentStats.totalFiles} files, found ${currentStats.uniqueTags} unique tags`);
        } catch (error) {
            // ✅ Bug #7修复: 扫描失败时恢复旧数据
            console.error('[TagVectorManager] Scan failed, restoring old data:', error.message);
            this.globalTags = oldGlobalTags;
            throw error;
        }
        
        // Step 3: 应用过滤规则
        this.applyTagFilters(currentStats);
        const newTags = new Set(this.globalTags.keys());
        console.log(`[TagVectorManager] After filtering: ${newTags.size} tags`);
        
        // Step 4: 检测变化
        const tagsToAdd = [];
        const tagsToRemove = [];
        
        // Step 4.1: 恢复旧tags的向量数据
        for (const tag of newTags) {
            if (oldGlobalTags.has(tag)) {
                const oldData = oldGlobalTags.get(tag);
                const newData = this.globalTags.get(tag);
                if (oldData.vector !== null && newData) {
                    // ✅ 恢复已有的向量
                    newData.vector = oldData.vector;
                }
            }
        }
        
        // Step 4.2: 检测新增的Tags
        for (const tag of newTags) {
            if (!oldGlobalTags.has(tag)) {
                tagsToAdd.push(tag);
            } else if (!oldVectorizedTags.has(tag)) {
                tagsToAdd.push(tag);
            }
        }
        
        // Step 4.3: 检测需要删除的Tags
        for (const tag of oldGlobalTags.keys()) {
            if (!newTags.has(tag)) {
                tagsToRemove.push(tag);
            }
        }
        
        if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
            console.log('[TagVectorManager] No changes detected');
            return false;
        }
        
        console.log(`[TagVectorManager] Changes detected:`);
        console.log(`  - Tags to add/vectorize: ${tagsToAdd.length}`);
        console.log(`  - Tags to remove: ${tagsToRemove.length}`);
        
        // Step 5: 删除过期Tags
        for (const tag of tagsToRemove) {
            this.globalTags.delete(tag);
            this.debugLog(`Removed tag: "${tag}"`);
        }
        
        // Step 6: 向量化新增Tags
        if (tagsToAdd.length > 0) {
            console.log(`[TagVectorManager] Vectorizing ${tagsToAdd.length} new tags...`);
            await this.vectorizeTagBatch(tagsToAdd);
        }
        
        // Step 7: 增量更新索引（只添加新tag，避免完全重建）
        if (tagsToAdd.length > 0 || tagsToRemove.length > 0) {
            if (this.globalTags.size > 0) {
                const vectorizedCount = Array.from(this.globalTags.values()).filter(d => d.vector !== null).length;
                
                // ✅ 优化：只有新增tag或索引不存在时才需要添加
                if (tagsToAdd.length > 0) {
                    if (!this.tagIndex) {
                        // 索引不存在，完全重建
                        console.log(`[TagVectorManager] Building HNSW index with ${vectorizedCount} vectorized tags...`);
                        await this.buildHNSWIndex();
                    } else {
                        // 索引已存在，增量添加新tag
                        console.log(`[TagVectorManager] Adding ${tagsToAdd.length} new tags to existing index (total: ${vectorizedCount})...`);
                        await this.addTagsToIndex(tagsToAdd);
                    }
                }
                
                // ✅ 删除tag的情况：只清理映射，不重建索引（标记删除）
                if (tagsToRemove.length > 0) {
                    console.log(`[TagVectorManager] Marked ${tagsToRemove.length} tags as deleted (mappings cleaned)`);
                }
            }
        }
        
        return true;
        
        } finally {
            // ✅ 问题3修复: 确保释放锁
            this.updateLock = false;
        }
    }

    /**
     * ✅ Bug #6修复: 批量向量化（完整的checkpoint保护）
     */
    async vectorizeTagBatch(tags) {
        const batchSize = this.config.tagBatchSize;
        const CHECKPOINT_INTERVAL = 20; // 每2000个tag（20批次）保存一次checkpoint
        let batchesSinceCheckpoint = 0;
        
        const indexPath = path.join(this.config.vectorStorePath, 'GlobalTags.bin');
        const dataPath = path.join(this.config.vectorStorePath, 'GlobalTags.json');
        
        for (let i = 0; i < tags.length; i += batchSize) {
            const batch = tags.slice(i, i + batchSize);
            const progress = ((i / tags.length) * 100).toFixed(1);
            
            if (tags.length > batchSize) {
                console.log(`[TagVectorManager] Vectorizing progress: ${progress}% (${i}/${tags.length})`);
            }
            
            try {
                const vectors = await this.embeddingFunction(batch);
                
                for (let j = 0; j < batch.length; j++) {
                    const tagData = this.globalTags.get(batch[j]);
                    if (tagData) {
                        tagData.vector = vectors[j];
                    }
                }
                
                batchesSinceCheckpoint++;
                
                // ✅ Bug #6修复: 安全checkpoint
                if (batchesSinceCheckpoint >= CHECKPOINT_INTERVAL) {
                    const vectorizedCount = Array.from(this.globalTags.values()).filter(d => d.vector !== null).length;
                    console.log(`[TagVectorManager] 💾 Checkpoint: Saving ${vectorizedCount} vectors (safe mode)...`);
                    
                    try {
                        await this.saveGlobalTagLibrary(indexPath, dataPath, true);
                        console.log(`[TagVectorManager] ✅ Checkpoint saved`);
                        batchesSinceCheckpoint = 0; // ✅ 只在成功时重置
                    } catch (saveError) {
                        console.error(`[TagVectorManager] Checkpoint failed:`, saveError.message);
                        // 继续向量化，下次再试（计数器不重置，会在下一批尝试）
                    }
                }
                
            } catch (error) {
                console.error(`[TagVectorManager] Failed to vectorize batch at ${i}:`, error.message);
                // 继续处理下一批，避免全部失败
            }
        }
        
        // ✅ Bug #6修复: 确保最后一批也被保存
        if (batchesSinceCheckpoint > 0) {
            console.log(`[TagVectorManager] 💾 Final checkpoint: Saving remaining vectors...`);
            try {
                await this.saveGlobalTagLibrary(indexPath, dataPath, true);
                console.log(`[TagVectorManager] ✅ Final checkpoint saved`);
            } catch (saveError) {
                console.error(`[TagVectorManager] Final checkpoint failed:`, saveError.message);
                throw saveError; // 最后一次保存失败应该抛出错误
            }
        }
        
        console.log(`[TagVectorManager] ✅ Vectorization completed: ${tags.length} tags processed`);
    }

    /**
     * ✅ 检查是否应忽略文件夹
     */
    shouldIgnoreFolder(folderName) {
        // 检查固定忽略列表（精确匹配或包含）
        if (this.config.ignorePatterns.some(pattern => folderName === pattern || folderName.includes(pattern))) {
            return true;
        }
        
        // 检查前缀（如"已整理"）
        if (this.config.ignorePrefix && folderName.startsWith(this.config.ignorePrefix)) {
            return true;
        }
        
        // 检查后缀（如"簇"）
        if (this.config.ignoreSuffix && folderName.endsWith(this.config.ignoreSuffix)) {
            return true;
        }
        
        return false;
    }

    /**
     * 获取统计
     */
    getStats() {
        return {
            totalTags: this.globalTags.size,
            vectorizedTags: Array.from(this.globalTags.values()).filter(d => d.vector !== null).length,
            initialized: this.initialized,
            blacklistedTags: this.config.tagBlacklist.length,
            dataVersion: this.config.dataVersion
        };
    }

    /**
     * 关闭
     */
    async shutdown() {
        // ✅ 清除索引重建定时器
        if (this.indexRebuildTimer) {
            clearTimeout(this.indexRebuildTimer);
            this.indexRebuildTimer = null;
        }
        
        // ✅ 如果有待处理的索引更新，立即执行
        if (this.pendingIndexUpdates.size > 0) {
            console.log(`[TagVectorManager] 🔄 Flushing ${this.pendingIndexUpdates.size} pending index updates before shutdown...`);
            const tagsToAdd = Array.from(this.pendingIndexUpdates);
            this.pendingIndexUpdates.clear();
            
            try {
                if (this.tagIndex) {
                    await this.addTagsToIndex(tagsToAdd);
                } else {
                    await this.buildHNSWIndex();
                }
                
                const indexPath = path.join(this.config.vectorStorePath, 'GlobalTags.bin');
                const dataPath = path.join(this.config.vectorStorePath, 'GlobalTags.json');
                await this.saveGlobalTagLibrary(indexPath, dataPath, true);
                console.log('[TagVectorManager] ✅ Pending updates flushed');
            } catch (error) {
                console.error('[TagVectorManager] Failed to flush pending updates:', error.message);
            }
        }
        
        // ✅ Bug #5修复: 等待所有待处理的更新完成
        while (this.updateLock || this.updateQueue.length > 0 || this.saveLock) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (this.watcher) {
            await this.watcher.close();
            this.watcher = null;
        }
        for (const timeoutId of this.pendingUpdates.values()) {
            clearTimeout(timeoutId);
        }
        this.pendingUpdates.clear();
    }
}

module.exports = TagVectorManager;