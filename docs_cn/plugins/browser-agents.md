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
    1.  您的Chrome浏览器需要以“远程调试模式”启动。
    2.  需要安装`VCPChrome`浏览器扩展。

#### 配置

1.  **启动Chrome远程调试模式**：
    *   找到您的Chrome浏览器快捷方式。
    *   右键点击，选择“属性”。
    *   在“目标”字段的末尾，添加一个空格，然后输入`--remote-debugging-port=9222`。
    *   点击“确定”并使用此快捷方式启动Chrome。
2.  **安装VCPChrome扩展**：
    *   在Chrome中打开`chrome://extensions/`。
    *   启用右上角的“开发者模式”。
    *   点击“加载已解压的扩展程序”，选择VCPToolBox项目中的`VCPChrome`文件夹。
3.  **插件配置**：
    *   在`TVStxt/supertool.txt`中，确保`{{VCPChromeControl}}`行没有被注释。

#### 使用方法

**示例指令**：
> “帮我打开GitHub首页。”

> “切换到下一个标签页。”

> “刷新一下当前页面。”

---

## 2. Chrome 浏览器观察者 (ChromeObserver)

*   **作用**：与`ChromeControl`配合使用，允许AI“看到”当前浏览器标签页的内容。它能够获取页面的文本、链接、图片等信息，并将其提供给AI进行分析和总结。
*   **前置条件**：与`ChromeControl`相同，需要Chrome处于远程调试模式并安装了`VCPChrome`扩展。

#### 配置

*   在`TVStxt/supertool.txt`中，确保`{{VCPChromeObserver}}`行没有被注释。

#### 使用方法

AI在需要理解网页内容时会自动调用此插件。

**示例指令**：
> “总结一下当前浏览器页面的主要内容。”

> “帮我看看这个网页上有没有关于‘VCPToolBox’的链接？”

---

## 3. ���智能体协作 (AgentAssistant)

*   **作用**：这是实现多AI代理协同工作的核心插件。它允许一个主管代理（例如您的主AI）将复杂的任务分解，并分配给其他具有特定专长的专家代理去执行。例如，您可以让主AI负责统筹，然后将写代码的任务交给“程序员”代理，将画图的任务交给“画家”代理。
*   **前置条件**：您需要根据您的需求，手动创建并配置此插件的`plugin-manifest.json`文件。

#### 配置

1.  进入`Plugin/AgentAssistant/`目录。
2.  将`plugin-manifest.json.example`复制为`plugin-manifest.json`。
3.  使用文本编辑器打开`plugin-manifest.json`。
4.  在`tools`数组中，为您希望启用的每一个专家代理定义一个工具。您需要指定：
    *   `name`: 工具的唯一名称，例如`invoke_coder_agent`。
    *   `description`: 对这个专家代理能力的描述，以便主AI知道何时调用它。
    *   `parameters`: 定义调用时需要传递的参数，通常是`task_description`（任务描述）。
    *   `target_agent`: **最关键的一项**，指定这个工具将调用哪一个专家代理的名称（该名称必须是在`Agent/`目录下定义的代理）。

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
      "target_agent": "ProgrammerAgent"
    },
    {
      "name": "invoke_artist_agent",
      "description": "当你需要创作故事、诗歌或进行头脑风暴时，调用此工具。他是一个富有创造力的艺术家。",
      "parameters": {
        "task_description": "需要艺术家完成的具体创意任务。"
      },
      "target_agent": "ArtistAgent"
    }
  ]
}
```
*   在`TVStxt/supertool.txt`中，确保`{{VCPAgentAssistant}}`行没有被注释。

#### 使用方法

向您的主AI下达一个复杂的任务，如果任务包含了您在`plugin-manifest.json`中定义的专家代理的专长领域，主AI就会自动进行任务分配。

**示例指令**：
> “请帮我写一个Python脚本来分析天气数据，并为这个脚本配上一首描绘四季变化的诗。”

在这个例子中，主AI可能会将“写Python脚本”的任务分配给`ProgrammerAgent`，将“写诗”的任务分配给`ArtistAgent`。

---

## 4. 代理消息推送 (AgentMessage)

*   **作用**：一个简单的工具，允许一个代理��另一个代理发送消息。这是实现代理间通信的基础。
*   **前置条件**：无。开箱即用。

#### 配置

*   在`TVStxt/supertool.txt`中，确保`{{VCPAgentMessage}}`行没有被注释。

#### 使用方法

通常由代理在执行复杂任务时自行调用，您一般无需直接使用。
