// tool_list_editor.js

(function() {
    'use strict';

    // API基础URL
    const API_BASE = '/admin_api';
    
    // 状态
    let allTools = []; // 所有可用工具
    let selectedTools = new Set(); // 已选择的工具名称
    let toolDescriptions = {}; // 自定义工具描述（工具名 -> 描述文本）
    let currentConfigFile = null; // 当前配置文件名
    let availableConfigs = []; // 可用的配置文件列表

    // DOM元素
    const elements = {
        configSelect: document.getElementById('config-file-select'),
        newConfigInput: document.getElementById('new-config-name'),
        loadConfigBtn: document.getElementById('load-config-btn'),
        createConfigBtn: document.getElementById('create-config-btn'),
        deleteConfigBtn: document.getElementById('delete-config-btn'),
        saveConfigBtn: document.getElementById('save-config-btn'),
        exportTxtBtn: document.getElementById('export-txt-btn'),
        configStatus: document.getElementById('config-status'),
        
        toolSearch: document.getElementById('tool-search'),
        showSelectedOnly: document.getElementById('show-selected-only'),
        selectAllBtn: document.getElementById('select-all-btn'),
        deselectAllBtn: document.getElementById('deselect-all-btn'),
        
        toolsList: document.getElementById('tools-list'),
        toolCount: document.getElementById('tool-count'),
        
        includeHeader: document.getElementById('include-header'),
        includeExamples: document.getElementById('include-examples'),
        copyPreviewBtn: document.getElementById('copy-preview-btn'),
        previewOutput: document.getElementById('preview-output'),
        
        loadingOverlay: document.getElementById('loading-overlay')
    };

    // 初始化
    async function init() {
        showLoading(true);
        try {
            await loadAvailableTools();
            await loadAvailableConfigs();
            attachEventListeners();
            updateToolCount();
            updatePreview();
        } catch (error) {
            console.error('初始化失败:', error);
            showStatus('初始化失败: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // 加载所有可用工具
    async function loadAvailableTools() {
        try {
            const response = await fetch(`${API_BASE}/tool-list-editor/tools`);
            if (!response.ok) throw new Error('获取工具列表失败');
            const data = await response.json();
            allTools = data.tools || [];
            renderToolsList();
        } catch (error) {
            console.error('加载工具列表失败:', error);
            throw error;
        }
    }

    // 加载可用的配置文件列表
    async function loadAvailableConfigs() {
        try {
            const response = await fetch(`${API_BASE}/tool-list-editor/configs`);
            if (!response.ok) throw new Error('获取配置文件列表失败');
            const data = await response.json();
            availableConfigs = data.configs || [];
            renderConfigSelect();
        } catch (error) {
            console.error('加载配置文件列表失败:', error);
            // 非关键错误，不抛出
        }
    }

    // 渲染配置文件下拉列表
    function renderConfigSelect() {
        // 保留"新建"选项
        elements.configSelect.innerHTML = '<option value="">-- 新建配置文件 --</option>';
        availableConfigs.forEach(config => {
            const option = document.createElement('option');
            option.value = config;
            option.textContent = config;
            elements.configSelect.appendChild(option);
        });
    }

    // 渲染工具列表
    function renderToolsList() {
        elements.toolsList.innerHTML = '';
        
        if (allTools.length === 0) {
            elements.toolsList.innerHTML = '<p style="padding: 20px; text-align: center; color: var(--text-color-secondary);">暂无可用工具</p>';
            return;
        }

        allTools.forEach(tool => {
            const toolItem = createToolItemElement(tool);
            elements.toolsList.appendChild(toolItem);
        });
    }

    // 创建工具项元素
    function createToolItemElement(tool) {
        const isSelected = selectedTools.has(tool.name);
        
        const div = document.createElement('div');
        div.className = 'tool-item' + (isSelected ? ' selected' : '');
        div.dataset.toolName = tool.name;
        
        // 头部（复选框 + 工具名称）
        const header = document.createElement('div');
        header.className = 'tool-header';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'tool-checkbox';
        checkbox.checked = isSelected;
        checkbox.addEventListener('change', () => toggleToolSelection(tool.name));
        
        const info = document.createElement('div');
        info.className = 'tool-info';
        
        const name = document.createElement('div');
        name.className = 'tool-name';
        name.textContent = tool.displayName || tool.name;
        
        const pluginName = document.createElement('div');
        pluginName.className = 'tool-plugin-name';
        pluginName.textContent = `插件: ${tool.pluginName}`;
        
        info.appendChild(name);
        info.appendChild(pluginName);
        header.appendChild(checkbox);
        header.appendChild(info);
        
        // 描述区域
        const description = document.createElement('div');
        description.className = 'tool-description';
        const currentDesc = toolDescriptions[tool.name] || tool.description || '暂无描述';
        description.textContent = currentDesc.substring(0, 200) + (currentDesc.length > 200 ? '...' : '');
        
        // 操作按钮
        const actions = document.createElement('div');
        actions.className = 'tool-actions';
        
        const editBtn = document.createElement('button');
        editBtn.textContent = '编辑说明';
        editBtn.addEventListener('click', () => editToolDescription(tool));
        
        const viewBtn = document.createElement('button');
        viewBtn.textContent = '查看完整说明';
        viewBtn.addEventListener('click', () => viewFullDescription(tool));
        
        actions.appendChild(editBtn);
        actions.appendChild(viewBtn);
        
        div.appendChild(header);
        div.appendChild(description);
        div.appendChild(actions);
        
        return div;
    }

    // 切换工具选择
    function toggleToolSelection(toolName) {
        if (selectedTools.has(toolName)) {
            selectedTools.delete(toolName);
        } else {
            selectedTools.add(toolName);
        }
        
        // 更新该工具项的显示
        const toolItem = elements.toolsList.querySelector(`[data-tool-name="${toolName}"]`);
        if (toolItem) {
            const checkbox = toolItem.querySelector('.tool-checkbox');
            checkbox.checked = selectedTools.has(toolName);
            toolItem.classList.toggle('selected', selectedTools.has(toolName));
        }
        
        updateToolCount();
        updatePreview();
        enableSaveButtons();
    }

    // 编辑工具说明
    function editToolDescription(tool) {
        const currentDesc = toolDescriptions[tool.name] || tool.description || '';
        
        const overlay = document.createElement('div');
        overlay.className = 'edit-description-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = 'edit-description-dialog';
        
        const title = document.createElement('h3');
        title.textContent = `编辑工具说明: ${tool.displayName || tool.name}`;
        
        const textarea = document.createElement('textarea');
        textarea.value = currentDesc;
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'dialog-actions';
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn-save';
        saveBtn.textContent = '保存';
        saveBtn.addEventListener('click', () => {
            toolDescriptions[tool.name] = textarea.value;
            document.body.removeChild(overlay);
            
            // 更新工具项显示
            const toolItem = elements.toolsList.querySelector(`[data-tool-name="${tool.name}"]`);
            if (toolItem) {
                const descDiv = toolItem.querySelector('.tool-description');
                const newDesc = textarea.value;
                descDiv.textContent = newDesc.substring(0, 200) + (newDesc.length > 200 ? '...' : '');
            }
            
            updatePreview();
            enableSaveButtons();
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn-cancel';
        cancelBtn.textContent = '取消';
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        actionsDiv.appendChild(saveBtn);
        actionsDiv.appendChild(cancelBtn);
        
        dialog.appendChild(title);
        dialog.appendChild(textarea);
        dialog.appendChild(actionsDiv);
        overlay.appendChild(dialog);
        
        document.body.appendChild(overlay);
        textarea.focus();
    }

    // 查看完整说明
    function viewFullDescription(tool) {
        const currentDesc = toolDescriptions[tool.name] || tool.description || '暂无描述';
        alert(`${tool.displayName || tool.name}\n\n${currentDesc}`);
    }

    // 更新工具计数
    function updateToolCount() {
        const total = allTools.length;
        const selected = selectedTools.size;
        elements.toolCount.textContent = `(总计: ${total}, 已选择: ${selected})`;
    }

    // 更新预览
    function updatePreview() {
        if (selectedTools.size === 0) {
            elements.previewOutput.value = '请先从左侧选择要包含的工具...';
            return;
        }

        const includeHeader = elements.includeHeader.checked;
        const includeExamples = elements.includeExamples.checked;
        
        let output = '';
        
        // 添加头部说明
        if (includeHeader) {
            output += 'VCP工具调用格式与指南\n\n';
            output += '<<<[TOOL_REQUEST]>>>\n';
            output += 'maid:「始」你的署名「末」, //重要字段，以进行任务追踪\n';
            output += 'tool_name:「始」工具名「末」, //必要字段\n';
            output += 'arg:「始」工具参数「末」, //具体视不同工具需求而定\n';
            output += '<<<[END_TOOL_REQUEST]>>>\n\n';
            output += '使用「始」「末」包裹参数来兼容富文本识别。\n';
            output += '主动判断当前需求，灵活使用各类工具调用。\n\n';
            output += '========================================\n\n';
        }
        
        // 为每个选中的工具生成说明
        const selectedToolsList = allTools.filter(tool => selectedTools.has(tool.name));
        selectedToolsList.forEach((tool, index) => {
            const desc = toolDescriptions[tool.name] || tool.description || '暂无描述';
            
            output += `${index + 1}. ${tool.displayName || tool.name} (${tool.name})\n`;
            output += `插件: ${tool.pluginName}\n`;
            output += `说明: ${desc}\n`;
            
            // 如果有示例且用户选择包含示例
            if (includeExamples && tool.example) {
                output += `\n示例:\n${tool.example}\n`;
            }
            
            output += '\n' + '----------------------------------------' + '\n\n';
        });
        
        elements.previewOutput.value = output;
    }

    // 启用保存按钮
    function enableSaveButtons() {
        elements.saveConfigBtn.disabled = !currentConfigFile;
        elements.exportTxtBtn.disabled = selectedTools.size === 0;
    }

    // 附加事件监听器
    function attachEventListeners() {
        // 配置文件管理
        elements.configSelect.addEventListener('change', () => {
            const value = elements.configSelect.value;
            if (value === '') {
                elements.newConfigInput.style.display = 'inline-block';
                elements.deleteConfigBtn.disabled = true;
                currentConfigFile = null;
            } else {
                elements.newConfigInput.style.display = 'none';
                elements.deleteConfigBtn.disabled = false;
            }
            enableSaveButtons();
        });
        
        elements.loadConfigBtn.addEventListener('click', loadConfig);
        elements.createConfigBtn.addEventListener('click', createNewConfig);
        elements.deleteConfigBtn.addEventListener('click', deleteConfig);
        elements.saveConfigBtn.addEventListener('click', saveConfig);
        elements.exportTxtBtn.addEventListener('click', exportToTxt);
        
        // 过滤和搜索
        elements.toolSearch.addEventListener('input', filterTools);
        elements.showSelectedOnly.addEventListener('change', filterTools);
        elements.selectAllBtn.addEventListener('click', selectAll);
        elements.deselectAllBtn.addEventListener('click', deselectAll);
        
        // 预览控制
        elements.includeHeader.addEventListener('change', updatePreview);
        elements.includeExamples.addEventListener('change', updatePreview);
        elements.copyPreviewBtn.addEventListener('click', copyPreview);
    }

    // 加载配置
    async function loadConfig() {
        const configName = elements.configSelect.value;
        if (!configName) {
            showStatus('请选择一个配置文件', 'error');
            return;
        }

        showLoading(true);
        try {
            const response = await fetch(`${API_BASE}/tool-list-editor/config/${encodeURIComponent(configName)}`);
            if (!response.ok) throw new Error('加载配置失败');
            const data = await response.json();
            
            currentConfigFile = configName;
            selectedTools = new Set(data.selectedTools || []);
            toolDescriptions = data.toolDescriptions || {};
            
            // 重新渲染工具列表以反映选择状态
            renderToolsList();
            updateToolCount();
            updatePreview();
            enableSaveButtons();
            
            showStatus('配置已加载', 'success');
        } catch (error) {
            console.error('加载配置失败:', error);
            showStatus('加载配置失败: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // 创建新配置
    async function createNewConfig() {
        // 使用prompt对话框让用户输入配置文件名
        const configName = prompt('请输入新配置文件名（只能包含字母、数字、下划线和横线）：', '');
        
        if (!configName) {
            // 用户取消了
            return;
        }
        
        const trimmedName = configName.trim();
        
        if (!trimmedName) {
            showStatus('配置文件名不能为空', 'error');
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(trimmedName)) {
            showStatus('配置文件名只能包含字母、数字、下划线和横线', 'error');
            return;
        }
        
        // 检查是否已存在
        if (availableConfigs.includes(trimmedName)) {
            const overwrite = confirm(`配置文件 "${trimmedName}" 已存在，是否覆盖？`);
            if (!overwrite) {
                return;
            }
        }

        currentConfigFile = trimmedName;
        selectedTools = new Set();
        toolDescriptions = {};
        
        renderToolsList();
        updateToolCount();
        updatePreview();
        enableSaveButtons();
        
        // 更新下拉框显示当前配置
        if (!availableConfigs.includes(trimmedName)) {
            availableConfigs.push(trimmedName);
            renderConfigSelect();
        }
        elements.configSelect.value = trimmedName;
        
        showStatus('已创建新配置: ' + trimmedName + ' (请记得点击保存)', 'success');
    }

    // 删除配置
    async function deleteConfig() {
        const configName = elements.configSelect.value;
        if (!configName) return;

        if (!confirm(`确定要删除配置文件 "${configName}" 吗？此操作不可恢复。`)) {
            return;
        }

        showLoading(true);
        try {
            const response = await fetch(`${API_BASE}/tool-list-editor/config/${encodeURIComponent(configName)}`, {
                method: 'DELETE'
            });
            if (!response.ok) throw new Error('删除配置失败');
            
            await loadAvailableConfigs();
            
            // 重置当前状态
            if (currentConfigFile === configName) {
                currentConfigFile = null;
                selectedTools = new Set();
                toolDescriptions = {};
                renderToolsList();
                updateToolCount();
                updatePreview();
                enableSaveButtons();
            }
            
            elements.configSelect.value = '';
            elements.deleteConfigBtn.disabled = true;
            
            showStatus('配置已删除', 'success');
        } catch (error) {
            console.error('删除配置失败:', error);
            showStatus('删除配置失败: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // 保存配置
    async function saveConfig() {
        if (!currentConfigFile) {
            showStatus('请先选择或创建一个配置文件', 'error');
            return;
        }

        showLoading(true);
        try {
            const configData = {
                selectedTools: Array.from(selectedTools),
                toolDescriptions: toolDescriptions
            };

            const response = await fetch(`${API_BASE}/tool-list-editor/config/${encodeURIComponent(currentConfigFile)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData)
            });
            
            if (!response.ok) throw new Error('保存配置失败');
            
            await loadAvailableConfigs();
            
            // 更新下拉列表选中项
            elements.configSelect.value = currentConfigFile;
            
            showStatus('配置已保存', 'success');
        } catch (error) {
            console.error('保存配置失败:', error);
            showStatus('保存配置失败: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // 导出为txt文件
    async function exportToTxt() {
        if (selectedTools.size === 0) {
            showStatus('请先选择至少一个工具', 'error');
            return;
        }

        const fileName = prompt('请输入要导出的文件名（不含.txt后缀）:', currentConfigFile || 'ToolList');
        if (!fileName) return;

        showLoading(true);
        try {
            const configData = {
                selectedTools: Array.from(selectedTools),
                toolDescriptions: toolDescriptions,
                includeHeader: elements.includeHeader.checked,
                includeExamples: elements.includeExamples.checked
            };

            const response = await fetch(`${API_BASE}/tool-list-editor/export/${encodeURIComponent(fileName)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configData)
            });
            
            if (!response.ok) throw new Error('导出失败');
            
            const result = await response.json();
            showStatus(`已导出到: ${result.filePath}`, 'success');
        } catch (error) {
            console.error('导出失败:', error);
            showStatus('导出失败: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // 过滤工具
    function filterTools() {
        const searchTerm = elements.toolSearch.value.toLowerCase();
        const showSelectedOnly = elements.showSelectedOnly.checked;
        
        const toolItems = elements.toolsList.querySelectorAll('.tool-item');
        toolItems.forEach(item => {
            const toolName = item.dataset.toolName;
            const tool = allTools.find(t => t.name === toolName);
            if (!tool) return;
            
            const matchesSearch = !searchTerm || 
                tool.name.toLowerCase().includes(searchTerm) ||
                (tool.displayName && tool.displayName.toLowerCase().includes(searchTerm)) ||
                (tool.description && tool.description.toLowerCase().includes(searchTerm));
            
            const matchesSelection = !showSelectedOnly || selectedTools.has(toolName);
            
            item.classList.toggle('hidden', !(matchesSearch && matchesSelection));
        });
    }

    // 全选
    function selectAll() {
        allTools.forEach(tool => selectedTools.add(tool.name));
        renderToolsList();
        updateToolCount();
        updatePreview();
        enableSaveButtons();
        filterTools();
    }

    // 取消全选
    function deselectAll() {
        selectedTools.clear();
        renderToolsList();
        updateToolCount();
        updatePreview();
        enableSaveButtons();
        filterTools();
    }

    // 复制预览内容
    function copyPreview() {
        elements.previewOutput.select();
        document.execCommand('copy');
        showStatus('已复制到剪贴板', 'success');
    }

    // 显示状态消息
    function showStatus(message, type = 'info') {
        elements.configStatus.textContent = message;
        elements.configStatus.className = 'status-message ' + type;
        
        setTimeout(() => {
            elements.configStatus.textContent = '';
            elements.configStatus.className = 'status-message';
        }, 5000);
    }

    // 显示/隐藏加载遮罩
    function showLoading(show) {
        elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
