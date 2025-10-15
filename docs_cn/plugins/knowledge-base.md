# 插件详解：个人知识库与日记

VCPToolBox的个人知识库（也称为DailyNote系统）是其核心功能之一，旨在成为您的“第二大脑”。这些插件与位于`dailynote/`目录下的文件深度集成，让AI能够记录长期记忆、管理您的笔记，并通过检索增强生成（RAG）技术，在对话中利用您自己的知识。

---

## 目录
1.  [日记写入器 (DailyNoteWrite)](#1-日记写入器-dailynotewrite)
2.  [日记内容编辑器 (DailyNoteEditor)](#2-日记内容编辑器-dailynoteeditor)
3.  [日记整理器 (DailyNoteManager)](#3-日记整理器-dailynotemanager)
4.  [日记内容获取 (DailyNoteGet)](#4-日记内容获取-dailynoteget)
5.  [RAG日记检索 (RAGDiaryPlugin)](#5-rag日记检索-ragdiaryplugin)
6.  [FlashDeep 深度检索 (FlashDeepSearch)](#6-flashdeep-深度检索-flashdeepsearch)
7.  [Karakeep 知识库检索 (KarakeepSearch)](#7-karakeep-知识库检索-karakeepsearch)
8.  [IMAP 邮件索引 (IMAPIndex)](#8-imap-邮件索引-imapindex)
9.  [IMAP 邮件搜索 (IMAPSearch)](#9-imap-邮件搜索-imapsearch)
10. [语义组编辑器 (SemanticGroupEditor)](#10-语义组编辑器-semanticgroupeditor)
11. [思维簇管理器 (ThoughtClusterManager)](#11-思维簇管理器-thoughtclustermanager)
12. [**高级配置：打造个性化大脑**](#12-高级配置打造个性化大脑)

---

## 1. 日记写入器 (DailyNoteWrite)

*   **作用**：这是将信息存入知识库最基础的插件。它允许AI根据特定格式，将对话中的关键信息、学习到的新知识或您的思考总结，自动创建或追加到日记文件中。
*   **前置条件**：无。开箱即用。

#### 配置

*   在`.env`文件中，`VarDailyNoteGuide`变量定义了指导AI如何书写日记的详细说明，包括格式、署名和标签用法。您可以根据自己的偏好修改这段指导语。
*   在`TVStxt/supertool.txt`中，确保`{{VCPDailyNoteWrite}}`行没有被注释。

#### 使用方法

AI会在认为有价值的信息产生时（例如，一次深入讨论后、学习了新概念后），自动在回复的末尾附上符合`VarDailyNoteGuide`指导格式的日记内容。VCPToolBox后端会自动捕捉并保存这些内容。

**日记格式示例**：
```
<<<DailyNoteStart>>>
Maid: [学习笔记]小绝
Date: 2025.10.15
Content:
今天学习了VCPToolBox的日记插件系统。
- DailyNoteWrite: 基础写入器，用于创建新日记。
- DailyNoteEditor: 用于修改现有日记。
- DailyNoteManager: 用于移动、删除、合并日记。
- RAGDiaryPlugin: 核心检索插件，让AI能“回忆”日记内容。
这个系统构成了VCPToolBox的长期记忆核心。
<<<DailyNoteEnd>>>
```
*   **署名与标签**：`Maid: [学习笔记]小绝` 这个格式非常重要。
    *   `小绝`是作者署名，日记会保存在`dailynote/小绝/`目录下。
    *   `[学习笔记]`是标签（Tag），日记会进一步保存在`dailynote/学习笔记/小绝/`目录下。这对于知识的分类管理至关重要。

---

## 2. 日记内容编辑器 (DailyNoteEditor)

*   **作用**：允许AI修改已经存在的日记文件。当您发现某篇日记有错误或需要补充时，可以使用此插件。
*   **前置条件**：无。开箱即用。

#### 配置

*   在`TVStxt/supertool.txt`中，确保`{{VCPDailyNoteEditor}}`行没有被注释。

#### 使用方法

您需要明确告诉AI要修改哪一篇日记，以及如何修改。

**示例指令**：
> “帮我修改一下我昨天关于‘VCPToolBox插件系统’的日记，补充一点关于`RAGDiaryPlugin`的内容。”

> “我名为‘小绝’，请将我日记`dailynote/学习笔记/小绝/2025-10-15.md`中的‘DailyNoteWrite’描述更正为‘基础的日记创建和追加工具’。”

---

## 3. 日记整理器 (DailyNoteManager)

*   **作用**：提供对日记文件进行管理的功能，包括**移动、删除、合并**等。
*   **前置条件**：无。开箱即用。

#### 配置

*   在`TVStxt/supertool.txt`中，确保`{{VCPDailyNoteManager}}`行没有被注释。

#### 使用方法

**示例指令**：
> “把我所有署名为‘小绝’的日记，都移动到‘[存档]小绝’这个分类下面。”

> “删除我名为‘临时笔记’的日记文件。”

> “将我最近三天的日记合并成一个文件。”

---

## 4. 日记内容获取 (DailyNoteGet)

*   **作用**：直接获取一篇或多篇日记的原始内容。当您想让AI精确回顾某篇日记的具体内容时非常有用。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPDailyNoteGet}}`行没有被注释。

#### 使用方法
**示例指令**：
> “把我昨天写的关于‘项目A’的日记拿出来看看。”

---

## 5. RAG日记检索 (RAGDiaryPlugin)

*   **作用**：这是知识库功能的核心，是AI的“记忆检索系统”。当您与AI对话时，此插件会在后台自动运行，将您的问题与知识库中的所有日记进行向量相似度匹配，找出最相关的内容，并将其作为上下文信息提供给AI。这���得AI能够“记起”之前的对话和您存入的知识，从而给出更具个性化和深度的回答。
*   **前置条件**：无。该插件默认启用并自动工作。

#### 配置
*   对于大多数用户，无需修改高级配置。高级配置将在本文末尾的“高级配置”章节详细介绍。
*   在`TVStxt/supertool.txt`中，确保`{{VCPRAGDiaryPlugin}}`行没有被注释。

#### 使用方法
该插件是**自动运行**的，您无需直接调用它。只要您的`dailynote/`目录下存有日记，当您提问时，AI就能利用这些知识。

---

## 6. FlashDeep 深度检索 (FlashDeepSearch)

*   **作用**：一个实验性的深度知识检索插件。它不仅进行语义搜索，还会尝试对检索到的知识进行二次处理和联想，挖掘更深层次的联系。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPFlashDeepSearch}}`行没有被注释。

#### 使用方法
**示例指令**：
> “深度思考一下‘人工智能的未来’这个主题，结合我所有相关的笔记。”

---

## 7. Karakeep 知识库检索 (KarakeepSearch)

*   **作用**：与另一个知识管理工具[Karakeep](https://github.com/ZetrC/kara-keep)进行集成，允许AI搜索您在Karakeep中存储的知识。
*   **前置条件**：需要运行Karakeep服务。

#### 配置
1.  在`.env`文件中配置Karakeep的API地址：
    ```env
    KARAKEEP_API_URL=http://<your-karakeep-ip>:port
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPKarakeepSearch}}`行没有被注释。

#### 使用方法
**示例指令**：
> “在我的Karakeep知识库里搜索关于‘Python异步编程’的笔记。”

---

## 8. IMAP 邮件索引 (IMAPIndex)

*   **作用**：连接到您的电子邮箱（通过IMAP协议），抓取邮件内容，并将其转化为可以被RAG系统检索的本地知识文件。这相当于把您的邮箱也变成了AI记忆的一部分。
*   **前置条件**：需要在邮箱服务商处获取IMAP授权码或密码。

#### 配置
1.  在`.env`文件中配置您的邮箱服务器信息：
    ```env
    IMAP_SERVER=imap.example.com
    IMAP_USERNAME=user@example.com
    IMAP_PASSWORD=YOUR_IMAP_PASSWORD_OR_APP_CODE
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPIMAPIndex}}`行没有被注释。

#### 使用方法
这是一个需要手动触发的索引过程。

**示例指令**：
> “帮我检查一下我的收件箱，把新邮件都索引到本地知识库里。”

---

## 9. IMAP 邮件搜索 (IMAPSearch)

*   **作用**：在已索引的邮件中进行搜索。
*   **前置条件**：必须先使用`IMAPIndex`插件建立索引。

#### 配置
*   在`TVStxt/supertool.txt`中，确��`{{VCPIMAPSearch}}`行没有被注释。

#### 使用方法
**示例指令**：
> “在我索引过的邮件里，搜索一下关于‘第三季度财报’的内容。”

---

## 10. 语义组编辑器 (SemanticGroupEditor)

*   **作用**：这是一个管理`RAGDiaryPlugin`高级配置的工具，允许您通过自然语言指令来创建和管理“语义组”。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPSemanticGroupEditor}}`行没有被注释。

#### 使用方法
**示例指令**：
> “创建一个名为‘技术学习’的语义组，把我的‘Python’, ‘JavaScript’, ‘AI’这几个标签都加进去。”

---

## 11. 思维簇管理器 (ThoughtClusterManager)

*   **作用**：管理“思维簇”的实验性插件。思维簇是比语义组更高级的结构，它试图模拟人类的联想和推理模式。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPThoughtClusterManager}}`行没有被注释。

#### 使用方法
此插件主要用于高级调试和实验，普通用户很少需要直接操作。

**示例指令**：
> “显示我当前所有的思维簇。”

---

## 12. **高级配置：打造个性化大脑**

`RAGDiaryPlugin`的强大之处不仅在于基础的向量检索��更在于其高度可定制的**语义组（Semantic Groups）**和**元思维链（Meta-Thinking Chains）**。通过配置这两个核心文件，您可以将AI的思维模式调整到最适合您的工作流状态。

这两个配置文件位于`Plugin/RAGDiaryPlugin/`目录下。建议您将`.example`文件复制为`.json`文件后进行修改。

### 12.1 语义组 (`semantic_groups.json`)

*   **作用**：将不同的日记**标签（Tags）**和**关键词（Keywords）**聚合到一个更大的“语义组”中。当AI进行知识检索时，它会优先在与当前对话主题最匹配的语义组内进行搜索，从而大大提高检索的**准确性**和**相关性**。

*   **示例**：
    假设您有两个日记标签：`[Python学习]`和`[JavaScript项目]`。您可以创建一个名为“编程学习”的语义组，将这两个标签以及相关的关键词（如“算法”、“数据结构”、“debug”）都放进去。
    ```json
    "编程学习": {
      "words": ["Python", "算法", "数据结构", "编程", "代码", "debug", "函数", "JavaScript", "Node.js"],
      "auto_learned": [],
      "weight": 1.0
    }
    ```
    当您问AI“关于那个web项目的bug”，AI会激活“编程学习”这个语义组，重点检索与`[JavaScript项目]`相关的日记，而不���去翻阅您关于“克苏鲁神话”的笔记。

*   **配置项解析**：
    *   `words`: 属于该组的关键词或标签。
    *   `weight`: 权重。权重越高的组在检索时越容易被激活。例如，您可以将与您当前核心工作相关的组设置更高的权重。
    *   `auto_learned`: 系统会自动学习词语之间的关联，并将学到的新词添加到这里。

*   **如何使用**：
    *   **手动配置**：根据您的知识体系，预先设定好不同的语义组。例如“个人健康”、“项目A”、“小说构思”等。
    *   **AI管理**：您也可以使用`SemanticGroupEditor`插件，通过自然语言指令让AI帮您创建和管理这些组。

### 12.2 元思维链 (`meta_thinking_chains.json`)

*   **作用**：定义AI在处理复杂问题时的**思考步骤**。它将一个复杂任务分解成一个由多个“思维簇”（本质上是语义组的组合）组成的序列，AI会按顺序依次调用这些思维簇来进行多轮、有结构的深入思考。

*   **示例**：
    `software_dev`（软件开发）这个思维链定义了软件开发的标准流程：
    ```json
    "software_dev": [
      "需求分析簇",
      "架构设计簇",
      "实现方案簇",
      "质量保证簇",
      "优化建议簇"
    ]
    ```
    当您对AI说：“帮我设计一个用户登录系统”，如果当前Agent激活了`software_dev`思维链，AI会：
    1.  首先，在“需求分析簇”相关的知识（如用户故事、安全需求）中检索。
    2.  然后，在“架构设计簇”相关的知识（如数据库设计、API设计模式）中检索。
    3.  ...依此类推，一步步地构建出完整的解决方案，而不是给出一个宽泛而浅显的答案。

*   **如何使用**：
    1.  **定义思维链**：在`meta_thinking_chains.json`中，您可以模仿现有的例子，创建符合您特定工作流程的思维链。
    2.  **在Agent中激活**：在`Agent/`目录下的具体Agent配置文件（如`coder_agent.json`）中，您可以指定该Agent默认使用哪个`meta_thinking_chain`。
        ```json
        "meta_thinking_chain": "software_dev"
        ```
    这样，当您切换到这个Agent时，AI就会自动采用您为它设定的“专业思维模式”。

通过精心设计您的语义组和元思维链，您可以将VCPToolBox从一个通用的AI助手，调教成一个高度专业化、深度理解您个人知识体系的“专家大脑”。
