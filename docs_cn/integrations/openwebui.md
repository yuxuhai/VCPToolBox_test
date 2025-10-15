# 外部集成：OpenWebUI

[OpenWebUI](https://github.com/open-webui/open-webui) 是一个用户友好、功能丰富的聊天界面，兼容多种大型语言模型（LLM）API，包括OpenAI格式的API。您可以将它作为VCPToolBox的一个美观、易用的前端界面。

---

## 集成能带来什么？

使用OpenWebUI作为VCPToolBox的前端，您可以获得一个类似于ChatGPT的现代聊天体验，同时享受到VCPToolBox提供的全部后端能力，包括：

*   **插件调用**：通过聊天直接使用VCPToolBox的所有插件功能。
*   **知识库记忆**：AI能够检索您的个人知识库（DailyNote）来回答问题。
*   **多代理系统**：轻松切换不同的AI代理（Agent）进行对话。
*   **增强的显示效果**：通过我们提供的用户脚本，可以美化工具调用和图片在OpenWebUI中的显示。

---

## 如何配置集成？

### 步骤一：将VCPToolBox作为OpenWebUI的后端

1.  **启动VCPToolBox**：确保您的VCPToolBox服务正在运行。

2.  **配置OpenWebUI**：
    *   启动OpenWebUI。
    *   登录后，点击右上角的头像，选择“设置”。
    *   在“连接”设置中，将您的VCPToolBox API信息填入��
        *   **API Base URL**: `http://<您的VCPToolBox服务器IP>:6005`
        *   **API Key**: 填入您在VCPToolBox的`.env`文件中设置的`Key`。
    *   保存设置。

3.  **选择模型**：
    *   回到主界面，点击模型选择下拉菜单。
    *   您应该能看到VCPToolBox中配置的模型。选择一个即可开始对话。

### 步骤二：安装前端优化脚本（推荐）

为了在OpenWebUI中获得最佳的视觉体验，我们强烈建议您安装`OpenWebUISub/`目录下的用户脚本。

1.  **安装用户脚本管理器**：
    您需要为您的浏览器安装[Tampermonkey](https://www.tampermonkey.net/)（篡改猴）或类似的用户脚本管理器扩展。

2.  **创建新脚本**：
    打开Tampermonkey的管理面板，创建两个新的用户脚本。

3.  **复制脚本内容**：
    *   **脚本一：工具调用美化**
        *   打开VCPToolBox项目下的`OpenWebUISub/OpenWebUI VCP Tool Call Display Enhancer.user.js`文件。
        *   将其**全部内容**复制并粘贴到您在Tampermonkey中创建的第一个新脚本中。
        *   **作用**：这个脚本会识别VCPToolBox的工具调用输出，并将其渲染成一个清晰、美观的折叠框，避免工具调用的原始文本刷屏。

    *   **脚本二：图片显示增强**
        *   打开VCPToolBox项目下的`OpenWebUISub/OpenWebUI Force HTML Image Renderer with Lightbox.user.js`文件。
        *   将其**全部内容**复制并粘贴到您在Tampermonkey中创建的第二个新脚本中。
        *   **作用**：强制使用HTML的`<img>`标签来渲染图片，并提供一个点击放大查看的灯箱效果，体验远好于默认的Markdown图片显示。

4.  **保存并启用**：
    保存您在Tampermonkey中创建的两个脚本，并确保它们处于启用状态。

5.  **刷新OpenWebUI**：
    回到OpenWebUI的页面并刷新。现在，当VCPToolBox返回工具调用信息或图片时，您将看到经过美化的显示效果。

通过以上配置，OpenWebUI就成为了VCPToolBox一个功能完备且体验优秀的前端界面。
