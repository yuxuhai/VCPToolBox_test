// 🚀 Tag 索引 Worker - Node.js Worker Threads 版本
// 将重量级 HNSW 操作移到后台线程，避免阻塞主线程

const { Worker } = require('worker_threads');
const path = require('path');
const EventEmitter = require('events');

/**
 * Tag 索引 Worker 管理器
 *
 * 特性：
 * - 后台线程处理 HNSW 索引读写
 * - 🌟 智能批处理队列（1分钟合并窗口）
 * - 🌟 串行执行保证（上一次保存完成才开始下一次）
 * - 优先级任务队列
 * - 自动重试和错误恢复
 */
class TagIndexWorker extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.workerPath = path.join(__dirname, 'TagIndexWorker.worker.js');
        this.worker = null;
        this.taskId = 0;
        this.pendingTasks = new Map();
        this.isReady = false;
        
        // 🌟 智能批处理队列
        this.batchQueue = {
            pendingChanges: new Set(), // 待处理的tag变更
            mergeTimer: null,
            mergeWindow: 60000, // 1分钟合并窗口
            isProcessing: false, // 是否正在处理批次
            nextBatch: new Set(), // 下一批次（处理中时的新变更）
        };
        
        // 统计信息
        this.stats = {
            completedTasks: 0,
            failedTasks: 0,
            totalLoadTime: 0,
            totalSaveTime: 0,
            batchesMerged: 0,
            tagsProcessed: 0,
        };
        
        this._initWorker();
    }
    
    _initWorker() {
        console.log('[TagIndexWorker] Initializing worker thread...');
        
        this.worker = new Worker(this.workerPath);
        
        this.worker.on('message', (msg) => {
            this._handleMessage(msg);
        });
        
        this.worker.on('error', (error) => {
            console.error('[TagIndexWorker] Worker error:', error);
            this.emit('error', error);
        });
        
        this.worker.on('exit', (code) => {
            if (code !== 0) {
                console.error(`[TagIndexWorker] Worker stopped with exit code ${code}`);
            }
        });
    }
    
    _handleMessage(msg) {
        const { type, taskId, result, error } = msg;
        
        if (type === 'ready') {
            this.isReady = true;
            console.log('[TagIndexWorker] ✅ Worker ready');
            this.emit('ready');
            return;
        }
        
        if (type === 'progress') {
            this.emit('progress', result);
            return;
        }
        
        const task = this.pendingTasks.get(taskId);
        if (!task) return;
        
        this.pendingTasks.delete(taskId);
        
        if (type === 'success') {
            this.stats.completedTasks++;
            task.resolve(result);
        } else if (type === 'error') {
            this.stats.failedTasks++;
            task.reject(new Error(error));
        }
    }
    
    _sendTask(command, data, priority = 'normal') {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                return reject(new Error('Worker not initialized'));
            }
            
            const taskId = ++this.taskId;
            this.pendingTasks.set(taskId, { resolve, reject });
            
            this.worker.postMessage({
                taskId,
                command,
                data,
                priority
            });
        });
    }
    
    /**
     * 📖 异步加载索引（后台线程）
     */
    async loadIndex(indexPath, dataPath) {
        const start = Date.now();
        
        try {
            const result = await this._sendTask('load', { indexPath, dataPath }, 'high');
            
            this.stats.totalLoadTime += Date.now() - start;
            console.log(`[TagIndexWorker] ✅ Index loaded in ${Date.now() - start}ms`);
            
            return result;
        } catch (error) {
            console.error('[TagIndexWorker] Load failed:', error.message);
            throw error;
        }
    }
    
    /**
     * 🌟 通知 Tag 变更（触发智能批处理）
     *
     * 核心逻辑：
     * 1. Tag变更时立即暂存到队列
     * 2. 启动1分钟合并窗口
     * 3. 如果正在处理，则加入下一批次
     * 4. 窗口结束后，批量处理所有变更
     */
    notifyTagChange(tagName) {
        // 如果正在处理批次，加入下一批
        if (this.batchQueue.isProcessing) {
            this.batchQueue.nextBatch.add(tagName);
            console.log(`[TagIndexWorker] 📋 Tag "${tagName}" queued for next batch (${this.batchQueue.nextBatch.size} pending)`);
            return;
        }
        
        // 加入当前批次
        this.batchQueue.pendingChanges.add(tagName);
        
        // 重置合并窗口计时器
        if (this.batchQueue.mergeTimer) {
            clearTimeout(this.batchQueue.mergeTimer);
        }
        
        this.batchQueue.mergeTimer = setTimeout(() => {
            this._processBatch();
        }, this.batchQueue.mergeWindow);
        
        console.log(`[TagIndexWorker] 🔔 Tag change detected: "${tagName}" (${this.batchQueue.pendingChanges.size} in current batch, merge window reset)`);
    }
    
    /**
     * 🌟 处理批次（内部方法）
     */
    async _processBatch() {
        if (this.batchQueue.pendingChanges.size === 0) {
            return;
        }
        
        // 🌟 关键：标记为正在处理
        this.batchQueue.isProcessing = true;
        
        const currentBatch = Array.from(this.batchQueue.pendingChanges);
        this.batchQueue.pendingChanges.clear();
        this.batchQueue.mergeTimer = null;
        
        console.log(`[TagIndexWorker] 🚀 Processing batch: ${currentBatch.length} tags`);
        this.stats.batchesMerged++;
        this.stats.tagsProcessed += currentBatch.length;
        
        // 发出批处理开始事件
        this.emit('batchStart', { count: currentBatch.length, tags: currentBatch });
        
        try {
            // 这里触发实际的保存操作
            // 由外部调用者（TagVectorManager）响应 batchStart 事件并执行保存
            
            // 等待外部保存完成的信号
            await new Promise((resolve) => {
                this.once('batchComplete', resolve);
            });
            
            console.log(`[TagIndexWorker] ✅ Batch processed successfully`);
            
        } catch (error) {
            console.error(`[TagIndexWorker] ❌ Batch processing failed:`, error.message);
            this.stats.failedTasks++;
        } finally {
            // 🌟 关键：处理完成，检查下一批次
            this.batchQueue.isProcessing = false;
            
            if (this.batchQueue.nextBatch.size > 0) {
                console.log(`[TagIndexWorker] 🔄 Starting next batch: ${this.batchQueue.nextBatch.size} tags`);
                
                // 将下一批次移到当前批次
                this.batchQueue.pendingChanges = new Set(this.batchQueue.nextBatch);
                this.batchQueue.nextBatch.clear();
                
                // 立即开始处理（不等待合并窗口）
                setImmediate(() => this._processBatch());
            }
        }
    }
    
    /**
     * 💾 异步保存索引（后台线程）
     * 🌟 注意：通常由批处理触发，而不是直接调用
     */
    async saveIndex(indexPath, dataPath) {
        const start = Date.now();
        
        try {
            console.log(`[TagIndexWorker] 💾 Saving to worker thread...`);
            const result = await this._sendTask('save', { indexPath, dataPath }, 'high');
            
            this.stats.totalSaveTime += Date.now() - start;
            console.log(`[TagIndexWorker] ✅ Worker save completed in ${Date.now() - start}ms`);
            
            return result;
        } catch (error) {
            console.error('[TagIndexWorker] Save failed:', error.message);
            throw error;
        }
    }
    
    /**
     * 🌟 完成批次处理（外部调用）
     */
    completeBatch() {
        this.emit('batchComplete');
    }
    
    /**
     * ➕ 批量添加向量（后台线程）
     */
    async addVectors(tagNames, vectors, labels) {
        return this._sendTask('addVectors', { tagNames, vectors, labels }, 'normal');
    }
    
    /**
     * 🔍 KNN 搜索（后台线程）
     */
    async searchKnn(queryVector, k) {
        return this._sendTask('search', { queryVector, k }, 'high');
    }
    
    /**
     * 🔄 重建索引（后台线程）
     */
    async rebuildIndex(tagsWithVectors, dimensions) {
        return this._sendTask('rebuild', { tagsWithVectors, dimensions }, 'high');
    }
    
    /**
     * 📊 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            pendingTasks: this.pendingTasks.size,
            isReady: this.isReady,
            batchQueue: {
                currentBatch: this.batchQueue.pendingChanges.size,
                nextBatch: this.batchQueue.nextBatch.size,
                isProcessing: this.batchQueue.isProcessing,
                mergeWindowActive: this.batchQueue.mergeTimer !== null
            }
        };
    }
    
    /**
     * 🛑 关闭 Worker
     */
    async shutdown() {
        if (this.worker) {
            console.log('[TagIndexWorker] Shutting down...');
            
            // 清除合并窗口计时器
            if (this.batchQueue.mergeTimer) {
                clearTimeout(this.batchQueue.mergeTimer);
            }
            
            // 如果有待处理的批次，立即处理
            if (this.batchQueue.pendingChanges.size > 0) {
                console.log(`[TagIndexWorker] 🔄 Flushing pending batch: ${this.batchQueue.pendingChanges.size} tags`);
                await this._processBatch();
            }
            
            // 等待所有任务完成
            while (this.pendingTasks.size > 0 || this.batchQueue.isProcessing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            await this.worker.terminate();
            this.worker = null;
            
            console.log('[TagIndexWorker] ✅ Shutdown complete');
            console.log(`[TagIndexWorker] 📊 Final stats: ${this.stats.batchesMerged} batches, ${this.stats.tagsProcessed} tags processed`);
        }
    }
}

module.exports = TagIndexWorker;