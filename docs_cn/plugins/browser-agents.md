# 插件详解：浏览器与多智能体协作

这一系列的插件将VCPToolBox的能力从后端延伸到了您的桌面，实现了与浏览器的交互和多个AI代理之间的协同工作，构建起一个更智能、更主动的AI助理生态。

---

## 目录
1.  [Chrome 浏览器控制器 (ChromeControl)](#1-chrome-浏览器控制器-chromecontrol)
2.  [Chrome 浏览器观察者 (ChromeObserver)](#2-chrome-浏览器观察者-chromeobserver)
3.  [多智能体协作 (AgentAssistant)](#3-多智能体协作-agentassistant)
4.  [代理消息推送 (AgentMessage)](#4-代理消息推送-agentmessage)

---

## 1. Chrome 浏览器控制器 (ChromeControl)

*   **作用**：允许AI控制您的Chrome（或Chromium内核）浏览器，执行打开网页、切换标签页、前进、后退、刷新等操作。
*   **前置条件**：
    1.  您的Chrome浏览器需要以"远程调试模式"启动。
    2.  需要安装`VCPChrome`浏览器扩展。

#### 配置

**1. 启动Chrome远程调试模式**

*   找到您的Chrome浏览器快捷方式。
*   右键点击，选择"属性"。
*   在"目标"字段的末尾，添加一个空格，然后输入`--remote-debugging-port=9222`。
*   点击"确定"并使用此快捷方式启动Chrome。

**2. 安装VCPChrome扩展**

*   在Chrome中打开`chrome://extensions/`。
*   启用右上角的"开发者模式"。
*   点击"加载已解压的扩展程序"，选择VCPToolBox项目中的`VCPChrome`文件夹。

无需插件配置文件，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPChromeControl}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
浏览器控制：
{{VCPChromeControl}}
```

#### 使用方法

**示例指令**：
> "帮我打开GitHub首页。"

> "切换到下一个标签页。"

> "刷新一下当前页面。"

---

## 2. Chrome 浏览器观察者 (ChromeObserver)

*   **作用**：与`ChromeControl`配合使用，允许AI"看到"当前浏览器标签页的内容。它能够获取页面的文本、链接、图片等信息，并将其提供给AI进行分析和总结。
*   **前置条件**：与`ChromeControl`相同，需要Chrome处于远程调试模式并安装了`VCPChrome`扩展。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPChromeObserver}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
浏览器内容观察：
{{VCPChromeObserver}}
```

#### 使用方法

AI在需要理解网页内容时会自动调用此插件。

**示例指令**：
> "总结一下当前浏览器页面的主要内容。"

> "帮我看看这个网页上有没有关于'VCPToolBox'的链接？"

---

## 3. 多智能体协作 (AgentAssistant)

*   **作用**：这是实现多AI代理协同工作的核心插件。它允许一个主管代理（例如您的主AI）将复杂的任务分解，并分配给其他具有特定专长的专家代理去执行。例如，您可以让主AI负责统筹，然后将写代码的任务交给"程序员"代理，将画图的任务交给"画家"代理。
*   **前置条件**：您需要根据您的需求配置此插件。

#### 配置

**插件配置文件位置：** `Plugin/AgentAssistant/config.env`

```env
# AgentAssistant 插件基础配置
# 每个Agent保留的对话历史轮数（默认: 7）
AGENT_ASSISTANT_MAX_HISTORY_ROUNDS=5

# Agent对话上下文有效时间（小时，默认: 24）
AGENT_ASSISTANT_CONTEXT_TTL_HOURS=12

# --- Agent 定义 ---
# 每个 Agent 通过一组环境变量进行配置，格式为：
# AGENT_{BASENAME}_* (BASENAME使用纯ASCII字符)

# 示例 Agent 1: 研究助手
AGENT_RESEARCH_HELPER_MODEL_ID="gemini-2.5-flash-preview-05-20"
AGENT_RESEARCH_HELPER_CHINESE_NAME="ResearchBot"
AGENT_RESEARCH_HELPER_SYSTEM_PROMPT="You are {{MaidName}}, an advanced AI research assistant..."
AGENT_RESEARCH_HELPER_MAX_OUTPUT_TOKENS=8000
AGENT_RESEARCH_HELPER_TEMPERATURE=0.3

# 示例 Agent 2: 创意写作助手
AGENT_CREATIVE_WRITER_MODEL_ID="gemini-2.5-flash-preview-05-20"
AGENT_CREATIVE_WRITER_CHINESE_NAME="StorySpark"
AGENT_CREATIVE_WRITER_SYSTEM_PROMPT="You are {{MaidName}}, a creative partner..."
AGENT_CREATIVE_WRITER_MAX_OUTPUT_TOKENS=100000
AGENT_CREATIVE_WRITER_TEMPERATURE=0.8

# 示例 Agent 3: 编程助手
AGENT_CODE_ASSIST_MODEL_ID="gemini-2.5-flash-preview-05-20"
AGENT_CODE_ASSIST_CHINESE_NAME="编程小能手"
AGENT_CODE_ASSIST_SYSTEM_PROMPT="您好，我是您的AI编程助手，{{MaidName}}..."
AGENT_CODE_ASSIST_MAX_OUTPUT_TOKENS=15000
AGENT_CODE_ASSIST_TEMPERATURE=0.2
```

**配置Agent工具定义：**

1.  进入`Plugin/AgentAssistant/`目录。
2.  将`plugin-manifest.json.example`复制为`plugin-manifest.json`。
3.  在`tools`数组中，为每个专家代理定义一个工具。

**`plugin-manifest.json`示例**：

```json
{
  "tools": [
    {
      "name": "invoke_programmer_agent",
      "description": "当你需要编写、调试或解释代码时，调用此工具。他是一个专业的程序员。",
      "parameters": {
        "task_description": "需要程序员完成的具体任务描述。"
      },
      "target_agent": "编程小能手"
    },
    {
      "name": "invoke_research_agent",
      "description": "当你需要进行深度研究、分析信息时，调用此工具。",
      "parameters": {
        "task_description": "需要研究助手完成的具体任务描述。"
      },
      "target_agent": "ResearchBot"
    }
  ]
}
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPAgentAssistant}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
多智能体协作：
{{VCPAgentAssistant}}
```

#### 使用方法

向您的主AI下达一个复杂的任务，如果任务包含了您在`plugin-manifest.json`中定义的专家代理的专长领域，主AI就会自动进行任务分配。

**示例指令**：
> "请帮我写一个Python脚本来分析天气数据，并为这个脚本配上一首描绘四季变化的诗。"

在这个例子中，主AI可能会将"写Python脚本"的任务分配给编程助手，将"写诗"的任务分配给创意写作助手。

---

## 4. 代理消息推送 (AgentMessage)

*   **作用**：一个简单的工具，允许一个代理向另一个代理发送消息。这是实现代理间通信的基础。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPAgentMessage}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
代理间通信：
{{VCPAgentMessage}}
```

#### 使用方法

通常由代理在执行复杂任务时自行调用，您一般无需直接使用。

---

## 通用提示

### 浏览器与智能体协作最佳实践

1.  **浏览器控制安全提示**：
    - Chrome远程调试端口（9222）会允许本地程序完全控制浏览器
    - 建议仅在受信任的本地环境中使用
    - 不要在公共网络上暴露远程调试端口

2.  **多智能体设计建议**：
    - 为不同的专业领域设计专门的Agent（编程、写作、研究等）
    - 每个Agent使用针对性的系统提示词，提升专业性
    - 合理设置temperature参数：研究/编程用低值（0.2-0.3），创意用高值（0.7-0.9）
    - 根据任务复杂度调整MAX_OUTPUT_TOKENS

3.  **工具组合使用**：
    您可以在系统提示词中组合使用浏览器和多智能体工具：

    ```
    浏览器工具：
    - 浏览器控制：{{VCPChromeControl}}
    - 内容观察：{{VCPChromeObserver}}
    
    多智能体协作：
    {{VCPAgentAssistant}}
    {{VCPAgentMessage}}
    
    您可以控制浏览器浏览网页，分析内容，并将复杂任务分配给专业Agent处理。
    ```
