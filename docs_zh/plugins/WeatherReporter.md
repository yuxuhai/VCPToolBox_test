# 插件: 天气预报员 (WeatherReporter)

`WeatherReporter` 是一个静态插件，它提供实时的天气信息，并能将天气数据自动注入到 AI 的系统提示词中。

- **插件类型**: `static`
- **占位符**: `{{VCPWeatherInfo}}`

## 功能

-   定时获取并更新指定城市的天气信息。
-   将格式化后的天气信息（包括当前天气、未来几天的预报、24小时预报）提供给 `{{VCPWeatherInfo}}` 变量。
-   AI 可以通过读取 `{{VCPWeatherInfo}}` 变量，在对话中自然地融入天气情况。

## 配置

要使用此插件，您需要在 `config.env` 文件中配置以下参数：

1.  **`VarCity`**: 您想要查询天气的城市。例如：`VarCity=北京`。
2.  **`WeatherKey`**: 和风天气的 API 密钥。
3.  **`WeatherUrl`**: 和风天气的 API 地址。

### 如何获取和风天气 API 密钥？

1.  **注册账号**: 访问 [和风天气开发者平台](https://console.qweather.com/) 并注册一个账号。
2.  **创建项目和 Key**:
    -   登录后，在控制台中选择“项目管理”。
    -   创建一个新项目，项目类型选择“免费订阅”。
    -   创建成功后，您将获得一个 API Key。
3.  **获取 API 地址**:
    -   在“项目管理”页面，您可以看到您的 Key 所对应的 API 地址。通常是 `devapi.qweather.com`。

### `config.env` 示例

```
# -- 插件 API 密钥 --
# 和风天气: 用于获取天气信息。注册并获取Key: https://console.qweather.com/
WeatherKey=YOUR_QWEATHER_KEY_SUCH_AS_xxxxxxxxxxxxxxxxxxxxxxxx
WeatherUrl=devapi.qweather.com

# -- 自定义变量 --
VarCity=北京
```

## 使用方法

1.  **配置 `config.env`**: 按照上述说明，填入您的城市和和风天气 API 信息。
2.  **启用系统提示词**: 确保您的系统提示词 (例如 `config.env` 中的 `TarSysPrompt`) 中包含了 `{{VCPWeatherInfo}}` 占位符。
    ```
    TarSysPrompt="{{VarTimeNow}}当前地址是{{VarCity}},当前天气是{{VCPWeatherInfo}}。"
    ```
3.  **重启 VCP**: 重启 VCP ToolBox 服务。

完成以上步骤后，VCP 会自动定时获取天气，并在每次与 AI 对话时，将最新的天气信息传递给 AI。

## AI 调用示例

虽然这是一个静态插件，主要用于信息注入，但 AI 仍然可以根据获取到的信息进行回复。

**用户**: "今天天气怎么样？"

**AI (已获取 `{{VCPWeatherInfo}}` 的信息)**: "今天北京的天气是晴天，气温在 15 到 25 摄氏度之间，微风。很适合出门散步哦！"
