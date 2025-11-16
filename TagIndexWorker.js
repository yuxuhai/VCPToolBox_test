// 🚀 Tag 索引 Worker - Node.js Worker Threads 版本
// 🎯 职责：仅负责 HNSW 索引的 IO 操作（读取/写入），避免阻塞主线程
// ⚠️ 不负责批处理、业务逻辑、文件管理 - 这些由 TagVectorManager 处理

const { Worker } = require('worker_threads');
const path = require('path');
const EventEmitter = require('events');

/**
 * Tag 索引 Worker 管理器
 *
 * 🎯 简化职责：
 * - 后台线程处理 HNSW 索引的 IO 操作（读/写/搜索）
 * - 串行任务队列（防止并发 IO 冲突）
 * - 进度报告和错误处理
 *
 * ❌ 不负责：
 * - 批处理逻辑（由 TagVectorManager 控制）
 * - 文件管理（由 TagVectorManager 控制）
 * - 业务决策（由 TagVectorManager 控制）
 */
class TagIndexWorker extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.workerPath = path.join(__dirname, 'TagIndexWorker.worker.js');
        this.worker = null;
        this.taskId = 0;
        this.pendingTasks = new Map();
        this.isReady = false;
        
        // 🌟 串行任务队列（防止并发 IO）
        this.taskQueue = [];
        this.isProcessingTask = false;
        
        // 统计信息
        this.stats = {
            completedTasks: 0,
            failedTasks: 0,
            totalLoadTime: 0,
            totalSaveTime: 0,
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
    
    /**
     * 🌟 串行任务执行（防止并发 IO 冲突）
     */
    async _executeTask(command, data, priority = 'normal') {
        return new Promise((resolve, reject) => {
            // 将任务加入队列
            this.taskQueue.push({ command, data, priority, resolve, reject });
            
            // 如果没有任务在执行，立即开始处理
            if (!this.isProcessingTask) {
                this._processTaskQueue();
            }
        });
    }
    
    /**
     * 🌟 处理任务队列
     */
    async _processTaskQueue() {
        if (this.isProcessingTask || this.taskQueue.length === 0) {
            return;
        }
        
        this.isProcessingTask = true;
        
        while (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();
            
            try {
                const result = await this._sendTaskToWorker(task.command, task.data, task.priority);
                task.resolve(result);
            } catch (error) {
                task.reject(error);
            }
        }
        
        this.isProcessingTask = false;
    }
    
    /**
     * 🌟 发送任务到 Worker 线程
     */
    _sendTaskToWorker(command, data, priority = 'normal') {
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
            const result = await this._executeTask('load', { indexPath, dataPath }, 'high');
            
            this.stats.totalLoadTime += Date.now() - start;
            console.log(`[TagIndexWorker] ✅ Index loaded in ${Date.now() - start}ms`);
            
            return result;
        } catch (error) {
            console.error('[TagIndexWorker] Load failed:', error.message);
            throw error;
        }
    }
    
    /**
     * 💾 异步保存索引（后台线程）
     */
    async saveIndex(indexPath, dataPath) {
        const start = Date.now();
        
        try {
            console.log(`[TagIndexWorker] 💾 Saving to worker thread...`);
            const result = await this._executeTask('save', { indexPath, dataPath }, 'high');
            
            this.stats.totalSaveTime += Date.now() - start;
            console.log(`[TagIndexWorker] ✅ Worker save completed in ${Date.now() - start}ms`);
            
            return result;
        } catch (error) {
            console.error('[TagIndexWorker] Save failed:', error.message);
            throw error;
        }
    }
    
    /**
     * ➕ 批量添加向量（后台线程）
     */
    async addVectors(tagNames, vectors, labels) {
        return this._executeTask('addVectors', { tagNames, vectors, labels }, 'normal');
    }
    
    /**
     * 🔍 KNN 搜索（后台线程）
     */
    async searchKnn(queryVector, k) {
        return this._executeTask('search', { queryVector, k }, 'high');
    }
    
    /**
     * 🔄 重建索引（后台线程）
     */
    async rebuildIndex(tagsWithVectors, dimensions) {
        return this._executeTask('rebuild', { tagsWithVectors, dimensions }, 'high');
    }
    
    /**
     * 📊 获取统计信息
     */
    getStats() {
        return {
            ...this.stats,
            pendingTasks: this.pendingTasks.size,
            queuedTasks: this.taskQueue.length,
            isProcessingTask: this.isProcessingTask,
            isReady: this.isReady
        };
    }
    
    /**
     * 🛑 关闭 Worker
     */
    async shutdown() {
        if (this.worker) {
            console.log('[TagIndexWorker] Shutting down...');
            
            // 等待任务队列清空
            while (this.taskQueue.length > 0 || this.isProcessingTask) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // 等待所有待处理任务完成
            while (this.pendingTasks.size > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            await this.worker.terminate();
            this.worker = null;
            
            console.log('[TagIndexWorker] ✅ Shutdown complete');
            console.log(`[TagIndexWorker] 📊 Final stats: ${this.stats.completedTasks} completed, ${this.stats.failedTasks} failed`);
        }
    }
}

module.exports = TagIndexWorker;