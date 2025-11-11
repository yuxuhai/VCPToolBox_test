const fs = require('fs').promises;
const fsSync = require('fs'); // 用于同步操作
const path = require('path');
const { spawn } = require('child_process');

const DB_DIR = path.join(__dirname, 'database');

// 确保数据库目录存在
async function ensureDbDirectory() {
    try {
        await fs.mkdir(DB_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating database directory:', error);
        throw error; // 抛出错误，终止执行
    }
}

// 生成人类可读的时间戳
function getReadableTimestamp() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}.${hours}.${minutes}`;
}

// 启动分析委托进程
function launchDelegate(directoryPath, analysisId, fullAnalyze = false) {
    const delegateScript = path.join(__dirname, 'AnalysisDelegate.js');
    const logFile = path.join(DB_DIR, `${analysisId}.log`);
    
    const out = fsSync.openSync(logFile, 'a');
    const err = fsSync.openSync(logFile, 'a');

    const delegateProcess = spawn('node', [
        delegateScript,
        directoryPath,
        analysisId,
        fullAnalyze ? 'full' : 'quick' // 添加分析模式参数
    ], {
        detached: true,
        stdio: ['ignore', out, err],
        windowsHide: true
    });

    // 允许父进程退出，而子进程继续运行
    delegateProcess.unref();
}

// 处理 "AnalyzeProject" 命令
async function handleAnalyzeProject(args) {
    const { directoryPath } = args;
    // 支持 fullAnalyze 和 full 两种参数键（鲁棒性优化）
    const fullAnalyze = args.fullAnalyze === true || args.fullAnalyze === 'true' ||
                        args.full === true || args.full === 'true';
    
    if (!directoryPath || typeof directoryPath !== 'string') {
        return { status: 'error', error: 'Missing or invalid "directoryPath" parameter.' };
    }

    try {
        const stats = await fs.stat(directoryPath);
        if (!stats.isDirectory()) {
            return { status: 'error', error: `The provided path is not a directory: ${directoryPath}` };
        }
    } catch (error) {
        return { status: 'error', error: `Cannot access directoryPath: ${error.message}` };
    }

    const projectName = path.basename(directoryPath);
    const timestamp = getReadableTimestamp();
    const analysisId = `${projectName}-${timestamp}`;
    
    // 启动后台分析进程，并传递分析模式
    launchDelegate(directoryPath, analysisId, fullAnalyze);

    const message = fullAnalyze
        ? `项目 **完整** 分析任务已启动。`
        : `项目 **快速** 分析任务已启动。`;

    return {
        status: 'success',
        result: `${message}\n分析ID: ${analysisId}\n你可以稍后使用 QueryAnalysis 命令查询分析报告。`
    };
}

// 从报告中提取简介和文件树部分
function extractSummaryAndTree(reportContent) {
    // 提取从开头到 "## 📝 文件详细分析" 之前的内容
    const detailSectionStart = reportContent.indexOf('## 📝 文件详细分析');
    if (detailSectionStart === -1) {
        // 如果没有找到详细分析部分，说明可能是快速分析报告，直接返回全部
        return reportContent;
    }
    return reportContent.substring(0, detailSectionStart).trim() + '\n\n---\n\n*提示：这是简化查询结果。使用 `full: true` 参数可查看完整报告。*';
}

// 从报告中搜索特定文件的分析
function searchFileInReport(reportContent, filePath) {
    const lines = reportContent.split('\n');
    const results = [];
    let currentFile = null;
    let currentContent = [];
    let inFileSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 检测文件标题行：### 📄 `文件路径`
        if (line.startsWith('### 📄 `') && line.includes('`')) {
            // 保存上一个文件的内容
            if (currentFile && currentContent.length > 0) {
                results.push({ file: currentFile, content: currentContent.join('\n') });
            }
            
            // 提取新文件路径
            const match = line.match(/### 📄 `(.+?)`/);
            if (match) {
                currentFile = match[1];
                currentContent = [line];
                inFileSection = true;
            }
        } else if (inFileSection) {
            // 检测是否到达下一个文件或结束
            if (line.startsWith('### 📄 `') || line.startsWith('## ✅')) {
                if (currentFile && currentContent.length > 0) {
                    results.push({ file: currentFile, content: currentContent.join('\n') });
                }
                currentFile = null;
                currentContent = [];
                inFileSection = false;
                i--; // 重新处理这一行
            } else {
                currentContent.push(line);
            }
        }
    }
    
    // 保存最后一个文件
    if (currentFile && currentContent.length > 0) {
        results.push({ file: currentFile, content: currentContent.join('\n') });
    }

    // 过滤匹配的文件
    if (filePath) {
        const normalizedSearch = filePath.toLowerCase().replace(/\\/g, '/');
        return results.filter(item =>
            item.file.toLowerCase().replace(/\\/g, '/').includes(normalizedSearch)
        );
    }
    
    return results;
}

// 在报告中搜索关键词
function searchKeywordInReport(reportContent, keyword) {
    const lines = reportContent.split('\n');
    const results = [];
    const contextLines = 3; // 上下文行数

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
            // 获取上下文
            const start = Math.max(0, i - contextLines);
            const end = Math.min(lines.length, i + contextLines + 1);
            const context = lines.slice(start, end).join('\n');
            
            results.push({
                lineNumber: i + 1,
                context: context,
                matchedLine: line
            });
        }
    }

    return results;
}

// 处理 "QueryAnalysis" 命令
async function handleQueryAnalysis(args) {
    // 兼容 analysisId 和 analysisID 两种写法
    const analysisId = args.analysisId || args.analysisID || args.analysis_id;
    if (!analysisId || typeof analysisId !== 'string') {
        return { status: 'error', error: 'Missing or invalid "analysisId" parameter. (Accepts: analysisId, analysisID, or analysis_id)' };
    }

    // 防止路径遍历攻击
    if (analysisId.includes('..') || analysisId.includes('/') || analysisId.includes('\\')) {
        return { status: 'error', error: 'Invalid characters in analysisId.' };
    }

    const reportPath = path.join(DB_DIR, `${analysisId}.md`);

    try {
        const reportContent = await fs.readFile(reportPath, 'utf-8');
        
        // 获取查询参数
        const full = args.full === true || args.full === 'true';
        const filePath = args.filePath || args.file_path || args.file;
        const keyword = args.keyword || args.search;

        // 1. 如果指定了文件路径，进行文件检索
        if (filePath) {
            const fileResults = searchFileInReport(reportContent, filePath);
            if (fileResults.length === 0) {
                return {
                    status: 'success',
                    result: `未在分析报告中找到匹配 "${filePath}" 的文件。\n\n提示：请检查文件路径是否正确，或该文件可能未被分析。`
                };
            }
            
            let resultText = `# 文件检索结果\n\n**分析ID:** ${analysisId}\n**搜索路径:** ${filePath}\n**匹配文件数:** ${fileResults.length}\n\n---\n\n`;
            fileResults.forEach((item, index) => {
                resultText += `## 匹配 ${index + 1}: \`${item.file}\`\n\n${item.content}\n\n---\n\n`;
            });
            
            return { status: 'success', result: resultText };
        }

        // 2. 如果指定了关键词，进行关键词检索
        if (keyword) {
            const keywordResults = searchKeywordInReport(reportContent, keyword);
            if (keywordResults.length === 0) {
                return {
                    status: 'success',
                    result: `未在分析报告中找到关键词 "${keyword}"。`
                };
            }
            
            let resultText = `# 关键词检索结果\n\n**分析ID:** ${analysisId}\n**搜索关键词:** ${keyword}\n**匹配次数:** ${keywordResults.length}\n\n---\n\n`;
            keywordResults.slice(0, 20).forEach((item, index) => { // 限制最多返回20个结果
                resultText += `## 匹配 ${index + 1} (行 ${item.lineNumber})\n\n\`\`\`\n${item.context}\n\`\`\`\n\n---\n\n`;
            });
            
            if (keywordResults.length > 20) {
                resultText += `\n*注意：共找到 ${keywordResults.length} 个匹配，仅显示前 20 个结果。*\n`;
            }
            
            return { status: 'success', result: resultText };
        }

        // 3. 如果指定了 full，返回完整报告
        if (full) {
            return { status: 'success', result: reportContent };
        }

        // 4. 默认：返回简介和文件树
        const summary = extractSummaryAndTree(reportContent);
        return { status: 'success', result: summary };

    } catch (error) {
        if (error.code === 'ENOENT') {
            return { status: 'error', error: `Analysis report with ID "${analysisId}" not found. It might still be in progress or the ID is incorrect.` };
        }
        return { status: 'error', error: `Error reading analysis report: ${error.message}` };
    }
}


// 主函数
async function main() {
    try {
        await ensureDbDirectory();

        const input = await new Promise((resolve) => {
            let data = '';
            process.stdin.on('data', chunk => data += chunk);
            process.stdin.on('end', () => resolve(data));
        });

        if (!input) {
            console.log(JSON.stringify({ status: 'error', error: 'No input received from stdin.' }));
            return;
        }

        const request = JSON.parse(input);
        const { command, ...args } = request;

        let response;
        switch (command) {
            case 'AnalyzeProject':
                response = await handleAnalyzeProject(args);
                break;
            case 'QueryAnalysis':
                response = await handleQueryAnalysis(args);
                break;
            default:
                response = { status: 'error', error: `Unknown command: ${command}` };
                break;
        }
        console.log(JSON.stringify(response));

    } catch (error) {
        console.log(JSON.stringify({ status: 'error', error: `An unexpected error occurred: ${error.message}` }));
        process.exit(1);
    }
}

main();