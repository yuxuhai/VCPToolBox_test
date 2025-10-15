# 插件详解：个人知识库与日记

VCPToolBox的个人知识库（也称为DailyNote系统）是其核心功能之一，旨在成为您的"第二大脑"。这些插件与位于`dailynote/`目录下的文件深度集成，让AI能够记录长期记忆、管理您的笔记，并通过检索增强生成（RAG）技术，在对话中利用您自己的知识。

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

---

## 1. 日记写入器 (DailyNoteWrite)

*   **作用**：这是将信息存入知识库最基础的插件。它允许AI根据特定格式，将对话中的关键信息、学习到的新知识或您的思考总结，自动创建或追加到日记文件中。
*   **前置条件**：无特殊要求。

#### 配置

**插件配置文件位置：** `Plugin/DailyNoteWrite/config.env`（可选配置）

```env
# 日记文件扩展名
# 支持值: "txt", "md"
DAILY_NOTE_EXTENSION=txt
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPDailyNoteWrite}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
日记写入工具：
{{VCPDailyNoteWrite}}
```

#### 使用方法

AI会在认为有价值的信息产生时（例如，一次深入讨论后、学习了新概念后），自动在回复的末尾附上符合格式的日记内容。VCPToolBox后端会自动捕捉并保存这些内容。

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
- RAGDiaryPlugin: 核心检索插件，让AI能"回忆"日记内容。
这个系统构成了VCPToolBox的长期记忆核心。
<<<DailyNoteEnd>>>
```

**署名与标签说明**：
- `小绝`是作者署名，日记会保存在`dailynote/小绝/`目录下
- `[学习笔记]`是标签（Tag），日记会进一步保存在`dailynote/学习笔记/小绝/`目录下
- 标签对于知识的分类管理至关重要

---

## 2. 日记内容编辑器 (DailyNoteEditor)

*   **作用**：允许AI修改已经存在的日记文件。当您发现某篇日记有错误或需要补充时，可以使用此插件。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPDailyNoteEditor}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
日记编辑工具：
{{VCPDailyNoteEditor}}
```

#### 使用方法

您需要明确告诉AI要修改哪一篇日记，以及如何修改。

**示例指令**：
> "帮我修改一下我昨天关于'VCPToolBox插件系统'的日记，补充一点关于`RAGDiaryPlugin`的内容。"

> "我名为'小绝'，请将我日记`dailynote/学习笔记/小绝/2025-10-15.md`中的'DailyNoteWrite'描述更正为'基础的日记创建和追加工具'。"

---

## 3. 日记整理器 (DailyNoteManager)

*   **作用**：提供对日记文件进行管理的功能，包括**移动、删除、合并**等。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPDailyNoteManager}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
日记管理工具：
{{VCPDailyNoteManager}}
```

#### 使用方法

**示例指令**：
> "把我所有署名为'小绝'的日记，都移动到'[存档]小绝'这个分类下面。"

> "删除我名为'临时笔记'的日记文件。"

> "将我最近三天的日记合并成一个文件。"

---

## 4. 日记内容获取 (DailyNoteGet)

*   **作用**：直接获取一篇或多篇日记的原始内容。当您想让AI精确回顾某篇日记的具体内容时非常有用。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPDailyNoteGet}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
日记获取工具：
{{VCPDailyNoteGet}}
```

#### 使用方法

**示例指令**：
> "把我昨天写的关于'项目A'的日记拿出来看看。"

---

## 5. RAG日记检索 (RAGDiaryPlugin)

*   **作用**：这是知识库功能的核心，是AI的"记忆检索系统"。当您与AI对话时，此插件会在后台自动运行，将您的问题与知识库中的所有日记进行向量相似度匹配，找出最相关的内容，并将其作为上下文信息提供给AI。这使得AI能够"记起"之前的对话和您存入的知识，从而给出更具个性化和深度的回答。
*   **前置条件**：可选配置Rerank重排服务以提升检索质量。

#### 配置

**插件配置文件位置：** `Plugin/RAGDiaryPlugin/config.env`（可选配置）

```env
# Rerank重排查询相关
RerankMultiplier=2
RerankUrl=your_rerank_api_url
RerankApi=your_rerank_api_key
RerankModel=Qwen/Qwen3-Reranker-8B
RerankMaxTokensPerBatch=30000
```

**说明**：
- Rerank重排可以提升检索结果的相关性
- 如不配置，插件仍可正常工作，使用基础的向量相似度检索

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPRAGDiaryPlugin}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
知识库检索：
{{VCPRAGDiaryPlugin}}
```

#### 使用方法

该插件是**自动运行**的，您无需直接调用它。只要您的`dailynote/`目录下存有日记，当您提问时，AI就能利用这些知识。

---

## 6. FlashDeep 深度检索 (FlashDeepSearch)

*   **作用**：一个实验性的深度知识检索插件。它不仅进行语义搜索，还会尝试对检索到的知识进行二次处理和联想，挖掘更深层次的联系。
*   **前置条件**：需要配置API服务器和模型。

#### 配置

**插件配置文件位置：** `Plugin/FlashDeepSearch/config.env`

```env
# API服务器凭证和地址
DeepSearchKey=sk-YourAPIKeyHere
DeepSearchUrl=http://YourApiServerUrl/v1/chat/completions

# 主研究模型配置
DeepSearchModel=gemini-2.5-flash-preview-05-20-thinking
DeepSearchModelContent=1000000
DeepSearchModelMaxToken=60000

# 搜索辅助模型配置
GoogleSearchModel=gemini-2.5-flash-lite-preview-06-17-thinking
GoogleSearchModelContent=500000
GoogleSearchModelMaxToken=50000

# 并发搜索上限
MaxSearchList=5
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPFlashDeepSearch}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
深度检索工具：
{{VCPFlashDeepSearch}}
```

#### 使用方法

**示例指令**：
> "深度思考一下'人工智能的未来'这个主题，结合我所有相关的笔记。"

---

## 7. Karakeep 知识库检索 (KarakeepSearch)

*   **作用**：与另一个知识管理工具[Karakeep](https://github.com/ZetrC/kara-keep)进行集成，允许AI搜索您在Karakeep中存储的知识。
*   **前置条件**：需要运行Karakeep服务并获取API密钥。

#### 配置

**插件配置文件位置：** `Plugin/KarakeepSearch/config.env`

```env
# Karakeep服务地址
KARAKEEP_API_ADDR=https://your-karakeep.example.com

# Karakeep API密钥
KARAKEEP_API_KEY=sk-xxxxxxx
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPKarakeepSearch}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
Karakeep检索：
{{VCPKarakeepSearch}}
```

#### 使用方法

**示例指令**：
> "在我的Karakeep知识库里搜索关于'Python异步编程'的笔记。"

---

## 8. IMAP 邮件索引 (IMAPIndex)

*   **作用**：连接到您的电子邮箱（通过IMAP协议），抓取邮件内容，并将其转化为可以被RAG系统检索的本地知识文件。这相当于把您的邮箱也变成了AI记忆的一部分。
*   **前置条件**：需要在邮箱服务商处获取IMAP授权码或应用专用密码。

#### 配置

**配置文件位置：** 项目根目录`config.env`（全局配置）

```env
# IMAP登录信息
IMAP_USER=your_email@example.com
IMAP_PASS=your_imap_password_or_app_code
IMAP_HOST=imap.example.com
IMAP_PORT=993
IMAP_TLS=true

# 邮件过滤设置
TIME_LIMIT_DAYS=3
WHITELIST=alice@example.com,bob@example.com

# 存储路径
STORAGE_PATH=./mail_store

# 代理设置（可选）
IMAP_PROXY_ENABLED=false
IMAP_PROXY_URL=http://127.0.0.1:7890
IMAP_PROXY_TIMEOUT_MS=10000
IMAP_PROXY_TLS_REJECT_UNAUTHORIZED=true

# 调试模式
DebugMode=false
```

**说明**：
- `WHITELIST`：只索引来自这些发件人的邮件
- `TIME_LIMIT_DAYS`：只索引最近N天的邮件
- 此插件会自动定期运行（每30分钟）

#### 启用插件

此插件作为静态插件自动在后台运行，会生成`{{IMAPIndex}}`占位符供系统提示词使用。

**在系统提示词中使用**：

```
邮件索引内容：
{{IMAPIndex}}
```

#### 使用方法

插件会自动定期抓取邮件，您无需手动触发。AI可以直接访问索引的邮件内容。

---

## 9. IMAP 邮件搜索 (IMAPSearch)

*   **作用**：在已索引的邮件中进行搜索。
*   **前置条件**：必须先使用`IMAPIndex`插件建立索引。

#### 配置

**插件配置文件位置：** `Plugin/IMAPSearch/config.env`（可选配置）

```env
# 邮件存储目录（如果IMAPIndex使用了自定义路径）
# MAIL_INDEX_DIR=../IMAPIndex/mail_store

# 每页搜索结果数量
# SEARCH_RESULT_LIMIT=5
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPIMAPSearch}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
邮件搜索工具：
{{VCPIMAPSearch}}
```

#### 使用方法

**示例指令**：
> "在我索引过的邮件里，搜索一下关于'第三季度财报'的内容。"

---

## 10. 语义组编辑器 (SemanticGroupEditor)

*   **作用**：这是一个管理`RAGDiaryPlugin`高级配置的工具，允许您通过自然语言指令来创建和管理"语义组"。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPSemanticGroupEditor}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
语义组管理：
{{VCPSemanticGroupEditor}}
```

#### 使用方法

**示例指令**：
> "创建一个名为'技术学习'的语义组，把我的'Python', 'JavaScript', 'AI'这几个标签都加进去。"

---

## 11. 思维簇管理器 (ThoughtClusterManager)

*   **作用**：管理"思维簇"的实验性插件。思维簇是比语义组更高级的结构，它试图模拟人类的联想和推理模式。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPThoughtClusterManager}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
思维簇管理：
{{VCPThoughtClusterManager}}
```

#### 使用方法

此插件主要用于高级调试和实验，普通用户很少需要直接操作。

**示例指令**：
> "显示我当前所有的思维簇。"

---

## 通用提示

### 知识库最佳实践

1. **规范使用标签**：为日记添加有意义的标签，便于分类和检索
2. **定期整理**：使用DailyNoteManager定期整理和归档日记
3. **语义组管理**：通过SemanticGroupEditor创建符合您知识体系的语义组
4. **邮件索引**：合理设置WHITELIST，只索引重要的邮件发件人

### 工具组合使用

您可以在系统提示词中组合多个知识库工具：

```
个人知识库系统：
- 日记写入：{{VCPDailyNoteWrite}}
- 日记编辑：{{VCPDailyNoteEditor}}
- 日记管理：{{VCPDailyNoteManager}}
- 知识检索：{{VCPRAGDiaryPlugin}}
- 邮件搜索：{{VCPIMAPSearch}}

请根据用户需求选择合适的工具管理和检索知识。
```
