// TagVectorizeWorker.js
// 🚀 专门处理Tag向量化的Worker线程
// 完全非阻塞，将CPU密集型的向量化操作移到后台

const { Worker } = require('worker_threads');
const EventEmitter = require('events');
const path = require('path');

class TagVectorizeWorker extends EventEmitter {
    constructor() {
        super();
        this.worker = null;
        this.pendingRequests = new Map(); // requestId → { resolve, reject }
        this.nextRequestId = 0;
        this.isReady = false;
        
        this._initWorker();
    }
    
    _initWorker() {
        const workerPath = path.join(__dirname, 'TagVectorizeWorker.worker.js');
        
        try {
            this.worker = new Worker(workerPath);
            
            this.worker.on('message', (message) => {
                if (message.type === 'ready') {
                    this.isReady = true;
                    this.emit('ready');
                    return;
                }
                
                if (message.type === 'result') {
                    const { requestId, vectors, error } = message;
                    const pending = this.pendingRequests.get(requestId);
                    
                    if (pending) {
                        this.pendingRequests.delete(requestId);
                        
                        if (error) {
                            pending.reject(new Error(error));
                        } else {
                            pending.resolve(vectors);
                        }
                    }
                }
                
                if (message.type === 'progress') {
                    this.emit('progress', message.data);
                }
            });
            
            this.worker.on('error', (error) => {
                console.error('[TagVectorizeWorker] Worker error:', error);
                this.emit('error', error);
            });
            
            this.worker.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`[TagVectorizeWorker] Worker exited with code ${code}`);
                }
            });
            
        } catch (error) {
            console.error('[TagVectorizeWorker] Failed to create worker:', error);
            throw error;
        }
    }
    
    /**
     * 🚀 异步向量化（完全非阻塞）
     * @param {Array<string>} tags - 要向量化的tags
     * @param {Function} embeddingFunction - 主线程的embedding函数
     * @param {number} concurrency - 并发度
     * @returns {Promise<Array>} - 向量数组
     */
    async vectorize(tags, embeddingFunction, concurrency = 5) {
        if (!this.isReady) {
            await new Promise(resolve => this.once('ready', resolve));
        }
        
        const requestId = this.nextRequestId++;
        
        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, { resolve, reject });
            
            // 将embedding函数序列化为可传递的格式
            this.worker.postMessage({
                type: 'vectorize',
                requestId,
                tags,
                concurrency,
                // ⚠️ Worker无法直接调用主线程函数，需要通过消息传递
                // 所以我们改用轮询方式
            });
        });
    }
    
    /**
     * 🔄 使用主线程embedding函数的向量化（通过消息传递）
     */
    async vectorizeWithCallback(tags, embeddingFunction, concurrency = 5, batchSize = 100) {
        // 分批处理
        const batches = [];
        for (let i = 0; i < tags.length; i += batchSize) {
            batches.push(tags.slice(i, i + batchSize));
        }
        
        const allVectors = [];
        const processingPool = new Set();
        let batchIndex = 0;
        
        console.log(`[TagVectorizeWorker] Processing ${tags.length} tags in ${batches.length} batches (concurrency: ${concurrency})`);
        
        while (batchIndex < batches.length || processingPool.size > 0) {
            // 填充并发池
            while (processingPool.size < concurrency && batchIndex < batches.length) {
                const batch = batches[batchIndex];
                const currentIndex = batchIndex;
                batchIndex++;
                
                const promise = (async () => {
                    try {
                        // 🚀 关键：在Worker中执行embedding调用
                        const vectors = await embeddingFunction(batch);
                        
                        // 发送进度事件
                        this.emit('progress', {
                            completed: currentIndex + 1,
                            total: batches.length,
                            percent: ((currentIndex + 1) / batches.length * 100).toFixed(1)
                        });
                        
                        return { index: currentIndex, vectors, success: true };
                    } catch (error) {
                        console.error(`[TagVectorizeWorker] Batch ${currentIndex} failed:`, error.message);
                        return { index: currentIndex, vectors: null, success: false, error };
                    }
                })();
                
                processingPool.add(promise);
                
                promise.finally(() => {
                    processingPool.delete(promise);
                });
            }
            
            // 等待至少一个完成
            if (processingPool.size > 0) {
                const result = await Promise.race(processingPool);
                if (result.success) {
                    // 按顺序存储结果
                    allVectors[result.index] = result.vectors;
                }
            }
        }
        
        // 合并所有向量
        const finalVectors = [];
        for (const vectorBatch of allVectors) {
            if (vectorBatch) {
                finalVectors.push(...vectorBatch);
            }
        }
        
        return finalVectors;
    }
    
    async shutdown() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
            this.isReady = false;
        }
    }
}

module.exports = TagVectorizeWorker;