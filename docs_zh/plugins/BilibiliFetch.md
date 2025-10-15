# 插件: Bilibili 内容获取 (BilibiliFetch)

`BilibiliFetch` 是一个同步插件，它允许 AI 获取 Bilibili (B站) 视频的字幕内容。

- **插件类型**: `synchronous`
- **调用命令**: `BilibiliFetch`

## 功能

-   根据提供的 Bilibili 视频 URL，提取视频的字幕文本。
-   支持指定字幕的语言 (例如，中文或英文)。
-   让 AI 能够“观看”并理解 B 站视频的内容。

## 配置

要使用此插件，您需要在 `config.env` 文件中配置您的 Bilibili Cookie。

-   **`BILIBILI_COOKIE`**: 您的 Bilibili 网站 Cookie。

### 如何获取 Bilibili Cookie？

1.  **登录 Bilibili**: 在您的浏览器中打开并登录 [Bilibili 官网](https://www.bilibili.com/)。
2.  **打开开发者工具**:
    -   在页面上右键，选择“检查”或“审查元素”。
    -   或者按 `F12` 键。
3.  **找到 Cookie**:
    -   在开发者工具中，切换到“应用” (Application) 或“存储” (Storage) 标签页。
    -   在左侧菜单中，找到“Cookie”项，并点击 `https://www.bilibili.com`。
    -   在右侧的 Cookie 列表中，找到名为 `_uuid` 的条目，并复制其值。
    -   **注意**: 只需要 `_uuid` 的值即可。

### `config.env` 示例

```
# B站cookie，用于让AI看视频。获取方式请参考BilibiliFetch插件的说明。
BILIBILI_COOKIE="_uuid=YOUR_BILIBILI_COOKIE_UUID"
```

## 使用方法

1.  **配置 `config.env`**: 按照上述说明，填入您的 Bilibili Cookie。
2.  **启用插件**: 在您的工具列表文件 (例如 `supertool.txt`) 中，添加 `{{VCPBilibiliFetch}}` 占位符。
3.  **重启 VCP**: 重启 VCP ToolBox 服务。

现在，AI 就可以在需要时调用 `BilibiliFetch` 命令来获取 B 站视频字幕了。

## AI 调用示例

**用户**: "能帮我看看这个 B 站视频讲了什么吗？https://www.bilibili.com/video/BV1xx411c7m9"

**AI**:
```
<<<[TOOL_REQUEST]>>>
maid:「始」助手「末」
tool_name:「始」BilibiliFetch「末」
url:「始」https://www.bilibili.com/video/BV1xx411c7m9「末」
lang:「始」ai-zh「末」
<<<[END_TOOL_REQUEST]>>>
```

### 参数说明

-   **`url`** (必需): Bilibili 视频的 URL。
-   **`lang`** (可选): 字幕语言代码, 例如 `ai-zh` (中文) 或 `ai-en` (英文)。如果未提供，将默认尝试获取中文字幕。

在收到字幕内容后，AI 会整理信息并总结视频内容回复给用户。
