// VectorDBManager_TagExtension.js
// 🌟 VectorDBManager的Tag向量扩展 - Alpha-Beta融合搜索

const TagVectorManager = require('./TagVectorManager.js');
const path = require('path');

/**
 * 为VectorDBManager添加Alpha-Beta融合搜索能力
 * 使用方法：在VectorDBManager的initialize()后调用
 */
class TagVectorExtension {
    constructor(vectorDBManager) {
        this.vectorDBManager = vectorDBManager;
        this.tagManager = null;
        this.enabled = false;
    }

    /**
     * 初始化Tag向量管理器
     */
    async initialize() {
        console.log('[TagExtension] Initializing Tag Vector Extension...');

        const DIARY_ROOT_PATH = path.join(__dirname, 'dailynote');
        const VECTOR_STORE_PATH = path.join(__dirname, 'VectorStore');

        this.tagManager = new TagVectorManager({
            diaryRootPath: DIARY_ROOT_PATH,
            vectorStorePath: VECTOR_STORE_PATH
        });

        // 使用VectorDBManager的embedding函数
        const embeddingFunction = async (texts) => {
            return await this.vectorDBManager.getEmbeddingsWithRetry(texts);
        };

        await this.tagManager.initialize(embeddingFunction);
        this.enabled = true;

        console.log('[TagExtension] ✅ Tag Vector Extension initialized');
    }

    /**
     * 🌟 Alpha-Beta融合搜索
     * @param {string} diaryName - 日记本名称
     * @param {Array} queryVector - 查询向量
     * @param {number} k - 返回结果数量
     * @param {number} alphaWeight - Tag权重（默认0.4）
     * @param {number} betaWeight - Chunk权重（默认0.6）
     */
    async searchWithTagFilter(diaryName, queryVector, k = 3, alphaWeight = 0.4, betaWeight = 0.6) {
        if (!this.enabled || !this.tagManager) {
            console.warn('[TagExtension] Tag extension not enabled, fallback to normal search');
            return await this.vectorDBManager.search(diaryName, queryVector, k);
        }

        console.log(`[TagExtension] Alpha-Beta search: ${diaryName} (α=${alphaWeight}, β=${betaWeight})`);

        // Step 1: Alpha层 - Tag向量搜索
        const topTagCount = Math.max(5, Math.round(k * 2));
        const matchedTags = this.tagManager.searchSimilarTags(queryVector, topTagCount);

        if (matchedTags.length === 0) {
            console.warn('[TagExtension] No matched tags, fallback to normal search');
            return await this.vectorDBManager.search(diaryName, queryVector, k);
        }

        console.log(`[TagExtension] Alpha层召回${matchedTags.length}个tags:`,
            matchedTags.slice(0, 3).map(t => `${t.tag}(${t.score.toFixed(3)})`).join(', '));

        // Step 2: Beta层 - Chunk向量搜索（在全部chunks中）
        const largeK = Math.min(k * 5, 50); // 搜索更多候选
        const chunkResults = await this.vectorDBManager.search(diaryName, queryVector, largeK);

        if (chunkResults.length === 0) {
            console.warn('[TagExtension] No chunk results');
            return [];
        }

        // Step 3: Alpha-Beta融合打分
        const finalResults = this.fusionScoring(
            matchedTags,
            chunkResults,
            alphaWeight,
            betaWeight
        );

        console.log(`[TagExtension] 融合完成，返回Top-${k}结果`);
        return finalResults.slice(0, k);
    }

    /**
     * 🌟 Alpha-Beta融合打分算法
     */
    fusionScoring(matchedTags, chunkResults, alpha, beta) {
        // 构建Tag分数映射
        const tagScoreMap = new Map();
        for (const t of matchedTags) {
            tagScoreMap.set(t.tag, t.score);
        }

        // 为每个chunk计算融合得分
        const scoredResults = chunkResults.map(chunk => {
            // Beta分数（原始向量相似度）
            const betaScore = 1 - chunk.distance;

            // Alpha分数（Tag匹配度）
            const chunkTags = this.extractTagsFromChunk(chunk.text);
            let alphaScore = 0;
            let matchedTagsList = [];
            let tagMatchCount = 0;

            for (const tag of chunkTags) {
                if (tagScoreMap.has(tag)) {
                    alphaScore += tagScoreMap.get(tag);
                    matchedTagsList.push(tag);
                    tagMatchCount++;
                }
            }

            // 归一化Alpha分数
            if (chunkTags.length > 0) {
                alphaScore = alphaScore / chunkTags.length;
            }

            // 🌟 融合公式：finalScore = α·alphaScore + β·betaScore
            const finalScore = alpha * alphaScore + beta * betaScore;

            return {
                ...chunk,
                alphaScore,
                betaScore,
                finalScore,
                matchedTags: matchedTagsList,
                tagMatchCount
            };
        });

        // 按融合得分排序
        scoredResults.sort((a, b) => b.finalScore - a.finalScore);

        return scoredResults;
    }

    /**
     * 从chunk文本提取tags
     */
    extractTagsFromChunk(text) {
        const match = text.match(/^Tag:\s*(.+)$/m);
        if (!match) return [];

        return match[1]
            .split(/[,，、]/)
            .map(t => t.trim())
            .filter(Boolean);
    }

    /**
     * 获取Tag统计信息
     */
    getTagStats() {
        if (!this.tagManager) return null;
        return this.tagManager.getStats();
    }

    /**
     * 关闭扩展
     */
    async shutdown() {
        if (this.tagManager) {
            await this.tagManager.shutdown();
        }
    }
}

module.exports = TagVectorExtension;