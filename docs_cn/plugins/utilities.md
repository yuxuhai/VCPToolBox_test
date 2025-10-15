# 插件详解：实用工具

本部分收录了一些小巧而实用的工具插件，它们为AI与用户的交互增添了便利性和趣味性。

---

## 目录
1.  [图像处理器 (ImageProcessor)](#1-图像处理器-imageprocessor)
2.  [表情包列表生成器 (EmojiListGenerator)](#2-表情包列表生成器-emojilistgenerator)
3.  [科学计算器 (SciCalculator)](#3-科学计算器-scicalculator)
4.  [天气预报员 (WeatherReporter)](#4-天气预报员-weatherreporter)
5.  [随机性工具 (Randomness)](#5-随机性工具-randomness)
6.  [塔罗牌占卜 (TarotDivination)](#6-塔罗牌占卜-tarotdivination)

---

## 1. 图像处理器 (ImageProcessor)

*   **作用**：提供了一系列基础的图像处理功能，如**旋转、缩放、裁剪、转换格式**等。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPImageProcessor}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
图像处理工具：
{{VCPImageProcessor}}
```

#### 使用方法

您需要先向AI发送一张图片，然后下达处理指令。

**示例指令**：
> （在发送图片后）"帮我把这张图顺时针旋转90度。"

> （在发送图片后）"将这张图片裁剪为512x512像素。"

---

## 2. 表情包列表生成器 (EmojiListGenerator)

*   **作用**：扫描指定目录下的图片文件，并生成一个可以在SillyTavern等前端直接使用的表情包列表（`emoji.json`）。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPEmojiListGenerator}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
表情包列表生成：
{{VCPEmojiListGenerator}}
```

#### 使用方法

**示例指令**：
> "帮我扫描`path/to/my/stickers`目录，为SillyTavern创建一个表情包列表。"

---

## 3. 科学计算器 (SciCalculator)

*   **作用**：为AI提供一个强大的科学计算器。当AI需要进行精确的数学计算时，它会使用此插件，而不是依赖自身可能会出错的计算能力。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPSciCalculator}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
科学计算器：
{{VCPSciCalculator}}
```

#### 使用方法

**示例指令**：
> "计算 (1.5 + 2.3) * 4.1 / 2 的结果。"

---

## 4. 天气预报员 (WeatherReporter)

*   **作用**：获取实时天气信息和未来天气预报，并通过`{{VCPWeatherInfo}}`占位符注入系统提示词。
*   **前置条件**：需要和风天气（QWeather）的API密钥。

#### API密钥获取方法

1.  访问[和风天气开发平台](https://dev.qweather.com/)
2.  注册并登录账号
3.  创建应用并获取API密钥
4.  **注意**：提供免费开发版额度

#### 配置

**配置文件位置：** 项目根目录`config.env`（全局配置）

```env
# 和风天气API密钥
WeatherKey=YOUR_QWEATHER_KEY

# 和风天气API地址
WeatherUrl=devapi.qweather.com

# 默认城市（可选）
VarCity=北京
```

**插件配置文件位置：** `Plugin/WeatherReporter/config.env`（可选配置）

```env
# 未来天气预报天数（1-30天）
forecastDays=7

# 24小时天气预报更新频率
hourlyForecastInterval=2
hourlyForecastCount=12
```

#### 启用插件

此插件作为静态插件自动在后台运行，会生成`{{VCPWeatherInfo}}`占位符供系统提示词使用。

**在系统提示词中使用**：

```
当前天气信息：
{{VCPWeatherInfo}}
```

#### 使用方法

插件会自动定期更新天气信息（每8小时），您无需手动触发。AI可以直接访问当前天气数据。

---

## 5. 随机性工具 (Randomness)

*   **作用**：提供生成随机数、掷骰子、抽塔罗牌、符文占卜等功能。在需要引入随机元素的场景（如跑团、游戏、占卜）中非常有用。
*   **前置条件**：无。

#### 配置

**插件配置文件位置：** `Plugin/Randomness/config.env`（可选配置）

```env
# 塔罗牌数据文件路径
TAROT_DECK_PATH=Plugin/Randomness/data/tarot_deck.json

# 卢恩符文数据文件路径
RUNE_SET_PATH=Plugin/Randomness/data/rune_set.json

# 扑克牌数据文件路径
POKER_DECK_PATH=Plugin/Randomness/data/poker_deck.json

# 塔罗牌牌阵数据文件路径
TAROT_SPREADS_PATH=Plugin/Randomness/data/tarot_spreads.json
```

**说明**：通常使用默认路径即可，无需修改。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPRandomness}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
随机工具：
{{VCPRandomness}}
```

#### 使用方法

**示例指令**：
> "掷一个D20骰子。"

> "生成一个1到100之间的随机数。"

> "抽三张塔罗牌。"

---

## 6. 塔罗牌占卜 (TarotDivination)

*   **作用**：一个趣味性插件，允许AI为您进行塔罗牌占卜。它会随机抽取指定数量的塔罗牌，并可以根据牌意进行解读。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPTarotDivination}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
塔罗牌占卜：
{{VCPTarotDivination}}
```

#### 使用方法

**示例指令**：
> "帮我算一下今天的运势，用一张牌的塔罗占卜。"

> "用三张牌的牌阵，看看我这个项目的未来发展。"

---

## 通用提示

### 工具组合使用

您可以在系统提示词中组合多个实用工具：

```
实用工具集：
- 图像处理：{{VCPImageProcessor}}
- 科学计算：{{VCPSciCalculator}}
- 随机工具：{{VCPRandomness}}
- 塔罗占卜：{{VCPTarotDivination}}

天气信息：
{{VCPWeatherInfo}}

请根据用户需求选择合适的工具。
```
