// TagVectorizeWorker.worker.js
// Worker线程实现 - 处理向量化的后台逻辑

const { parentPort } = require('worker_threads');

// 通知主线程Worker已就绪
parentPort.postMessage({ type: 'ready' });

parentPort.on('message', async (message) => {
    if (message.type === 'vectorize') {
        const { requestId, tags, concurrency } = message;
        
        try {
            // ⚠️ 注意：Worker无法直接访问主线程的embedding函数
            // 实际的向量化需要在主线程通过消息传递完成
            // 这个Worker主要用于协调并发控制和进度报告
            
            parentPort.postMessage({
                type: 'result',
                requestId,
                error: 'This worker requires callback-based vectorization. Use vectorizeWithCallback instead.'
            });
            
        } catch (error) {
            parentPort.postMessage({
                type: 'result',
                requestId,
                error: error.message
            });
        }
    }
});