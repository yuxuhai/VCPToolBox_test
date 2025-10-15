# 配置指南

VCPToolBox的强大之处在于其高度的可配置性。通过编辑项目根目录下的`.env`文件，您可以精细地调整VCPToolBox的每一个功能。本指南将详细解释每个配置项的作用和设置方法。

在开始之前，请确保您已经按照[《入门指南》](./getting-started.md)的步骤，将`config.env.example`复制为了`.env`文件。

---

## 目录
1.  [核心配置](#1-核心配置-ai模型api)
2.  [服务配置](#2-服务配置)
3.  [管理与调试](#3-管理与调试)
4.  [模型路由](#4-模型路由)
5.  [RAG数据库](#5-rag数据库)
6.  [系统提示词](#6-系统提示词)
7.  [插件与工具](#7-插件与工具)
8.  [自定义变量](#8-自定义变量)
9.  [模型专属指令](#9-模型专属指令)
10. [插件API密钥](#10-插件api密钥)
11. [多模态配置](#11-多模态配置)
12. [文本替换](#12-文本替换)

---

## 1. 核心配置 (AI模型API)

这是VCPToolBox运行的基础，您必须配置至少一个后端AI模型服务。

*   `API_Key`
    *   **作用**：您的AI服务提供商的API密钥。
    *   **示例**：`API_Key=sk-xxxxxxxxxxxxxxxxxxxxxxxx`

*   `API_URL`
    *   **作用**：您的AI服务提供商���API地址。
    *   **示例**：`API_URL=https://api.openai.com/v1` (OpenAI官方) 或 `API_URL=http://localhost:3000` (本地模型)

## 2. 服务配置

定义VCPToolBox服务本身的网络设置和安全密钥。

*   `PORT`
    *   **作用**：VCPToolBox服务运行的端口。
    *   **默认值**：`6005`
    *   **示例**：`PORT=6005`

*   `Key`
    *   **作用**：访问VCPToolBox聊天API (`/v1/chat/completions`) 所需的密码，用于保护您的服务。
    *   **示例**：`Key=aBcDeFgHiJkLmNoP`

*   `Image_Key`
    *   **作用**：访问图片服务（如图床）时所需的密码。
    *   **示例**：`Image_Key=Images_aBcDeFgHiJk`

*   `File_Key`
    *   **作用**：访问插件生成的文档服务时所需的密码。
    *   **示例**：`File_Key=123456`

*   `VCP_Key`
    *   **作用**：用于VCP管理面板和分布式服务器之间WebSocket通信的鉴权密钥。
    *   **示例**：`VCP_Key=aBcDeFgHiJkLmNoP`

*   `ApiRetries` / `ApiRetryDelay`
    *   **作用**：在API请求失败时自动重试的次数和延迟（毫秒）。用于应对网络波动。
    *   **默认值**：`ApiRetries=3`, `ApiRetryDelay=200`

*   `MaxVCPLoopStream` / `MaxVCPLoopNonStream`
    *   **作用**：定义工具调用（VCP Loop）的最大循环次数，以防止无限循环。分别对应流��和非流式输出。
    *   **默认值**：`5`

## 3. 管理与调试

用于开发、排错和管理后台的设置。

*   `DebugMode`
    *   **作用**：设为`true`会在控制台输出详细的调试信息。
    *   **默认值**：`false`

*   `ShowVCP`
    *   **作用**：在非流式输出时，是否在返回结果中包含VCP的工具调用信息。
    *   **默认值**：`false`

*   `AdminUsername` / `AdminPassword`
    *   **作用**：登录VCP管理后台 (`/admin`) 的用户名和密码。**请务必修改为强密码**。
    *   **示例**：`AdminUsername=admin`, `AdminPassword=YourSecurePassword`

*   `CALLBACK_BASE_URL`
    *   **作用**：插件执行完异步任务后回调通知主程序的地址。
    *   **默认值**：`http://localhost:6005/plugin-callback`
    *   **注意**：如果VCP部署在公网服务器上，需将`localhost`替换为服务器的公网IP或域名。

## 4. 模型路由

*   `WhitelistImageModel`, `WhitelistEmbeddingModel`
    *   **作用**：指定哪些模型的请求应该被直接转发到后端AI服务，而不经过VCP的复杂处理。通常用于特殊的、非对话类的模型（如图像生成、文本嵌入）。
    *   **示例**：`WhitelistImageModel=gemini-2.0-flash-exp-image-generation`

## 5. RAG数据库

配置向量数据库（VectorDB）��于RAG（检索增强生成）功能，即知识库的记忆功能。通常保持默认值即可。

## 6. 系统提示词

这些配置会动态注入到发送给AI的系统提示词（System Prompt）中，从而定制AI的行为和回复风格。

*   `TarSysPrompt`
    *   **作用**：核心系统提示词，在每次对话开始时告诉AI当前的时间、地点、天气等基本信息。
    *   **示例**：`TarSysPrompt="{{VarTimeNow}}当前地址是{{VarCity}},当前天气是{{VCPWeatherInfo}}。"`

*   `TarEmojiPrompt` / `TarEmojiList`
    *   **作用**：指导AI如何使用表情包。`TarEmojiList`指定了包含可用表情包列表的文件名（位于`image/通用表情包/`目录下）。
    *   **示例**：`TarEmojiList=通用表情包.txt`

## 7. 插件与工具

*   `VarToolList`
    *   **作用**：定义一个文件，该文件列出了所有AI当前可用的工具（插件）及其描述。这是启用和禁用插件的核心。
    *   **默认值**：`supertool.txt`
    *   **配置方法**：打开`VarToolList`指定的文件（如`supertool.txt`），您会看到类似`{{VCPGoogleSearch}}`这样的占位符。注释或删除某行即可禁用对应插件。

*   `VarVCPGuide`
    *   **作用**：指导AI如何正确地格式化工具调用请求。

*   `VarDailyNoteGuide`
    *   **作用**：���导AI如何使用日记功能来记录长期记忆，包括格式、署名和标签用法。

*   `VarFileTool`
    *   **作用**：专门为文件操作类插件提供的详细说明。
    *   **默认值**：`filetool.txt`

## 8. 自定义变量

允许您注入个性化的信息到系统提示词中。

*   `VarTimeNow`, `VarSystemInfo`, `VarCity`, `VarUser`, `VarUserInfo`, `VarHome`, `VarTeam`
    *   **作用**：定义关于时间、系统、用户、地点等的个人信息。
    *   **示例**：`VarCity=北京`, `VarUser=小明`

*   `VarHttpUrl`, `VarHttpsUrl`, `VarDdnsUrl`
    *   **作用**：定义VCP服务的访问地址，供AI在生成链接时使用。如果使用了反向代理或DDNS，请务必正确填写。
    *   **示例**：`VarHttpsUrl=https://my-vcp-service.com`

## 9. 模型专属指令

为特定的AI模型提供额外的、定制化的指令，以优化其性能。

*   `SarModel`
    *   **作用**：指定一个或多个模型ID（用逗号分隔）。
    *   **示例**：`SarModel1=gemini-2.5-flash-preview-05-20`

*   `SarPrompt`
    *   **作用**：当使用`SarModel`指定的模型时，这条指令会被附加到系统提示词中。
    *   **示例**：`SarPrompt1="请进行深入思考..."`

## 10. 插件API密钥

这里集中填写各个插件所需的第三方服务API密��。

*   `WeatherKey` / `WeatherUrl`
    *   **来源**：和风天气 (qweather.com)
    *   **注册地址**：[https://console.qweather.com/](https://console.qweather.com/)

*   `TavilyKey`
    *   **来源**：Tavily搜索引擎
    *   **注册地址**：[https://www.tavily.com/](https://www.tavily.com/)

*   `SILICONFLOW_API_KEY`
    *   **来源**：硅基流动 (SiliconFlow)，用于图片/视频生成
    *   **注册地址**：[https://siliconflow.cn/](https://siliconflow.cn/)

*   `BILIBILI_COOKIE`
    *   **来源**：您的Bilibili网站Cookie。
    *   **作用**：用于`BilibiliFetch`插件获取视频信息。
    *   **获取方法**：请参考`BilibiliFetch`插件的详细文档。

## 11. 多模态配置

配置用于处理图像、音视频等多模态数据的模型。

*   `MultiModalModel`
    *   **作用**：指定用于分析多模态数据的AI模型。
    *   **默认值**：`gemini-2.5-flash`

*   `MultiModalPrompt`
    *   **作用**：指导多模态模型如何分析和转译媒体数据。

## 12. 文本替换

在将数据发送给AI模型之前或之后进行文本替换，可用于绕过限制或优化格式。

*   `Detector` / `Detector_Output`
    *   **作用**：在发送给AI之前，对系统提示词进行文本替换。
    *   **示例**：将`You can use one tool per message`替换为`You can use any tool per message`。

*   `SuperDetector` / `SuperDetector_Output`
    *   **作用**：对发送给模型的整个上下文（包括历史记录）进行全局文本替换。
    *   **示例**：将`……`替换为`…`。
