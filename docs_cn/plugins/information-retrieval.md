# 插件详解：信息检索与网络搜索

信息检索与网络搜索插件是AI代理连接现实世界、获取实时信息的桥梁。通过它们，AI不再局限于其训练数据中的知识，而是能够进行网络搜索、查阅最新的学术论文、追踪时事热点。

---

## 目录
1.  [Tavily 搜索 (TavilySearch)](#1-tavily-搜索-tavilysearch)
2.  [谷歌搜索 (GoogleSearch)](#2-谷歌搜索-googlesearch)
3.  [Serp 搜索 (SerpSearch)](#3-serp-搜索-serpsearch)
4.  [URL 内容获取 (UrlFetch)](#4-url-内容获取-urlfetch)
5.  [Arxiv 每日论文 (ArxivDailyPapers)](#5-arxiv-每日论文-arxivdailypapers)
6.  [CrossRef 每日论文 (CrossRefDailyPapers)](#6-crossref-每日论文-crossrefdailypapers)
7.  [Bilibili 内容获取 (BilibiliFetch)](#7-bilibili-内容获取-bilibilifetch)
8.  [每日热榜 (DailyHot)](#8-每日热榜-dailyhot)
9.  [动漫番剧搜索 (AnimeFinder)](#9-动漫番剧搜索-animefinder)
10. [艺术家风格搜索 (ArtistMatcher)](#10-艺术家风格搜索-artistmatcher)
11. [本地文件搜索 (VCPEverything)](#11-本地文件搜索-vcpeverything)

---

## 1. Tavily 搜索 (TavilySearch)

*   **作用**：提供由[Tavily AI](https://tavily.com/)驱动的、专为大型语言模型优化的搜索能力。它不仅返回搜索结果，还会对结果进行处理和总结，提供更精准、更相关的答案。这是**最推荐**的通用搜索插件。
*   **前置条件**：需要Tavily API密钥。

#### API密钥获取方法

1.  访问[Tavily官网](https://tavily.com/)
2.  注册并登录账号
3.  在控制台创建API密钥
4.  **注意**：Tavily提供免费试用额度

#### 配置

**配置文件位置：** 项目根目录`config.env`（全局配置）

```env
# Tavily搜索引擎API密钥
TavilyKey=tvly-xxxxxxxxxxxxxxxxxxxxxxxx
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPTavilySearch}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
网络搜索工具：
{{VCPTavilySearch}}
```

#### 使用方法

**示例指令**：
> "最新的AI研究有哪些进展？"

---

## 2. 谷歌搜索 (GoogleSearch)

*   **作用**：提供传统的谷歌搜索能力。它利用谷歌的自定义搜索API（Google Custom Search Engine）来执行搜索查询。
*   **前置条件**：需要设置Google自定义搜索引擎，并获取API密钥和搜索引擎ID。

#### API密钥获取方法

1.  访问[Google Cloud Console](https://console.cloud.google.com/)
2.  创建项目并启用Custom Search API
3.  创建API密钥
4.  访问[Custom Search Engine](https://cse.google.com/)创建搜索引擎，获取搜索引擎ID (CX)

#### 配置

**插件配置文件位置：** `Plugin/GoogleSearch/config.env`

```env
# Google Custom Search API密钥（可填入多个，用逗号分隔）
GOOGLE_SEARCH_API=YOUR_GOOGLE_API_KEY_1,YOUR_GOOGLE_API_KEY_2

# Google自定义搜索引擎ID
GOOGLE_CX=YOUR_CUSTOM_SEARCH_ENGINE_ID_HERE

# 代理端口（可选）
GOOGLE_PROXY_PORT=7890
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPGoogleSearch}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
谷歌搜索：
{{VCPGoogleSearch}}
```

#### 使用方法

**示例指令**：
> "用谷歌搜一下'VCPToolBox'这个项目。"

---

## 3. Serp 搜索 (SerpSearch)

*   **作用**：这是另一个强大的网络搜索引擎，它使用[SerpApi](https://serpapi.com/)提供的服务。与谷歌自定义搜索相比，SerpApi通常能提供更丰富、更结构化的搜索结果。
*   **前置条件**：需要注册SerpApi并获取API密钥。

#### API密钥获取方法

1.  访问[SerpApi官网](https://serpapi.com/)
2.  注册并登录账号
3.  在控制台获取API密钥
4.  **注意**：提供免费试用额度

#### 配置

**插件配置文件位置：** `Plugin/SerpSearch/config.env`

```env
# SerpApi密钥（可填入多个，用逗号分隔）
SerpApi=key1,key2,key3
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPSerpSearch}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
Serp搜索：
{{VCPSerpSearch}}
```

#### 使用方法

**示例指令**：
> "用SerpApi帮我搜索一下今天的天气预报。"

---

## 4. URL 内容获取 (UrlFetch)

*   **作用**：让AI能够直接"阅读"和理解一个网页链接的内容。AI会抓取指定URL的文本信息，并可以对其进行总结、分析或翻译。
*   **前置条件**：无特殊要求，可选配置Cookie以访问需要登录的网站。

#### 配置

**插件配置文件位置：** `Plugin/UrlFetch/config.env`（可选配置）

```env
# 代理端口（可选）
FETCH_PROXY_PORT=7890

# Cookie配置（可选，用于访问需要登录的网站）
# 方式1：单站点原始格式
FETCH_COOKIES_RAW=

# 方式2：多站点格式（推荐）
# 示例：{"bilibili.com":"SESSDATA=xxx","twitter.com":"auth_token=yyy"}
FETCH_COOKIES_RAW_MULTI=

# 方式3：JSON数组格式（高级）
FETCH_COOKIES=
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPUrlFetch}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
网页内容获取：
{{VCPUrlFetch}}
```

#### 使用方法

**示例指令**：
> "总结一下这个页面的内容：https://github.com/YDX-2147483647/VCPToolBox"

---

## 5. Arxiv 每日论文 (ArxivDailyPapers)

*   **作用**：从[arXiv.org](https://arxiv.org/)获取指定领域的最新论文列表。
*   **前置条件**：无特殊要求，可选配置搜索参数。

#### 配置

**插件配置文件位置：** `Plugin/ArxivDailyPapers/config.env`（可选配置）

```env
# 搜索关键词
# 示例：all:("Large Language Models" OR "Retrieval Augmented Generation")
ARXIV_SEARCH_TERMS='all:("Long-read Sequencing" OR metagenome OR "microbial genomics")'

# 返回结果数量
ARXIV_MAX_RESULTS=300

# 搜索天数范围（包括今天）
ARXIV_DAYS_RANGE=30

# 调试模式
ARXIV_DEBUG_MODE=false
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPArxivDailyPapers}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
学术论文搜索：
{{VCPArxivDailyPapers}}
```

#### 使用方法

**示例指令**：
> "帮我看看今天Arxiv上计算机视觉领域有什么新论文。"

---

## 6. CrossRef 每日论文 (CrossRefDailyPapers)

*   **作用**：与Arxiv插件类似，但它从[CrossRef](https://www.crossref.org/)获取数据，这是一个更广泛的学术出版物元数据注册机构。
*   **前置条件**：无特殊要求，可选配置搜索参数。

#### 配置

**插件配置文件位置：** `Plugin/CrossRefDailyPapers/config.env`（可选配置）

```env
# 文献查询关键词
CROSSREF_QUERY_BIBLIOGRAPHIC='"Long-read Sequencing" OR metagenome OR "microbial genomics"'

# 返回结果数量
CROSSREF_ROWS=300

# 搜索天数范围
CROSSREF_DAYS_RANGE=2

# 调试模式
CROSSREF_DEBUG_MODE=false
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPCrossRefDailyPapers}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
CrossRef论文搜索：
{{VCPCrossRefDailyPapers}}
```

#### 使用方法

**示例指令**：
> "通过CrossRef查找关于'深度学习'的最新研究。"

---

## 7. Bilibili 内容获取 (BilibiliFetch)

*   **作用**：获取Bilibili视频的详细信息，包括标题、简介、字幕等。
*   **前置条件**：建议配置Bilibili的Cookie以获取完整信息。

#### Cookie获取方法

1.  登录[Bilibili官网](https://www.bilibili.com/)
2.  打开浏览器开发者工具（F12）
3.  切换到"应用程序/Application"标签
4.  找到Cookies部分，复制完整的Cookie字符串
5.  **注意**：Cookie会过期，需定期更新

#### 配置

**配置文件位置：** 项目根目录`config.env`（全局配置）

```env
# Bilibili Cookie
BILIBILI_COOKIE="_uuid=YOUR_BILIBILI_COOKIE_UUID; ..."
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPBilibiliFetch}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
Bilibili内容获取：
{{VCPBilibiliFetch}}
```

#### 使用方法

**示例指令**：
> "总结一下这个B站视频的内容：[视频链接]"

---

## 8. 每日热榜 (DailyHot)

*   **作用**：从微博、知乎、GitHub等数十个平台抓取每日热榜。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPDailyHot}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
热榜查询：
{{VCPDailyHot}}
```

#### 使用方法

**示例指令**：
> "看看今天的知乎热榜。"

---

## 9. 动漫番剧搜索 (AnimeFinder)

*   **作用**：一个非常有趣的插件，可以"以图搜番"。您向AI发送一张动漫截图，它能告诉您这张截图出自哪部动漫。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPAnimeFinder}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
动漫搜索：
{{VCPAnimeFinder}}
```

#### 使用方法

1.  向AI发送一张动漫截图。
2.  发送指令。

**示例指令**：
> （在发送图片后）"帮我查一下这张图片是哪部动漫的？"

---

## 10. 艺术家风格搜索 (ArtistMatcher)

*   **作用**：与搜番插件类似，这个插件可以"以图搜艺术家"。您发送一张画作，它能分析其风格并找出可能是该风格的艺术家。在您进行AI绘画，想要模仿某种风格时特别有用。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPArtistMatcher}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
艺术家风格搜索：
{{VCPArtistMatcher}}
```

#### 使用方法

1.  向AI发送一张艺术作品图片。
2.  发送指令。

**示例指令**：
> （在发送图片后）"分析一下这张图的艺术风格，并告诉我哪些艺术家的风格与此类似？"

---

## 11. 本地文件搜索 (VCPEverything)

*   **作用**：这是一个强大的本地文件系统搜索工具。它与知名的Windows搜索神器[Everything](https://www.voidtools.com/)进行集成，让AI能够快速搜索您电脑上的任何文件。
*   **前置条件**：
    1.  您的VCPToolBox必须运行在Windows系统上。
    2.  您需要安装并运行Everything软件。

#### 配置

1.  下载并安装[Everything](https://www.voidtools.com/)
2.  启动Everything并保持运行
3.  无需额外配置VCP端

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPEverything}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
本地文件搜索：
{{VCPEverything}}
```

#### 使用方法

**示例指令**：
> "在我的电脑上搜索所有名为'report.docx'的文件。"

> "查找D盘下所有的.log文件。"
