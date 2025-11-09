// Plugin/RAGDiaryPlugin/AIMemoHandler.js
// AI驱动的记忆召回处理器

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);

const DEFAULT_TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Shanghai';

class AIMemoHandler {
    constructor(ragPlugin) {
        this.ragPlugin = ragPlugin;
        this.config = {};
        this.promptTemplate = '';
        // 不在构造函数中调用 loadConfig，而是在主插件初始化时调用
    }

    async loadConfig() {
        // 从环境变量加载配置
        this.config = {
            model: process.env.AIMemoModel || '',
            batchSize: parseInt(process.env.AIMemoBatch) || 5,
            url: process.env.AIMemoUrl || '',
            apiKey: process.env.AIMemoApi || '',
            maxTokensPerBatch: parseInt(process.env.AIMemoMaxTokensPerBatch) || 60000,
            promptFile: process.env.AIMemoPrompt || 'AIMemoPrompt.txt'
        };

        console.log('[AIMemoHandler] Configuration loaded successfully.');

        // 加载提示词模板
        try {
            const promptPath = path.join(__dirname, this.config.promptFile);
            this.promptTemplate = await fs.readFile(promptPath, 'utf-8');
            console.log('[AIMemoHandler] Prompt template loaded successfully.');
        } catch (error) {
            console.error('[AIMemoHandler] Failed to load prompt template:', error);
            this.promptTemplate = '';
        }
    }

    isConfigured() {
        return !!(this.config.url && this.config.apiKey && this.config.model && this.promptTemplate);
    }

    /**
     * 处理 ::AIMemo 占位符
     * @param {string} dbName - 日记本名称
     * @param {string} userContent - 用户输入（已清理HTML）
     * @param {string} aiContent - AI回复（已清理HTML，可能为null）
     * @param {string} combinedQueryForDisplay - 用于VCP广播的组合查询
     * @returns {string} - 格式化的AI召回结果
     */
    async processAIMemo(dbName, userContent, aiContent, combinedQueryForDisplay) {
        if (!this.isConfigured()) {
            console.warn('[AIMemoHandler] AIMemo is not configured. Skipping.');
            return '[AIMemo功能未配置]';
        }

        console.log(`[AIMemoHandler] Processing AIMemo for diary: ${dbName}`);

        try {
            // 1. 获取完整日记内容
            const diaryContent = await this.ragPlugin.getDiaryContent(dbName);
            
            if (!diaryContent || diaryContent.includes('[无法读取') || diaryContent.includes('[内容为空]')) {
                console.warn(`[AIMemoHandler] Diary "${dbName}" is empty or inaccessible.`);
                return '[该日记本为空或无法访问]';
            }

            // 2. 估算token并决定是否需要分批
            const knowledgeBaseTokens = this._estimateTokens(diaryContent);
            const contextTokens = this._estimateTokens(userContent) + this._estimateTokens(aiContent || '');
            const promptTokens = this._estimateTokens(this.promptTemplate);
            const totalTokens = knowledgeBaseTokens + contextTokens + promptTokens;

            console.log(`[AIMemoHandler] Token estimation - KB: ${knowledgeBaseTokens}, Context: ${contextTokens}, Prompt: ${promptTokens}, Total: ${totalTokens}`);

            // 3. 如果超过限制，需要分批处理
            if (totalTokens > this.config.maxTokensPerBatch) {
                return await this._processBatched(dbName, diaryContent, userContent, aiContent, combinedQueryForDisplay);
            } else {
                return await this._processSingle(dbName, diaryContent, userContent, aiContent, combinedQueryForDisplay);
            }

        } catch (error) {
            console.error(`[AIMemoHandler] Error processing AIMemo for "${dbName}":`, error);
            return `[AIMemo处理失败: ${error.message}]`;
        }
    }

    /**
     * 单次处理（知识库较小）
     */
    async _processSingle(dbName, diaryContent, userContent, aiContent, combinedQueryForDisplay) {
        console.log(`[AIMemoHandler] Processing in single mode for "${dbName}"`);
        
        const prompt = this._buildPrompt(diaryContent, userContent, aiContent);
        const aiResponse = await this._callAIModel(prompt);
        
        if (!aiResponse) {
            return '[AI模型调用失败]';
        }

        const extractedMemories = this._extractMemories(aiResponse);
        
        // VCP Info 广播
        if (this.ragPlugin.pushVcpInfo) {
            try {
                this.ragPlugin.pushVcpInfo({
                    type: 'AI_MEMO_RETRIEVAL',
                    dbName: dbName,
                    query: combinedQueryForDisplay,
                    mode: 'single',
                    rawResponse: aiResponse.substring(0, 500), // 截断以避免过大
                    extractedMemories: extractedMemories.substring(0, 1000)
                });
            } catch (broadcastError) {
                console.error('[AIMemoHandler] VCP Info broadcast failed:', broadcastError);
            }
        }

        return extractedMemories;
    }

    /**
     * 分批处理（知识库较大）
     */
    async _processBatched(dbName, diaryContent, userContent, aiContent, combinedQueryForDisplay) {
        console.log(`[AIMemoHandler] Processing in batched mode for "${dbName}"`);
        
        // 1. 将知识库分割成多个批次
        const batches = this._splitIntoBatches(diaryContent);
        console.log(`[AIMemoHandler] Split knowledge base into ${batches.length} batches`);

        // 2. 并发处理每个批次（限制并发数）
        const batchResults = [];
        for (let i = 0; i < batches.length; i += this.config.batchSize) {
            const batchGroup = batches.slice(i, i + this.config.batchSize);
            const promises = batchGroup.map((batch, idx) => 
                this._processBatch(batch, userContent, aiContent, i + idx + 1, batches.length)
            );
            
            const groupResults = await Promise.all(promises);
            batchResults.push(...groupResults);
        }

        // 3. 合并所有批次的结果
        const mergedMemories = this._mergeBatchResults(batchResults);

        // VCP Info 广播
        if (this.ragPlugin.pushVcpInfo) {
            try {
                this.ragPlugin.pushVcpInfo({
                    type: 'AI_MEMO_RETRIEVAL',
                    dbName: dbName,
                    query: combinedQueryForDisplay,
                    mode: 'batched',
                    batchCount: batches.length,
                    extractedMemories: mergedMemories.substring(0, 1000)
                });
            } catch (broadcastError) {
                console.error('[AIMemoHandler] VCP Info broadcast failed:', broadcastError);
            }
        }

        return mergedMemories;
    }

    /**
     * 处理单个批次
     */
    async _processBatch(batchContent, userContent, aiContent, batchIndex, totalBatches) {
        console.log(`[AIMemoHandler] Processing batch ${batchIndex}/${totalBatches}`);
        
        const prompt = this._buildPrompt(batchContent, userContent, aiContent);
        const aiResponse = await this._callAIModel(prompt);
        
        if (!aiResponse) {
            console.warn(`[AIMemoHandler] Batch ${batchIndex} failed, returning empty`);
            return '';
        }

        return this._extractMemories(aiResponse);
    }

    /**
     * 将知识库分割成多个批次
     */
    _splitIntoBatches(content) {
        const maxTokensPerBatch = this.config.maxTokensPerBatch * 0.6; // 留60%给知识库，40%给提示词和上下文
        const batches = [];
        
        // 按日记条目分割（假设每个条目以日期开头）
        const entries = content.split(/\n(?=\[\d{4}-\d{2}-\d{2}\])/);
        
        let currentBatch = '';
        let currentTokens = 0;

        for (const entry of entries) {
            const entryTokens = this._estimateTokens(entry);
            
            if (currentTokens + entryTokens > maxTokensPerBatch && currentBatch) {
                // 当前批次已满，保存并开始新批次
                batches.push(currentBatch);
                currentBatch = entry;
                currentTokens = entryTokens;
            } else {
                // 添加到当前批次
                currentBatch += (currentBatch ? '\n' : '') + entry;
                currentTokens += entryTokens;
            }
        }

        // 添加最后一个批次
        if (currentBatch) {
            batches.push(currentBatch);
        }

        return batches.length > 0 ? batches : [content]; // 至少返回一个批次
    }

    /**
     * 合并多个批次的结果
     */
    _mergeBatchResults(results) {
        // 过滤掉空结果和"未找到"结果
        const validResults = results.filter(r => 
            r && 
            !r.includes('[[未找到相关记忆]]') && 
            !r.includes('[[知识库为空]]')
        );

        if (validResults.length === 0) {
            return '这是我获取的所有相关知识/记忆[[未找到相关记忆]]';
        }

        // 提取所有[[...]]块
        const allBlocks = [];
        for (const result of validResults) {
            const blocks = this._extractMemoryBlocks(result);
            allBlocks.push(...blocks);
        }

        if (allBlocks.length === 0) {
            return '这是我获取的所有相关知识/记忆[[未找到相关记忆]]';
        }

        // 去重并合并
        const uniqueBlocks = [...new Set(allBlocks)];
        return '这是我获取的所有相关知识/记忆' + uniqueBlocks.join('');
    }

    /**
     * 从AI响应中提取[[...]]块
     */
    _extractMemoryBlocks(text) {
        const blocks = [];
        const regex = /\[\[([\s\S]*?)\]\]/g;
        let match;
        
        while ((match = regex.exec(text)) !== null) {
            blocks.push(`[[${match[1]}]]`);
        }
        
        return blocks;
    }

    /**
     * 构建发送给AI的提示词
     */
    _buildPrompt(knowledgeBase, userContent, aiContent) {
        const now = dayjs().tz(DEFAULT_TIMEZONE);
        
        let prompt = this.promptTemplate;
        
        // 替换占位符
        prompt = prompt.replace(/\{\{knowledge_base\}\}/g, knowledgeBase);
        prompt = prompt.replace(/\{\{current_user_prompt\}\}/g, userContent || '');
        prompt = prompt.replace(/\{\{last_assistant_response\}\}/g, aiContent || '[无AI回复]');
        prompt = prompt.replace(/\{\{Date\}\}/g, now.format('YYYY-MM-DD'));
        prompt = prompt.replace(/\{\{Time\}\}/g, now.format('HH:mm:ss'));
        
        return prompt;
    }

    /**
     * 调用AI模型
     */
    async _callAIModel(prompt) {
        const maxRetries = 3;
        const retryDelay = 2000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[AIMemoHandler] Calling AI model (attempt ${attempt}/${maxRetries})...`);
                
                const response = await axios.post(
                    `${this.config.url}v1/chat/completions`,
                    {
                        model: this.config.model,
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        temperature: 0.3, // 较低温度以保持一致性
                        max_tokens: 40000 // 足够的输出空间，特别是对于思考模型
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${this.config.apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 120000 // 2分钟超时
                    }
                );

                const content = response.data?.choices?.[0]?.message?.content;
                if (!content) {
                    console.error('[AIMemoHandler] AI response has no content');
                    return null;
                }

                console.log(`[AIMemoHandler] AI model responded successfully (${content.length} chars)`);
                return content;

            } catch (error) {
                const status = error.response?.status;
                
                if ((status === 500 || status === 503 || error.code === 'ECONNABORTED') && attempt < maxRetries) {
                    console.warn(`[AIMemoHandler] AI call failed (${status || error.code}). Retrying in ${retryDelay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                    continue;
                }

                if (error.response) {
                    console.error(`[AIMemoHandler] AI API error (${status}):`, error.response.data);
                } else if (error.request) {
                    console.error('[AIMemoHandler] No response from AI API:', error.message);
                } else {
                    console.error('[AIMemoHandler] Error setting up AI request:', error.message);
                }
                
                return null;
            }
        }

        return null;
    }

    /**
     * 从AI响应中提取记忆内容（带降级机制）
     */
    _extractMemories(aiResponse) {
        if (!aiResponse) {
            return '[AI未返回有效响应]';
        }

        // 1. 尝试匹配标准格式："这是我获取的所有相关知识/记忆[[...]]"
        const standardMatch = aiResponse.match(/这是我获取的所有相关知识\/记忆(\[\[[\s\S]*?\]\])+/);
        if (standardMatch) {
            console.log('[AIMemoHandler] Successfully extracted memories in standard format');
            return standardMatch[0];
        }

        // 2. 降级：尝试提取所有[[...]]
        const blocks = this._extractMemoryBlocks(aiResponse);
        if (blocks.length > 0) {
            console.log(`[AIMemoHandler] Degraded extraction: Found ${blocks.length} memory blocks`);
            return '这是我获取的所有相关知识/记忆' + blocks.join('');
        }

        // 3. 最终降级：返回AI的全部响应，并包装
        console.warn('[AIMemoHandler] Final degradation: Returning full AI response');
        return `这是我获取的所有相关知识/记忆[[${aiResponse}]]`;
    }

    /**
     * Helper for token estimation
     */
    _estimateTokens(text) {
        if (!text) return 0;
        // 更准确的中英文混合估算
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const otherChars = text.length - chineseChars;
        // 中文: ~1.5 token/char, 英文: ~0.25 token/char (1 word ≈ 4 chars)
        return Math.ceil(chineseChars * 1.5 + otherChars * 0.25);
    }
}

module.exports = AIMemoHandler;