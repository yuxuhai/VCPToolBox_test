// test_tag_vector.js
// 🧪 Tag向量库功能测试脚本

require('dotenv').config();
const TagVectorManager = require('./TagVectorManager.js');
const path = require('path');

/**
 * Mock Embedding函数（用于快速测试）
 */
async function mockEmbeddings(texts) {
    console.log(`[Mock] Generating embeddings for ${texts.length} texts...`);
    
    // 生成随机768维向量（模拟真实embedding）
    return texts.map(() => {
        const vector = new Float32Array(768);
        for (let i = 0; i < 768; i++) {
            vector[i] = Math.random() * 2 - 1; // [-1, 1]
        }
        return Array.from(vector);
    });
}

/**
 * 真实Embedding函数
 */
async function realEmbeddings(texts) {
    const { default: fetch } = await import('node-fetch');
    
    const apiKey = process.env.API_Key;
    const apiUrl = process.env.API_URL;
    const embeddingModel = process.env.WhitelistEmbeddingModel;

    const response = await fetch(`${apiUrl}/v1/embeddings`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: embeddingModel,
            input: texts
        })
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map(item => item.embedding);
}

/**
 * 测试1: 扫描Tag统计
 */
async function test1_scanTags() {
    console.log('\n=== Test 1: Scan and Count Tags ===\n');

    const tagManager = new TagVectorManager({
        diaryRootPath: path.join(__dirname, 'dailynote'),
        vectorStorePath: path.join(__dirname, 'VectorStore')
    });

    const stats = await tagManager.scanAllDiaryTags();
    
    console.log(`Total files scanned: ${stats.totalFiles}`);
    console.log(`Unique tags found: ${stats.uniqueTags}`);
    
    // 显示频率最高的10个tags
    const topTags = Array.from(tagManager.globalTags.entries())
        .sort((a, b) => b[1].frequency - a[1].frequency)
        .slice(0, 10);
    
    console.log('\nTop 10 most frequent tags:');
    for (const [tag, data] of topTags) {
        console.log(`  ${tag}: ${data.frequency} times in ${data.diaries.size} diaries`);
    }

    return tagManager;
}

/**
 * 测试2: 过滤规则
 */
async function test2_filterTags(tagManager) {
    console.log('\n=== Test 2: Tag Filtering ===\n');

    const beforeCount = tagManager.globalTags.size;
    console.log(`Before filtering: ${beforeCount} tags`);

    tagManager.applyTagFilters({ totalFiles: 100 }); // 假设100个文件

    const afterCount = tagManager.globalTags.size;
    console.log(`After filtering: ${afterCount} tags`);
    console.log(`Filtered out: ${beforeCount - afterCount} tags`);
}

/**
 * 测试3: 批量向量化（使用Mock）
 */
async function test3_vectorizeTags(tagManager, useMock = true) {
    console.log('\n=== Test 3: Batch Vectorization ===\n');

    const embeddingFunc = useMock ? mockEmbeddings : realEmbeddings;
    
    console.log(`Using ${useMock ? 'MOCK' : 'REAL'} embedding function`);
    console.log(`Batch size: ${tagManager.config.tagBatchSize}`);

    const startTime = Date.now();
    await tagManager.vectorizeAllTags(embeddingFunc);
    const elapsed = Date.now() - startTime;

    console.log(`✅ Vectorization complete in ${(elapsed / 1000).toFixed(2)}s`);
    
    const vectorizedCount = Array.from(tagManager.globalTags.values())
        .filter(d => d.vector !== null).length;
    
    console.log(`Vectorized tags: ${vectorizedCount}`);
}

/**
 * 测试4: HNSW索引构建
 */
async function test4_buildIndex(tagManager) {
    console.log('\n=== Test 4: Build HNSW Index ===\n');

    try {
        tagManager.buildHNSWIndex();
        console.log('✅ HNSW index built successfully');
        console.log(`Index size: ${tagManager.tagToLabel.size} tags`);
    } catch (error) {
        console.error('❌ Index build failed:', error.message);
    }
}

/**
 * 测试5: Tag相似度搜索
 */
async function test5_searchTags(tagManager, useMock = true) {
    console.log('\n=== Test 5: Tag Similarity Search ===\n');

    // 生成一个测试查询向量
    const embeddingFunc = useMock ? mockEmbeddings : realEmbeddings;
    const queryVectors = await embeddingFunc(['烹饪']);
    const queryVector = queryVectors[0];

    console.log('Query: "烹饪"');
    
    const results = tagManager.searchSimilarTags(queryVector, 10);
    
    console.log(`\nTop 10 similar tags:`);
    for (const result of results) {
        console.log(`  ${result.tag}: score=${result.score.toFixed(4)}, freq=${result.frequency}, diaries=${result.diaryCount}`);
    }
}

/**
 * 测试6: 保存和加载
 */
async function test6_saveAndLoad(tagManager) {
    console.log('\n=== Test 6: Save and Load ===\n');

    const indexPath = path.join(__dirname, 'VectorStore', 'GlobalTags_test.bin');
    const dataPath = path.join(__dirname, 'VectorStore', 'GlobalTags_test.json');

    // 保存
    console.log('Saving...');
    await tagManager.saveGlobalTagLibrary(indexPath, dataPath);
    console.log('✅ Saved successfully');

    // 加载
    console.log('Loading...');
    const newTagManager = new TagVectorManager({
        diaryRootPath: path.join(__dirname, 'dailynote'),
        vectorStorePath: path.join(__dirname, 'VectorStore')
    });
    
    await newTagManager.loadGlobalTagLibrary(indexPath, dataPath);
    console.log('✅ Loaded successfully');
    console.log(`Loaded ${newTagManager.globalTags.size} tags`);
}

/**
 * 主测试流程
 */
async function main() {
    console.log('🧪 Tag Vector Library Test Suite\n');
    console.log('=================================\n');

    const useMock = process.argv.includes('--mock');
    console.log(`Running in ${useMock ? 'MOCK' : 'REAL'} mode\n`);

    try {
        // Test 1: 扫描Tags
        const tagManager = await test1_scanTags();

        // Test 2: 过滤
        await test2_filterTags(tagManager);

        // Test 3: 向量化
        await test3_vectorizeTags(tagManager, useMock);

        // Test 4: 构建索引
        await test4_buildIndex(tagManager);

        // Test 5: 搜索
        await test5_searchTags(tagManager, useMock);

        // Test 6: 保存和加载
        await test6_saveAndLoad(tagManager);

        console.log('\n✅ All tests passed!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// 运行测试
console.log('Usage:');
console.log('  node test_tag_vector.js          # Use real embedding API');
console.log('  node test_tag_vector.js --mock   # Use mock embeddings (faster)\n');

main().catch(console.error);