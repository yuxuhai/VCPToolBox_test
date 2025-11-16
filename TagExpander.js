// TagExpander.js
// 🌟 Tag毛边扩展器
// 基于共现权重矩阵，从向量召回的tag"毛边"扩展出关联tag

const fs = require('fs');
const path = require('path');

/**
 * Tag扩展器
 * 设计理念：语义空间是不规则的、有"毛刺"的有机形态
 * 核心功能：从种子tag扩展出"毛边"关联tag
 */
class TagExpander {
    constructor(config = {}) {
        this.config = {
            minWeight: parseInt(process.env.TAG_EXPAND_MIN_WEIGHT) || 2,
            maxExpansion: parseInt(process.env.TAG_EXPAND_MAX_COUNT) || 10,
            preferMultiSource: process.env.TAG_EXPAND_PREFER_MULTI_SOURCE !== 'false',
            debug: process.env.TAG_EXPAND_DEBUG === 'true',
            ...config
        };
        
        // 权重矩阵（内存）
        this.weightMatrix = new Map(); // tag → Map<relatedTag, weight>
        this.loaded = false;
        
        console.log('[TagExpander] Initialized with config:', {
            minWeight: this.config.minWeight,
            maxExpansion: this.config.maxExpansion,
            preferMultiSource: this.config.preferMultiSource
        });
    }
    
    debugLog(message, ...args) {
        if (this.config.debug) {
            console.log(`[TagExpander][DEBUG] ${message}`, ...args);
        }
    }
    
    /**
     * 加载权重矩阵到内存
     * @param {string|Map} source - JSON文件路径或Map对象
     */
    async loadWeightMatrix(source) {
        if (source instanceof Map) {
            // 直接使用Map对象
            this.weightMatrix = source;
            this.loaded = true;
            console.log(`[TagExpander] ✅ Loaded matrix from Map: ${this.weightMatrix.size} tags`);
            return;
        }
        
        // 从文件加载
        const filePath = typeof source === 'string' ? source : 
            path.join(__dirname, 'VectorStore', 'TagCooccurrence_matrix.json');
        
        try {
            const data = await fs.promises.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(data);
            
            // 转换为Map结构
            this.weightMatrix.clear();
            for (const [tag, related] of Object.entries(parsed)) {
                const relatedMap = new Map(Object.entries(related));
                this.weightMatrix.set(tag, relatedMap);
            }
            
            this.loaded = true;
            console.log(`[TagExpander] ✅ Loaded matrix from file: ${this.weightMatrix.size} tags`);
            
        } catch (error) {
            console.warn(`[TagExpander] Failed to load matrix:`, error.message);
            this.loaded = false;
        }
    }
    
    /**
     * 🌟 扩展tag列表（核心算法）
     * @param {Array<string>} seedTags - 种子tag（来自向量检索）
     * @param {number} maxExpansion - 最多扩展数量
     * @returns {Array<{tag: string, weight: number, sources: Array<string>}>}
     */
    expandTags(seedTags, maxExpansion = null) {
        if (!this.loaded) {
            this.debugLog('Matrix not loaded, returning empty');
            return [];
        }
        
        maxExpansion = maxExpansion || this.config.maxExpansion;
        const seedSet = new Set(seedTags);
        
        // 收集候选tag及其来源
        const candidates = new Map(); // tag → {totalWeight, sources: Map<seedTag, weight>}
        
        for (const seedTag of seedTags) {
            const related = this.weightMatrix.get(seedTag);
            if (!related) continue;
            
            for (const [relatedTag, weight] of related.entries()) {
                // 跳过种子tag本身
                if (seedSet.has(relatedTag)) continue;
                
                // 权重过滤
                if (weight < this.config.minWeight) continue;
                
                if (!candidates.has(relatedTag)) {
                    candidates.set(relatedTag, {
                        totalWeight: 0,
                        sources: new Map()
                    });
                }
                
                const candidate = candidates.get(relatedTag);
                candidate.totalWeight += weight;
                candidate.sources.set(seedTag, weight);
            }
        }
        
        // 🌟 排序策略：优先多来源的"毛刺"
        const expanded = Array.from(candidates.entries())
            .map(([tag, data]) => ({
                tag,
                weight: data.totalWeight,
                sources: Array.from(data.sources.keys()),
                sourceCount: data.sources.size,
                avgWeight: data.totalWeight / data.sources.size
            }))
            .sort((a, b) => {
                if (this.config.preferMultiSource) {
                    // 优先级1：关联的种子数量（"毛刺"的连接度）
                    if (b.sourceCount !== a.sourceCount) {
                        return b.sourceCount - a.sourceCount;
                    }
                    // 优先级2：平均权重（连接强度）
                    if (Math.abs(b.avgWeight - a.avgWeight) > 0.1) {
                        return b.avgWeight - a.avgWeight;
                    }
                }
                // 默认：总权重
                return b.weight - a.weight;
            })
            .slice(0, maxExpansion);
        
        this.debugLog(`Expanded ${seedTags.length} seeds → ${expanded.length} edges:`,
            expanded.slice(0, 3).map(e => `${e.tag}(${e.sourceCount}×${e.avgWeight.toFixed(1)})`).join(', '));
        
        return expanded;
    }
    
    /**
     * 🌟 批量扩展（用于多个查询结果）
     * @param {Array<{matchedTags: Array<string>}>} results - 向量检索结果
     * @param {number} maxExpansionPerResult - 每个结果最多扩展数量
     * @returns {Array} - 带扩展tag的结果
     */
    expandResults(results, maxExpansionPerResult = 5) {
        if (!this.loaded) return results;
        
        return results.map(result => {
            const seedTags = result.matchedTags || [];
            if (seedTags.length === 0) return result;
            
            const expanded = this.expandTags(seedTags, maxExpansionPerResult);
            
            return {
                ...result,
                expandedTags: expanded.map(e => ({
                    tag: e.tag,
                    weight: e.weight,
                    sources: e.sources
                })),
                edgeCount: expanded.length
            };
        });
    }
    
    /**
     * 获取tag的直接邻居
     */
    getNeighbors(tag, minWeight = null) {
        if (!this.loaded) return [];
        
        minWeight = minWeight || this.config.minWeight;
        const related = this.weightMatrix.get(tag);
        
        if (!related) return [];
        
        return Array.from(related.entries())
            .filter(([_, weight]) => weight >= minWeight)
            .map(([relatedTag, weight]) => ({ tag: relatedTag, weight }))
            .sort((a, b) => b.weight - a.weight);
    }
    
    /**
     * 获取统计信息
     */
    getStats() {
        if (!this.loaded) return { loaded: false };
        
        let totalEdges = 0;
        let maxDegree = 0;
        let totalDegree = 0;
        
        for (const [tag, related] of this.weightMatrix.entries()) {
            const degree = related.size;
            totalEdges += degree;
            totalDegree += degree;
            maxDegree = Math.max(maxDegree, degree);
        }
        
        return {
            loaded: true,
            totalTags: this.weightMatrix.size,
            totalEdges: totalEdges / 2, // 无向图，边数除以2
            avgDegree: (totalDegree / this.weightMatrix.size).toFixed(2),
            maxDegree,
            minWeight: this.config.minWeight,
            maxExpansion: this.config.maxExpansion
        };
    }
}

module.exports = TagExpander;