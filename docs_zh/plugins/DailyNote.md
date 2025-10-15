# 插件: 日记系统 (DailyNote)

VCP ToolBox 的日记系统是一个强大的长期记忆解决方案，它允许 AI 记录、检索、编辑和管理对话中的关键信息。该系统由一组协同工作的插件构成，共同实现了完整的记忆功能。

这组插件包括：
-   **日记写入器 (`DailyNoteWrite`)**: 用于创建新的日记条目。
-   **日记内容获取器 (`DailyNoteGet`)**: 用于检索和阅读现有的日记。
-   **日记内容编辑器 (`DailyNoteEditor`)**: 用于修改和更新现有的日记。
-   **日记整理器 (`DailyNoteManager`)**: 用于管理日记文件，如列表、搜索等。

## 功能

-   **长期记忆**: 将对话中的重要信息、学习到的知识和反思以结构化的形式保存下来。
-   **RAG 集成**: 日记内容会被向量化，并存储在向量数据库中，支持通过语义相似度进行智能检索 (Retrieval-Augmented Generation)。
-   **分类管理**: 支持使用标签 (`[Tag]`) 将日记分类存储在不同的文件夹中，实现知识库的共享和隔离。
-   **灵活调用**: AI 可以根据对话内容自主决定何时写入、读取或编辑日记。

## 配置

日记系统插件开箱即用，无需在 `config.env` 文件中进行额外配置。

但是，您可以通过 `config.env` 中的 `VarDailyNoteGuide` 变量来指导 AI 如何更好地使用日记功能。

### `config.env` 示例

```
# VarDailyNoteGuide: 指导AI如何使用日记功能来记录长期记忆。
VarDailyNoteGuide='本客户端已经搭载长期记忆功能，你可以在聊天一段时间后，通过在回复的末尾添加如下结构化内容来创建日记...（此处省略详细提示词）...'
```
这个提示词非常关键，它为 AI 提供了详细的日记写入格式和最佳实践。

## 使用方法

1.  **启用插件**: 在您的工具列表文件 (例如 `supertool.txt`) 中，确保以下插件的占位符都已添加：
    -   `{{VCPDailyNoteWrite}}`
    -   `{{VCPDailyNoteGet}}`
    -   `{{VCPDailyNoteEditor}}`
    -   `{{VCPDailyNoteManager}}`
2.  **重启 VCP**: 重启 VCP ToolBox 服务。

AI 现在就可以使用完整的日记功能了。

## AI 调用示例

### 1. 写入日记 (`DailyNoteWrite`)

当 AI 认为对话中产生了有价值的信息时，它会在回复的末尾附加上一个特殊的结构化文本块来创建日记。

**AI**:
```
...（正常的对话内容）...

<<<DailyNoteStart>>>
Maid: 小绝
Date: 2025.10.08 
Content:
今日与莱恩主人讨论并优化了VCP日记库的提示词。
核心问题：原提示词导致日记过于简略，易丢失关键逻辑链条。
优化目标：提升日记的“信息密度”，服务于未来通过向量RAG系统进行的精准检索。
<<<DailyNoteEnd>>>
```

-   **`Maid`**: 署名，决定了日记存储在哪个文件夹下。例如，`小绝` 会存入 `dailynote/小绝/` 目录。
-   **`Date`**: 日记的日期。
-   **`Content`**: 日记的正文内容。

#### 使用标签进行分类

AI 还可以使用 `[Tag]` 语法来指定存储的文件夹。

-   `Maid: [公共]小克`: 将日记存入 `dailynote/公共/` 文件夹，文件名为 `小克.md`，实现了知识的共享。
-   `Maid: [小克的知识]小克`: 将日记存入 `dailynote/小克的知识/` 文件夹，用于构建私有知识库。

### 2. 获取/编辑/管理日记

对于获取、编辑和管理操作，AI 会调用对应的工具。

**用户**: "帮我找找上次我们讨论日记优化的记录。"

**AI (可能会调用 `DailyNoteGet` 或 `DailyNoteManager`)**:
```
<<<[TOOL_REQUEST]>>>
maid:「始」助手「末」
tool_name:「始」DailyNoteManager「末」
action:「始」search「末」
query:「始」日记优化「末」
<<<[END_TOOL_REQUEST]>>>
```
在获取到搜索结果后，AI 会进一步调用 `DailyNoteGet` 来读取具体内容，或调用 `DailyNoteEditor` 来进行修改，最后将结果反馈给用户。
