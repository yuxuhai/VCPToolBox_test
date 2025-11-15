// vectorSearchWorker.js
const { parentPort } = require('worker_threads');
const path = require('path');
const { HierarchicalNSW } = require('hnswlib-node');
const VectorDBStorage = require('./VectorDBStorage.js');

async function performSearch(workerData) {
    const { diaryName, queryVector, k, efSearch, vectorStorePath } = workerData;
    
    let storage = null;

    try {
        const safeFileNameBase = Buffer.from(diaryName, 'utf-8').toString('base64url');
        const indexPath = path.join(vectorStorePath, `${safeFileNameBase}.bin`);

        // 1. 加载索引和从SQLite读取chunkMap
        const index = new HierarchicalNSW('l2', queryVector.length);
        await index.readIndex(indexPath);
        
        // ✅ 使用SQLite读取chunkMap
        storage = new VectorDBStorage(vectorStorePath);
        storage.db = require('better-sqlite3')(path.join(vectorStorePath, 'vectordb.sqlite'), { readonly: true });
        const chunkMap = storage.getChunkMap(diaryName);

        // 2. 验证索引状态
        if (index.getCurrentCount() === 0) {
            parentPort.postMessage({ status: 'success', results: [] });
            return;
        }

        // 3. 设置搜索参数并执行搜索
        if (typeof index.setEf === 'function') {
            index.setEf(efSearch);
        }
        const result = index.searchKnn(queryVector, k);

        if (!result || !result.neighbors) {
            throw new Error('Search returned invalid result.');
        }

        // 4. 整理并返回结果
        const searchResults = result.neighbors.map(label => chunkMap[label]).filter(Boolean);
        parentPort.postMessage({ status: 'success', results: searchResults });

    } catch (error) {
        parentPort.postMessage({ status: 'error', error: error.message });
    } finally {
        // ✅ 清理：关闭数据库连接
        if (storage && storage.db) {
            try {
                storage.db.close();
            } catch (e) {
                // ignore
            }
        }
    }
}

parentPort.on('message', (data) => {
    performSearch(data);
});