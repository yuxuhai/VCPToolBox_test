// TagVectorManager.js
// 🌟 全局Tag向量管理器 - 独立模块，零侵入性设计

const fs = require('fs').promises;
const path = require('path');
const { HierarchicalNSW } = require('hnswlib-node');
const chokidar = require('chokidar');

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
            ...config
        };

        // Tag数据结构
        this.globalTags = new Map(); // tag_text → { vector, frequency, diaries: Set }
        this.tagIndex = null; // HNSW索引
        this.tagToLabel = new Map(); // tag_text → label
        this.labelToTag = new Map(); // label → tag_text

        // 文件监控
        this.watcher = null;
        this.pendingUpdates = new Map();

        // 状态
        this.initialized = false;
        this.isBuilding = false;

        console.log('[TagVectorManager] Initialized with batch size:', this.config.tagBatchSize);
    }

    debugLog(message, ...args) {
        if (this.config.debug) {
            console.log(`[TagVectorManager][DEBUG] ${message}`, ...args);
        }
    }

    /**
     * 🌟 初始化
     */
    async initialize(embeddingFunction) {
        if (this.initialized) return;

        console.log('[TagVectorManager] Initializing...');
        this.embeddingFunction = embeddingFunction;

        await fs.mkdir(this.config.vectorStorePath, { recursive: true });

        const tagIndexPath = path.join(this.config.vectorStorePath, 'GlobalTags.bin');
        const tagDataPath = path.join(this.config.vectorStorePath, 'GlobalTags.json');

        let libraryExists = false;
        try {
            await this.loadGlobalTagLibrary(tagIndexPath, tagDataPath);
            console.log('[TagVectorManager] ✅ Loaded existing library');
            libraryExists = true;
        } catch (e) {
            console.log('[TagVectorManager] No existing library found, building from scratch...');
            await this.buildGlobalTagLibrary();
            await this.saveGlobalTagLibrary(tagIndexPath, tagDataPath);
        }

        // ✅ 关键修复：即使库存在，也要检查是否有新增Tag
        if (libraryExists) {
            console.log('[TagVectorManager] 🔍 Checking for new tags...');
            const hasNewTags = await this.incrementalUpdate();
            if (hasNewTags) {
                await this.saveGlobalTagLibrary(tagIndexPath, tagDataPath);
                console.log('[TagVectorManager] ✅ Incremental update completed');
            } else {
                console.log('[TagVectorManager] No new tags detected');
            }
        }

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
            this.buildHNSWIndex();

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
     * 构建HNSW索引
     */
    buildHNSWIndex() {
        const tagsWithVectors = Array.from(this.globalTags.entries())
            .filter(([_, data]) => data.vector !== null);

        if (tagsWithVectors.length === 0) {
            throw new Error('No vectorized tags');
        }

        const dimensions = tagsWithVectors[0][1].vector.length;
        this.tagIndex = new HierarchicalNSW('l2', dimensions);
        this.tagIndex.initIndex(tagsWithVectors.length);

        this.tagToLabel.clear();
        this.labelToTag.clear();

        for (let i = 0; i < tagsWithVectors.length; i++) {
            const [tag, data] = tagsWithVectors[i];
            this.tagIndex.addPoint(data.vector, i);
            this.tagToLabel.set(tag, i);
            this.labelToTag.set(i, tag);
        }
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
     * 保存到磁盘
     */
    async saveGlobalTagLibrary(indexPath, dataPath) {
        if (this.tagIndex) {
            await this.tagIndex.writeIndex(indexPath);
        }

        const tagData = {};
        for (const [tag, data] of this.globalTags.entries()) {
            tagData[tag] = {
                vector: data.vector ? Array.from(data.vector) : null,
                frequency: data.frequency,
                diaries: Array.from(data.diaries)
            };
        }

        await fs.writeFile(dataPath, JSON.stringify(tagData, null, 2), 'utf-8');
    }

    /**
     * 从磁盘加载
     */
    async loadGlobalTagLibrary(indexPath, dataPath) {
        const content = await fs.readFile(dataPath, 'utf-8');
        const tagData = JSON.parse(content);

        this.globalTags.clear();
        for (const [tag, data] of Object.entries(tagData)) {
            this.globalTags.set(tag, {
                vector: data.vector ? new Float32Array(data.vector) : null,
                frequency: data.frequency,
                diaries: new Set(data.diaries)
            });
        }

        const tagsWithVectors = Array.from(this.globalTags.entries())
            .filter(([_, data]) => data.vector !== null);

        const dimensions = tagsWithVectors[0][1].vector.length;
        this.tagIndex = new HierarchicalNSW('l2', dimensions);
        this.tagIndex.readIndexSync(indexPath);

        this.tagToLabel.clear();
        this.labelToTag.clear();

        for (let i = 0; i < tagsWithVectors.length; i++) {
            const [tag, _] = tagsWithVectors[i];
            this.tagToLabel.set(tag, i);
            this.labelToTag.set(i, tag);
        }
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
                this.updateTagsForFile(filePath).catch(console.error);
            }, 500);

            this.pendingUpdates.set(diaryName, timeoutId);
        };

        this.watcher.on('add', handleFileChange).on('change', handleFileChange);
    }

    /**
     * 增量更新单个文件
     */
    async updateTagsForFile(filePath) {
        const diaryName = path.basename(path.dirname(filePath));
        const newTags = await this.extractTagsFromFile(filePath);
        if (newTags.length === 0) return;

        const tagsToVectorize = newTags.filter(tag => 
            !this.globalTags.has(tag) || this.globalTags.get(tag).vector === null
        );

        if (tagsToVectorize.length > 0) {
            const vectors = await this.embeddingFunction(tagsToVectorize);

            for (let i = 0; i < tagsToVectorize.length; i++) {
                const tag = tagsToVectorize[i];
                if (!this.globalTags.has(tag)) {
                    this.globalTags.set(tag, {
                        vector: vectors[i],
                        frequency: 1,
                        diaries: new Set([diaryName])
                    });
                } else {
                    const tagData = this.globalTags.get(tag);
                    tagData.vector = vectors[i];
                    tagData.frequency++;
                    tagData.diaries.add(diaryName);
                }
            }

            this.buildHNSWIndex();
            
            const indexPath = path.join(this.config.vectorStorePath, 'GlobalTags.bin');
            const dataPath = path.join(this.config.vectorStorePath, 'GlobalTags.json');
            await this.saveGlobalTagLibrary(indexPath, dataPath);
        }
    }

    /**
     * 🌟 增量更新：检测新增/删除/黑名单变动
     * @returns {boolean} - 是否有变化
     */
    async incrementalUpdate() {
        console.log('[TagVectorManager] Starting incremental update...');
        
        // Step 1: 保存旧的tags（已向量化的）
        const oldTags = new Set(this.globalTags.keys());
        const oldVectorizedTags = new Set(
            Array.from(this.globalTags.entries())
                .filter(([_, data]) => data.vector !== null)
                .map(([tag, _]) => tag)
        );
        
        // Step 2: 重新扫描所有Tags
        const currentStats = await this.scanAllDiaryTags();
        console.log(`[TagVectorManager] Scanned ${currentStats.totalFiles} files, found ${currentStats.uniqueTags} unique tags`);
        
        // Step 3: 应用过滤规则（包括黑名单）
        this.applyTagFilters(currentStats);
        const newTags = new Set(this.globalTags.keys());
        console.log(`[TagVectorManager] After filtering: ${newTags.size} tags`);
        
        // Step 4: 检测变化
        const tagsToAdd = [];
        const tagsToRemove = [];
        
        // 检测新增的Tags（在新扫描中出现，但在旧tags中不存在）
        for (const tag of newTags) {
            if (!oldTags.has(tag)) {
                tagsToAdd.push(tag);
            } else if (!oldVectorizedTags.has(tag)) {
                // 旧tag存在但未向量化，也需要向量化
                tagsToAdd.push(tag);
            }
        }
        
        // 检测需要删除的Tags（在旧tags中存在，但新扫描中不存在）
        for (const tag of oldTags) {
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
        
        // Step 7: 重建索引
        if (this.globalTags.size > 0) {
            const vectorizedCount = Array.from(this.globalTags.values()).filter(d => d.vector !== null).length;
            console.log(`[TagVectorManager] Rebuilding HNSW index with ${vectorizedCount} vectorized tags...`);
            this.buildHNSWIndex();
        }
        
        return true;
    }

    /**
     * 批量向量化指定的Tags（带进度显示）
     */
    async vectorizeTagBatch(tags) {
        const batchSize = this.config.tagBatchSize;
        
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
            } catch (error) {
                console.error(`[TagVectorManager] Failed to vectorize batch:`, error.message);
                // 继续处理下一批，避免全部失败
            }
        }
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
            blacklistedTags: this.config.tagBlacklist.length
        };
    }

    /**
     * 关闭
     */
    async shutdown() {
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