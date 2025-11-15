// test_tag_search.js
// Tag向量搜索功能测试脚本

const VectorDBManager = require('./VectorDBManager.js');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config({ path: './config.env' });

async function testTagSearch() {
    console.log('='.repeat(60));
    console.log('Tag向量搜索功能测试');
    console.log('='.repeat(60));

    const vectorDBManager = new VectorDBManager();

    try {
        // 初始化VectorDBManager（会自动初始化TagVectorManager）
        console.log('\n1. 初始化VectorDBManager...');
        await vectorDBManager.initialize();
        
        // 检查Tag功能是否启用
        if (!vectorDBManager.tagVectorEnabled) {
            console.error('❌ Tag向量功能未启用，请检查配置');
            return;
        }

        // 获取Tag统计
        const tagStats = vectorDBManager.tagVectorManager.getStats();
        console.log('\n2. Tag向量库统计:');
        console.log(`   - 总Tag数: ${tagStats.totalTags}`);
        console.log(`   - 已向量化: ${tagStats.vectorizedTags}`);
        console.log(`   - 黑名单Tag数: ${tagStats.blacklistedTags}`);

        // 测试查询
        const testQuery = "商业纠纷和法律问题";
        console.log(`\n3. 测试查询: "${testQuery}"`);
        
        // 获取查询向量
        const queryVector = await vectorDBManager.getEmbeddingsWithRetry([testQuery]);
        if (!queryVector || queryVector.length === 0) {
            console.error('❌ 无法获取查询向量');
            return;
        }

        // 搜索相似Tags
        console.log('\n4. 搜索相似Tags (Top 10):');
        const similarTags = await vectorDBManager.tagVectorManager.searchSimilarTags(queryVector[0], 10);
        
        if (similarTags.length === 0) {
            console.log('   未找到相似的Tags');
        } else {
            similarTags.forEach((tagInfo, index) => {
                console.log(`   ${index + 1}. "${tagInfo.tag}" - 相似度: ${tagInfo.score.toFixed(4)}, 频率: ${tagInfo.frequency}, 出现在 ${tagInfo.diaryCount} 个日记本`);
            });
        }

        // 测试带Tag权重的搜索
        const testDiary = '小吉'; // 替换为你实际的日记本名称
        const tagWeight = 0.65;
        
        console.log(`\n5. 测试带Tag权重的搜索:`);
        console.log(`   日记本: ${testDiary}`);
        console.log(`   Tag权重: ${tagWeight}`);
        console.log(`   K值: 5`);

        try {
            const normalResults = await vectorDBManager.search(testDiary, queryVector[0], 5);
            console.log(`\n   普通搜索结果 (${normalResults.length}个):`);
            normalResults.forEach((result, index) => {
                console.log(`   ${index + 1}. 得分: ${(1 - result.distance).toFixed(4)}`);
                console.log(`      文本: ${result.text.substring(0, 100)}...`);
            });

            const tagResults = await vectorDBManager.searchWithTagBoost(testDiary, queryVector[0], 5, tagWeight);
            console.log(`\n   Tag增强搜索结果 (${tagResults.length}个):`);
            tagResults.forEach((result, index) => {
                console.log(`   ${index + 1}. 最终得分: ${result.score.toFixed(4)} (原始: ${result.originalScore.toFixed(4)}, 提权: ${result.boostFactor.toFixed(2)}x)`);
                console.log(`      匹配Tags: ${result.matchedTags.join(', ') || '无'}`);
                console.log(`      文本: ${result.text.substring(0, 100)}...`);
            });
        } catch (searchError) {
            console.log(`\n   ⚠️ 搜索测试跳过: ${searchError.message}`);
            console.log('   (这可能是因为指定的日记本不存在或为空)');
        }

        console.log('\n' + '='.repeat(60));
        console.log('✅ Tag搜索功能测试完成');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ 测试过程中发生错误:');
        console.error(error);
    } finally {
        // 清理
        await vectorDBManager.shutdown();
    }
}

// 运行测试
testTagSearch().catch(console.error);