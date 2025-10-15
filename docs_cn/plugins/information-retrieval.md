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

*   **作用**：提���由[Tavily AI](https://tavily.com/)驱动的、专为大型语言模型优化的搜索能力。它不仅返回搜索结果，还会对结果进行处理和总结，提供更精准、更相关的答案。这是**最推荐**的通用搜索插件。
*   **前置条件**：您需要一个Tavily API密钥。

#### 配置

1.  在`.env`文件中找到`[插件API密钥]`部分，填入您的Tavily密钥：
    ```env
    # Tavily搜索引擎: 用于提供联网搜索能力。注册并获取Key: https://www.tavily.com/
    TavilyKey=YOUR_TAVILY_KEY_SUCH_AS_tvly-xxxxxxxxxxxxxxxxxxxxxxxx
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPTavilySearch}}`行没有被注释。

#### 使用方法
**示例指令**：
> “最新的AI研究有哪些进展？”

---

## 2. 谷歌搜索 (GoogleSearch)

*   **作用**：提供传统的谷歌搜索能力。它利用谷歌的自定义搜索API（Google Custom Search Engine）来执行搜索查询。
*   **前置条件**：您需要设置一个谷歌自定义搜索引擎，并获取API密钥和搜索引擎ID。

#### 配置
1.  在`.env`文件中找到并填入谷歌自定义搜索的配置：
    ```env
    # Google Custom Search API Key
    GOOGLE_API_KEY=YOUR_GOOGLE_API_KEY

    # Google Custom Search Engine ID
    GOOGLE_CSE_ID=YOUR_GOOGLE_CSE_ID
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPGoogleSearch}}`行没有被注释。

#### 使用方法
**示例指令**：
> “用谷歌搜一下‘VCPToolBox’这个项目。”

---

## 3. Serp 搜索 (SerpSearch)

*   **作用**：这是另一个强大的网络搜索引擎，它使用[SerpApi](https://serpapi.com/)提供的服务。与谷歌自定义搜索相比，SerpApi通常能提供更丰富、更结构化的搜索结果。
*   **前置条件**：需要注册SerpApi并获取API密钥。

#### 配置
1.  在`.env`文件中找到`[插件API密钥]`部分，填入您的SerpApi密钥：
    ```env
    # SerpApi搜索引擎: 用于提供联网搜索能力。注册并获取Key: https://serpapi.com/
    SERP_API_KEY=YOUR_SERP_API_KEY
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPSerpSearch}}`行没有被注释。

#### 使用方法
**示例指令**：
> “用SerpApi帮我搜索一下今天的天气预报。”

---

## 4. URL 内容获取 (UrlFetch)

*   **作用**：让AI能够直接“阅读”和理解一个网页链接的内容。AI会抓取指定URL的文本信息，并可以对其进行总结、分析或翻译。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPUrlFetch}}`行没有被注释。

#### 使用方法
**示例指令**：
> “总结一下这个页面的内容：https://github.com/YDX-2147483647/VCPToolBox”

---

## 5. Arxiv 每日论文 (ArxivDailyPapers)

*   **作用**：从[arXiv.org](https://arxiv.org/)获取指定领域的最新论文列表。
*   **前置条件**：无。

#### 配置
1.  在`.env`文件中，您可以配置默认的搜索参数：
    ```env
    ARXIV_CATEGORY=cs.AI
    ARXIV_MAX_RESULTS=5
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPArxivDailyPapers}}`行没有被注释。

#### 使用方法
**示例指令**：
> “帮我看看今天Arxiv上计算机视觉领域有什么新论文。”

---

## 6. CrossRef 每日论文 (CrossRefDailyPapers)

*   **作用**：与Arxiv插件类似，但它从[CrossRef](https://www.crossref.org/)获取数据，这是一个更广泛的学术出版物元数据注册机构。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPCrossRefDailyPapers}}`行没有被注释。

#### 使用方法
**示例指令**：
> “通过CrossRef查找关于‘深度学习’的最新研究。”

---

## 7. Bilibili 内容获取 (BilibiliFetch)

*   **作用**：获取Bilibili视频的详细信息，包括标题、简介、字幕等。
*   **前置条件**：建议配置Bilibili的Cookie以获取完整信息。

#### 配置
1.  在`.env`文件中填入您的B站Cookie：
    ```env
    BILIBILI_COOKIE="_uuid=YOUR_BILIBILI_COOKIE_UUID; ..."
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPBilibiliFetch}}`行没有被注释。

#### 使用方法
**示例指令**：
> “总结一下这个B站视频的内容：[视频链接]”

---

## 8. 每日热榜 (DailyHot)

*   **作用**：从微博、知乎、GitHub等数十个平台抓取每日热榜。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPDailyHot}}`行没有被注释。

#### 使用方法
**示例指令**：
> “看看今天的知乎热榜。”

---

## 9. 动漫番剧搜索 (AnimeFinder)

*   **作用**：一个非常有趣的插件，可以“以图搜番”。您向AI发送一张动漫截图，它能告诉您这张截图出自哪部动漫。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPAnimeFinder}}`行没有被注释。

#### 使用方法
1.  向AI发送一张动漫截图。
2.  发送指令。

**示例指令**：
> （在发送图片后）“帮我查一下这张图片是哪部动漫的？”

---

## 10. 艺术家风格搜索 (ArtistMatcher)

*   **作用**：与搜番插件类似，这个插件可以“以图搜艺术家”。您发送一张画作，它能分析其风格并找出可能是该风格的艺术家。���在您进行AI绘画，想要模仿某种风格时特别有用。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPArtistMatcher}}`行没有被注释。

#### 使用方法
1.  向AI发送一张艺术作品图片。
2.  发送指令。

**示例指令**：
> （在发送图片后）“分析一下这张图的艺术风格，并告诉我哪些艺术家的风格与此类似？”

---

## 11. 本地文件搜索 (VCPEverything)

*   **作用**：这是一个强大的本地文件系统搜索工具。它与知名的Windows搜索神器[Everything](https://www.voidtools.com/)进行集成，让AI能够快速搜索您电脑上的任何文件。
*   **前置条件**：
    1.  您的VCPToolBox必须运行在Windows系统上。
    2.  您需要安装并运行Everything软件。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPEverything}}`行没有被注释。

#### 使用方法
**示例指令**：
> “在我的电脑上搜索所有名为‘report.docx’的文件。”

> “查找D盘下所有的.log文件。”
