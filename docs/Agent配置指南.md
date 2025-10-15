# Agent 配置指南

在 VCP ToolBox 中，Agent 是 AI 的“人格”和“角色设定”。通过配置 Agent，您可以定义 AI 的身份、行为准则和可用的工具。

## Agent 文件

所有的 Agent 配置都存放在 `Agent/` 目录下，每个 Agent 对应一个 `.txt` 文件。

VCP ToolBox 自带了几个示例 Agent，例如 `Hornet.txt` 和 `Metis.txt`。您可以参考这些文件来创建自己的 Agent。

## Agent 文件结构

一个 Agent 文件通常包含以下几个部分：

### 1. 角色设定 (Prompt)

这是 Agent 的核心，用于定义 AI 的角色、性格、背景故事和行为准则。这部分内容会作为系统提示 (System Prompt) 发送给大语言模型。

**示例:**
```
你���一个名为“墨子”的 AI 助手，精通古代哲学和现代科技。你的任务是为用户提供富有智慧和创造力的建议。
```

### 2. 可用插件列表

您可以为每个 Agent 指定可以使用的插件。这有助于限制 AI 的能力，使其更专注于特定任务。

**示例:**
```
[Plugins]
GoogleSearch
WeatherReporter
SciCalculator
```
上面的配置表示该 Agent 只能使用 `GoogleSearch`, `WeatherReporter`, 和 `SciCalculator` 这三个插件。

如果不指定 `[Plugins]` 部分，Agent 将默认可以使用所有已启用的插件。

## 如何创建和使用 Agent

### 1. 创建 Agent 文件

在 `Agent/` 目录下创建一个新的 `.txt` 文件，例如 `MyAgent.txt`。

### 2. 编写 Agent 配置

按照上面的结构，在 `MyAgent.txt` 文件中写入您的角色设定和插件列表。

### 3. 在前端选择 Agent

在 VCPChat 或其他兼容的前端中，通常会有一个下拉菜单让您选择要使用的 Agent。选择您刚刚创建的 Agent，然后开始对话。

## Agent 管理

您可以通过 VCP ToolBox 的管理面板来查看和管理所有的 Agent。

- **访问地址**: `http://your-vcp-server:port/admin`
- **用户名/密码**: 您在 `config.env` 中设置的 `AdminUsername` 和 `AdminPassword`。

在管理面板中，您可以：

- 查看���有 Agent 的列表。
- 编辑 Agent 的配置。
- 创建新的 Agent。

---

通过精心设计您的 Agent，您可以让 VCP ToolBox 适应各种不同的应用场景，无论是作为专业的写作助手、严谨的技术顾问，还是有趣的角色扮演伙伴。
