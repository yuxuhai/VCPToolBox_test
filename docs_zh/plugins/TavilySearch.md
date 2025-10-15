# 插件: Tavily 搜索 (TavilySearch)

`TavilySearch` 是一个同步插件，它为 AI 提供了强大的网络搜索能力，允许 AI 调用 Tavily 搜索引擎来获取最新的信息。

- **插件类型**: `synchronous`
- **调用命令**: `TavilySearch`

## 功能

-   执行高级网络搜索，获取与查询相关的最新信息。
-   支持多种搜索参数，如主题、结果数量、日期范围等。
-   可以选择性地获取网页原始内容 (纯文本或 Markdown 格式)。
-   返回包含标题、链接、内容片段和图片链接的结构化搜索结果。

## 配置

要使用此插件，您需要在 `config.env` 文件中配置您的 Tavily API 密钥。

-   **`TavilyKey`**: 您的 Tavily API 密钥。

### 如何获取 Tavily API 密钥？

1.  **注册账号**: 访问 [Tavily AI 官网](https://tavily.com/) 并注册一个账号。
2.  **获取密钥**: 登录后，在您的账户仪表盘中可以找到您的 API 密钥。

### `config.env` 示例

```
# -- 插件 API 密钥 --
# Tavily搜索引擎: 用于提供联网搜索能力。注册并获取Key: https://www.tavily.com/
TavilyKey=YOUR_TAVILY_KEY_SUCH_AS_tvly-xxxxxxxxxxxxxxxxxxxxxxxx
```

## 使用方法

1.  **配置 `config.env`**: 按照上述说明，填入您的 Tavily API 密钥。
2.  **启用插件**: 在您的工具列表文件 (例如 `supertool.txt`) 中，添加 `{{VCPTavilySearch}}` 占位符。
3.  **重启 VCP**: 重启 VCP ToolBox 服务。

现在，AI 就可以在需要时调用 `TavilySearch` 命令来执行搜索了。

## AI 调用示例

AI 会根据用户的提问，生成一个结构化的工具调用请求。

**用户**: "帮我找一下 2025 年关于人工智能的最新研究进展。"

**AI**:
```
<<<[TOOL_REQUEST]>>>
maid:「始」助手「末」
tool_name:「始」TavilySearch「末」
query:「始」2025年人工智能最新研究进展「末」
topic:「始」technology「末」
max_results:「始」5「末」
include_raw_content:「始」markdown「末」
<<<[END_TOOL_REQUEST]>>>
```

### 参数说明

-   **`query`** (必需): 搜索的关键词或问题。
-   **`topic`** (可选): 搜索的主题，例如 `news`, `finance`, `technology`。默认为 `general`。
-   **`max_results`** (可选): 返回的最大结果数量，范围 5-100。默认为 `10`。
-   **`include_raw_content`** (可选): 如果需要获取网页原始内容，请将此值设为 `text` 或 `markdown`。
-   **`start_date`** (可选): 搜索开始日期，格式为 `YYYY-MM-DD`。
-   **`end_date`** (可选): 搜索结束日期，格式为 `YYYY-MM-DD`。

在收到搜索结果后，AI 会整理信息并以自然语言的形式回复给用户。
