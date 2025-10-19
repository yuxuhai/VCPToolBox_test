const fs = require('fs').promises;
const path = require('path');
const chokidar = require('chokidar');
const axios = require('axios');
const lockFile = require('proper-lockfile');

// --- 全局变量 ---
let pluginConfig = {};
let projectBasePath = '';
let dailyNoteDir = '';
let timelineDir = ''; // 用于存放 .json 归档文件
let tvsTxtDir = ''; // 用于存放 .txt timeline 文件
let watcher = null;
const summaryQueue = [];
let isProcessingQueue = false;
let isInitialScan = true;
const initialScanQueue = [];

// --- 插件生命周期函数 ---

async function initialize(config, dependencies) {
    pluginConfig = config;
    
    // ✅ 验证必需的配置
    if (!config.PROJECT_BASE_PATH) {
        console.error('[TimelineGenerator] PROJECT_BASE_PATH is not configured! Initialization aborted.');
        throw new Error('PROJECT_BASE_PATH is required for TimelineGenerator');
    }
    
    projectBasePath = config.PROJECT_BASE_PATH;
    dailyNoteDir = path.join(projectBasePath, 'dailynote');
    timelineDir = path.join(projectBasePath, 'timeline');
    tvsTxtDir = path.join(projectBasePath, 'TVStxt');

    console.log('[TimelineGenerator] Initializing...');
    console.log(`[TimelineGenerator] Using base path: ${projectBasePath}`);
    if (pluginConfig.DebugMode) {
        console.log('[TimelineGenerator] Config loaded:', {
            ...pluginConfig,
            API_Key: pluginConfig.API_Key ? 'Loaded' : 'Not Found',
            SUMMARY_SYSTEM_PROMPT: (pluginConfig.SUMMARY_SYSTEM_PROMPT || '').substring(0, 50) + '...'
        });
    }

    try {
        // 确保两个目标目录都存在
        await fs.mkdir(timelineDir, { recursive: true });
        await fs.mkdir(tvsTxtDir, { recursive: true });
        console.log(`[TimelineGenerator] Ensured timeline directories exist.`);
        
        // 新增：在启动时检查并重新处理之前失败的条目
        await reprocessFailedSummaries();

        setupWatcher();
    } catch (error) {
        console.error('[TimelineGenerator] Initialization failed:', error);
    }
}

// 新增：重新处理失败的摘要
async function reprocessFailedSummaries() {
    console.log('[TimelineGenerator] Checking for previously failed summaries to reprocess...');
    try {
        const files = await fs.readdir(timelineDir);
        const jsonFiles = files.filter(f => f.endsWith('.json'));

        for (const jsonFile of jsonFiles) {
            const archivePath = path.join(timelineDir, jsonFile);
            try {
                const content = await fs.readFile(archivePath, 'utf-8');
                const archiveData = JSON.parse(content);
                if (archiveData.processedEntries && Array.isArray(archiveData.processedEntries)) {
                    const maxRetries = pluginConfig.MAX_RETRY_ATTEMPTS || 3;
                    const fallbacksToRetry = archiveData.processedEntries.filter(e =>
                        e.status === 'fallback' && (e.retryCount || 0) < maxRetries
                    );

                    if (fallbacksToRetry.length > 0) {
                        console.log(`[TimelineGenerator] Found ${fallbacksToRetry.length} fallback entries in ${jsonFile} to reprocess (max retries: ${maxRetries}).`);
                        for (const entry of fallbacksToRetry) {
                            // 兼容新旧两种路径格式
                            const absoluteFilePath = path.isAbsolute(entry.filePath)
                                ? entry.filePath
                                : path.join(projectBasePath, entry.filePath);
                            
                            try {
                                await fs.access(absoluteFilePath);
                                addToQueue(absoluteFilePath);
                            } catch (accessError) {
                                console.warn(`[TimelineGenerator] Fallback file ${absoluteFilePath} no longer exists. Skipping reprocessing.`);
                            }
                        }
                    }
                }
            } catch (e) {
                console.error(`[TimelineGenerator] Error processing archive file ${jsonFile} for reprocessing:`, e);
            }
        }
    } catch (e) {
        console.error('[TimelineGenerator] Error reading timeline directory for reprocessing:', e);
    }
}

async function shutdown() {
    console.log('[TimelineGenerator] Shutting down...');
    if (watcher) {
        await watcher.close();
        console.log('[TimelineGenerator] Chokidar watcher stopped.');
    }
    summaryQueue.length = 0;
    initialScanQueue.length = 0;
}

// --- 文件监控与队列管理 ---

function setupWatcher() {
    console.log(`[TimelineGenerator] Setting up watcher for directory: ${dailyNoteDir}`);
    
    const ignoredPaths = [
        /.*已整理.*/,
        /.*簇$/,
        /.*MusicDiary.*/
    ];

    watcher = chokidar.watch(dailyNoteDir, {
        // **FIX:** 直接传递正则表达式数组，而不是函数
        ignored: ignoredPaths,
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        },
        depth: 99
    });

    watcher
        .on('add', filePath => {
            const fileExtension = path.extname(filePath).toLowerCase();
            if (fileExtension === '.txt' || fileExtension === '.md') {
                if (isInitialScan) {
                    initialScanQueue.push(filePath);
                } else {
                    console.log(`[TimelineGenerator] New diary file detected: ${path.basename(filePath)}`);
                    addToQueue(filePath);
                }
            }
        })
        .on('ready', async () => {
            console.log(`[TimelineGenerator] Initial scan complete. Found ${initialScanQueue.length} existing files to process.`);
            isInitialScan = false;
            
            for (const filePath of initialScanQueue) {
                addToQueue(filePath);
            }
            initialScanQueue.length = 0;
            
            console.log('[TimelineGenerator] Finished processing initial files. Now monitoring for new changes...');
        })
        .on('error', error => console.error(`[TimelineGenerator] Watcher error: ${error}`));
}

function addToQueue(filePath) {
    if (!summaryQueue.includes(filePath)) {
        summaryQueue.push(filePath);
        if (pluginConfig.DebugMode) console.log(`[TimelineGenerator] Added to queue: ${path.basename(filePath)}. Queue size: ${summaryQueue.length}`);
        processSummaryQueue();
    }
}

async function processSummaryQueue() {
    if (isProcessingQueue) return;
    isProcessingQueue = true;

    if (pluginConfig.DebugMode) console.log(`[TimelineGenerator] Starting to process summary queue. Current size: ${summaryQueue.length}`);

    while (summaryQueue.length > 0) {
        const batchSize = pluginConfig.MAX_SUMMARY_QUEUE || 10;
        const batch = summaryQueue.splice(0, batchSize);
        
        if (pluginConfig.DebugMode) console.log(`[TimelineGenerator] Processing batch of ${batch.length} files.`);

        const processingPromises = batch.map(filePath => processFile(filePath).catch(e => {
            console.error(`[TimelineGenerator] Unhandled error in processFile for ${path.basename(filePath)}:`, e);
        }));
        
        await Promise.all(processingPromises);
    }

    isProcessingQueue = false;
    if (pluginConfig.DebugMode) console.log('[TimelineGenerator] Summary queue is empty. Awaiting new files.');
}

// --- 核心处理逻辑 ---

async function processFile(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf-8');
        if (content.length < (pluginConfig.MIN_CONTENT_LENGTH || 100)) {
            if (pluginConfig.DebugMode) console.log(`[TimelineGenerator] Skipping short file: ${path.basename(filePath)}`);
            return;
        }

        const firstLine = content.split('\n')[0].trim();
        const match = firstLine.match(/^(?:\[(\d{4}[\.\-]\d{1,2}[\.\-]\d{1,2})\]\s*-\s*(.+)|(\d{4}[\.\-]\d{1,2}[\.\-]\d{1,2})-(.+))$/);
        if (!match) {
            if (pluginConfig.DebugMode) console.log(`[TimelineGenerator] Skipping file with invalid first line format: ${path.basename(filePath)}`);
            return;
        }
        
        const rawDate = match[1] || match[3];
        const dateStr = rawDate.replace(/\./g, '-');
        const characterName = (match[2] || match[4]).trim();

        const archivePath = path.join(timelineDir, `${characterName}timeline.json`);
        let archiveData = { processedEntries: [] };
        try {
            const archiveContent = await fs.readFile(archivePath, 'utf-8');
            archiveData = JSON.parse(archiveContent);
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        const relativeFilePath = path.relative(projectBasePath, filePath);
        const existingEntry = archiveData.processedEntries.find(e => e.filePath === relativeFilePath);

        if (existingEntry && existingEntry.status === 'summarized') {
            if (pluginConfig.DebugMode) console.log(`[TimelineGenerator] File already successfully summarized, skipping: ${path.basename(filePath)}`);
            return;
        }

        console.log(`[TimelineGenerator] Processing for [${characterName}] on [${dateStr}] from file ${path.basename(filePath)}`);

        const originalContent = content.substring(content.indexOf('\n') + 1).trim();
        
        // 如果是重试，先检查人工干预
        if (existingEntry && existingEntry.status === 'fallback') {
            const timelineFilePath = path.join(timelineDir, `${characterName}timeline.txt`);
            try {
                const timelineContent = await fs.readFile(timelineFilePath, 'utf-8');
                if (!timelineContent.includes(originalContent)) {
                    console.log(`[TimelineGenerator] Manual edit detected for ${relativeFilePath}. Marking as summarized.`);
                    await updateArchiveJson(archivePath, archiveData, relativeFilePath, 'summarized');
                    return; // 结束处理
                }
            } catch (e) {
                // timeline文件不存在，继续正常处理
            }
        }

        let summary = await getSummaryFromAPI(content);
        let summaryStatus = 'summarized';

        if (!summary) {
            summaryStatus = 'fallback';
            console.warn(`[TimelineGenerator] Failed to get summary for: ${path.basename(filePath)}. Using original content as fallback.`);
            summary = originalContent;
        }

        if (summary) {
            try {
                await updateTimelineFile(characterName, dateStr, summary, originalContent, summaryStatus, existingEntry);
                // 如果写入成功，正常更新JSON状态
                await updateArchiveJson(archivePath, archiveData, relativeFilePath, summaryStatus);
                const action = existingEntry ? 'updated' : 'added';
                console.log(`[TimelineGenerator] Successfully ${action} timeline entry for [${characterName}] with status [${summaryStatus}].`);
            } catch (error) {
                if (error.code === 'ELOCKED') {
                    console.warn(`[TimelineGenerator] File lock failed for ${path.basename(filePath)}. Marking for retry on next startup.`);
                    // 如果是锁错误，将状态更新为 'fallback'，以便下次启动时重试
                    await updateArchiveJson(archivePath, archiveData, relativeFilePath, 'fallback');
                } else {
                    // 对于其他类型的错误，则向上抛出
                    throw error;
                }
            }
        } else {
            console.warn(`[TimelineGenerator] Skipping entry for ${path.basename(filePath)} due to empty content after fallback.`);
        }

    } catch (error) {
        console.error(`[TimelineGenerator] Error processing file ${path.basename(filePath)}:`, error);
    }
}

async function getSummaryFromAPI(diaryContent) {
    const apiUrl = pluginConfig.API_URL;
    const apiKey = pluginConfig.API_Key;
    const retries = pluginConfig.MAX_RETRY_ATTEMPTS || 3;

    if (!apiUrl || !apiKey) {
        console.error('[TimelineGenerator] API_URL or API_Key is not configured!');
        return null;
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
    };

    const body = {
        model: pluginConfig.SUMMARY_MODEL || 'gemini-2.5-flash-lite-preview-09-2025-thinking',
        messages: [
            { role: 'system', content: pluginConfig.SUMMARY_SYSTEM_PROMPT },
            { role: 'user', content: diaryContent }
        ],
        max_tokens: pluginConfig.SUMMARY_MAX_TOKENS || 32768,
        stream: false
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(`${apiUrl}/v1/chat/completions`, body, { headers, timeout: 30000 });
            const text = response.data.choices[0].message.content;
            const summaryMatch = text.match(/<<<summary>>>(.*?)<<<\s*\/?\s*summary\s*>>>/si);
            if (summaryMatch && summaryMatch[1]) {
                return summaryMatch[1].trim();
            }
            console.warn('[TimelineGenerator] API response did not contain a valid summary tag.', text);
            return null;
        } catch (error) {
            console.error(`[TimelineGenerator] API call failed (attempt ${attempt}/${retries}):`, error.response ? error.response.data : error.message);
            if (attempt === retries) return null;
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
    }
    return null;
}

async function updateTimelineFile(characterName, dateStr, newContent, originalContent, status, existingEntry) {
    const timelineFilePath = path.join(timelineDir, `${characterName}timeline.txt`);
    
    try {
        await fs.appendFile(timelineFilePath, '');
    } catch (e) {
        // Ignore
    }

    const release = await lockFile.lock(timelineFilePath).catch(err => {
        console.error(`[TimelineGenerator] Failed to acquire lock for ${timelineFilePath}`);
        throw err;
    });

    try {
        let content = '';
        try {
            content = await fs.readFile(timelineFilePath, 'utf-8');
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        const isUpdate = existingEntry && status === 'summarized';
        
        if (isUpdate) {
            // --- 更新（替换）逻辑 ---
            content = content.replace(originalContent, newContent);
        } else if (!existingEntry) {
            // --- 新增逻辑 ---
            const dateHeader = `## ${dateStr}`;
            const newEntryLine = `- ${newContent}\n`;
            if (content.includes(dateHeader)) {
                const lines = content.split('\n');
                let lastLineOfDate = -1;
                let inDateBlock = false;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim() === dateHeader) inDateBlock = true;
                    else if (inDateBlock && lines[i].trim().startsWith('## ')) break;
                    if (inDateBlock) lastLineOfDate = i;
                }
                lines.splice(lastLineOfDate + 1, 0, newEntryLine.trim());
                content = lines.join('\n');
            } else {
                content += `\n${dateHeader}\n${newEntryLine}`;
            }
        }
        // 如果是 isUpdate=false 且 existingEntry=true，说明是第一次写入fallback，逻辑同新增
        else if (!isUpdate && existingEntry) {
             const dateHeader = `## ${dateStr}`;
            const newEntryLine = `- ${newContent}\n`;
            if (content.includes(dateHeader)) {
                const lines = content.split('\n');
                let lastLineOfDate = -1;
                let inDateBlock = false;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim() === dateHeader) inDateBlock = true;
                    else if (inDateBlock && lines[i].trim().startsWith('## ')) break;
                    if (inDateBlock) lastLineOfDate = i;
                }
                lines.splice(lastLineOfDate + 1, 0, newEntryLine.trim());
                content = lines.join('\n');
            } else {
                content += `\n${dateHeader}\n${newEntryLine}`;
            }
        }


        // 更新Header
        if (!content.includes('# ')) {
            const header = `# ${characterName}的时间线\n\n> 最后更新：${new Date().toISOString()}  \n> 总条目数：1  \n> 数据源：VCP TimelineGenerator v1.0\n\n---\n`;
            content = header + content.trim();
        } else {
            const entryCount = (content.match(/^- /gm) || []).length;
            content = content.replace(/> 最后更新：.*/, `> 最后更新：${new Date().toISOString()}`);
            content = content.replace(/> 总条目数：.*/, `> 总条目数：${entryCount}`);
        }
        
        await fs.writeFile(timelineFilePath, content, 'utf-8');

    } finally {
        await release();
    }
}

async function updateArchiveJson(archivePath, archiveData, relativeFilePath, status) {
    if (!archiveData.processedEntries) {
        archiveData.processedEntries = [];
    }

    const entryIndex = archiveData.processedEntries.findIndex(e => e.filePath === relativeFilePath);

    if (entryIndex > -1) {
        const entry = archiveData.processedEntries[entryIndex];
        entry.status = status;
        entry.lastUpdated = new Date().toISOString();
        if (status === 'fallback') {
            entry.retryCount = (entry.retryCount || 0) + 1;
        } else if (status === 'summarized') {
            entry.retryCount = 0;
        }
    } else {
        archiveData.processedEntries.push({
            filePath: relativeFilePath,
            status: status,
            firstProcessed: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            retryCount: status === 'fallback' ? 1 : 0
        });
    }

    await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2), 'utf-8');
}

module.exports = {
    initialize,
    shutdown
};