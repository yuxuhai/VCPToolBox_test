// 🔧 Tag 索引 Worker 线程实现
// 在后台线程处理 HNSW 索引的重IO操作

const { parentPort } = require('worker_threads');
const { HierarchicalNSW } = require('hnswlib-node');
const fs = require('fs').promises;

class IndexWorkerCore {
    constructor() {
        this.tagIndex = null;
        this.tagToLabel = new Map();
        this.labelToTag = new Map();
        this.dimensions = 0;
    }
    
    /**
     * 📖 加载索引
     */
    async loadIndex(indexPath, dataPath) {
        const start = Date.now();
        
        try {
            // 加载映射数据
            const labelMapPath = dataPath.replace('.json', '_label_map.json');
            const labelMapContent = await fs.readFile(labelMapPath, 'utf-8');
            const labelMapData = JSON.parse(labelMapContent);
            
            this.tagToLabel = new Map(labelMapData.tagToLabel);
            this.labelToTag = new Map(labelMapData.labelToTag);
            
            // 加载元数据获取维度
            const metaPath = dataPath.replace('.json', '_meta.json');
            const metaContent = await fs.readFile(metaPath, 'utf-8');
            const metaData = JSON.parse(metaContent);
            
            // 获取第一个向量的维度
            const vectorBasePath = dataPath.replace('.json', '_vectors');
            const dirPath = require('path').dirname(vectorBasePath);
            const baseFileName = require('path').basename(vectorBasePath);
            const files = await fs.readdir(dirPath);
            const shardFiles = files.filter(f => 
                f.startsWith(baseFileName) && f.endsWith('.json') && !f.endsWith('.tmp')
            );
            
            if (shardFiles.length === 0) {
                throw new Error('No vector shards found');
            }
            
            // 读取第一个分片获取维度
            const firstShardPath = require('path').join(dirPath, shardFiles[0]);
            const firstShardContent = await fs.readFile(firstShardPath, 'utf-8');
            const firstShardData = JSON.parse(firstShardContent);
            const vectors = firstShardData.vectors || firstShardData;
            const firstVector = Object.values(vectors)[0];
            this.dimensions = firstVector.length;
            
            // 🌟 异步加载 HNSW 索引（这里会阻塞 Worker 线程，但不阻塞主线程）
            this.tagIndex = new HierarchicalNSW('l2', this.dimensions);
            this.tagIndex.readIndexSync(indexPath);
            
            const loadTime = Date.now() - start;
            
            return {
                success: true,
                message: `Loaded ${this.tagToLabel.size} tags`,
                elementCount: this.tagToLabel.size,
                dimensions: this.dimensions,
                loadTime
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message,
                elementCount: 0,
                dimensions: 0,
                loadTime: Date.now() - start
            };
        }
    }
    
    /**
     * 💾 保存索引
     */
    async saveIndex(indexPath, dataPath) {
        const start = Date.now();
        
        try {
            if (!this.tagIndex) {
                throw new Error('Index not initialized');
            }
            
            // 🌟 异步保存 HNSW 索引（阻塞 Worker 线程）
            this.tagIndex.writeIndexSync(indexPath);
            
            // 保存映射数据
            const labelMapPath = dataPath.replace('.json', '_label_map.json');
            const labelMapData = {
                version: '2.0.0',
                timestamp: new Date().toISOString(),
                tagToLabel: Array.from(this.tagToLabel.entries()),
                labelToTag: Array.from(this.labelToTag.entries())
            };
            
            await fs.writeFile(
                labelMapPath + '.tmp',
                JSON.stringify(labelMapData, null, 2),
                'utf-8'
            );
            await fs.rename(labelMapPath + '.tmp', labelMapPath);
            
            const saveTime = Date.now() - start;
            
            return {
                success: true,
                message: `Saved ${this.tagToLabel.size} tags`,
                elementCount: this.tagToLabel.size,
                saveTime
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message,
                elementCount: 0,
                saveTime: Date.now() - start
            };
        }
    }
    
    /**
     * ➕ 批量添加向量
     */
    async addVectors({ tagNames, vectors, labels }) {
        const start = Date.now();
        
        try {
            if (!this.tagIndex) {
                throw new Error('Index not initialized');
            }
            
            let added = 0;
            const BATCH_SIZE = 100;
            
            for (let i = 0; i < vectors.length; i++) {
                const vector = vectors[i];
                const label = labels[i];
                const tagName = tagNames[i];
                
                // 添加到索引
                this.tagIndex.addPoint(vector, label);
                
                // 更新映射
                this.tagToLabel.set(tagName, label);
                this.labelToTag.set(label, tagName);
                
                added++;
                
                // 定期报告进度
                if ((i + 1) % BATCH_SIZE === 0) {
                    parentPort.postMessage({
                        type: 'progress',
                        result: {
                            phase: 'adding',
                            current: i + 1,
                            total: vectors.length,
                            progress: ((i + 1) / vectors.length * 100).toFixed(1)
                        }
                    });
                }
            }
            
            const addTime = Date.now() - start;
            
            return {
                success: true,
                message: `Added ${added} vectors`,
                added,
                total: this.tagToLabel.size,
                addTime
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message,
                added: 0,
                total: 0,
                addTime: Date.now() - start
            };
        }
    }
    
    /**
     * 🔍 KNN 搜索
     */
    async searchKnn({ queryVector, k }) {
        try {
            if (!this.tagIndex) {
                throw new Error('Index not initialized');
            }
            
            const results = this.tagIndex.searchKnn(queryVector, k);
            
            return {
                success: true,
                neighbors: results.neighbors,
                distances: results.distances
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message,
                neighbors: [],
                distances: []
            };
        }
    }
    
    /**
     * 🔄 重建索引
     */
    async rebuildIndex({ tagsWithVectors, dimensions }) {
        const start = Date.now();
        
        try {
            this.dimensions = dimensions;
            
            // 创建新索引
            this.tagIndex = new HierarchicalNSW('l2', dimensions);
            const capacity = Math.ceil(tagsWithVectors.length * 1.5);
            this.tagIndex.initIndex(capacity);
            
            // 清空映射
            this.tagToLabel.clear();
            this.labelToTag.clear();
            
            // 添加所有向量
            let label = 0;
            const BATCH_SIZE = 100;
            
            for (let i = 0; i < tagsWithVectors.length; i++) {
                const [tag, vector] = tagsWithVectors[i];
                
                this.tagIndex.addPoint(vector, label);
                this.tagToLabel.set(tag, label);
                this.labelToTag.set(label, tag);
                
                label++;
                
                // 报告进度
                if ((i + 1) % BATCH_SIZE === 0) {
                    parentPort.postMessage({
                        type: 'progress',
                        result: {
                            phase: 'rebuilding',
                            current: i + 1,
                            total: tagsWithVectors.length,
                            progress: ((i + 1) / tagsWithVectors.length * 100).toFixed(1)
                        }
                    });
                }
            }
            
            const rebuildTime = Date.now() - start;
            
            return {
                success: true,
                message: `Rebuilt index with ${tagsWithVectors.length} vectors`,
                elementCount: tagsWithVectors.length,
                capacity,
                rebuildTime
            };
            
        } catch (error) {
            return {
                success: false,
                message: error.message,
                elementCount: 0,
                capacity: 0,
                rebuildTime: Date.now() - start
            };
        }
    }
}

// ====== Worker 主循环 ======

const core = new IndexWorkerCore();

parentPort.on('message', async (msg) => {
    const { taskId, command, data, priority } = msg;
    
    try {
        let result;
        
        switch (command) {
            case 'load':
                result = await core.loadIndex(data.indexPath, data.dataPath);
                break;
                
            case 'save':
                result = await core.saveIndex(data.indexPath, data.dataPath);
                break;
                
            case 'addVectors':
                result = await core.addVectors(data);
                break;
                
            case 'search':
                result = await core.searchKnn(data);
                break;
                
            case 'rebuild':
                result = await core.rebuildIndex(data);
                break;
                
            default:
                throw new Error(`Unknown command: ${command}`);
        }
        
        parentPort.postMessage({
            type: 'success',
            taskId,
            result
        });
        
    } catch (error) {
        parentPort.postMessage({
            type: 'error',
            taskId,
            error: error.message
        });
    }
});

// 通知主线程 Worker 已准备就绪
parentPort.postMessage({ type: 'ready' });

console.log('[TagIndexWorker.worker] Worker thread started');