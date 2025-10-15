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
*   **前置条件**：无。开箱即用。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPImageProcessor}}`行没有被注释。

#### 使用方法
您需要先向AI发送一张图片，然后下达处理指令。

**示例指令**：
> （在发送图片后）“帮我把这张��顺时针旋转90度。”

> （在发送图片后）“将这张图片裁剪为512x512像素。”

---

## 2. 表情包列表生成器 (EmojiListGenerator)

*   **作用**：扫描指定目录下的图片文件，并生成一个可以在SillyTavern等前端直接使用的表情包列表（`emoji.json`）。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPEmojiListGenerator}}`行没有被注释。

#### 使用方法
**示例指令**：
> “帮我扫描`path/to/my/stickers`目录，为SillyTavern创建一个表情包列表。”

---

## 3. 科学计算器 (SciCalculator)

*   **作用**：为AI提供一个强大的科学计算器。当AI需要进行精确的数学计算时，它会使用此插件，而不是依赖自身可能会出错的计算能力。
*   **前置条件**：无。开箱即用。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPSciCalculator}}`行没有被注释。

#### 使用方法
**示例指令**：
> “计算 (1.5 + 2.3) * 4.1 / 2 的结果。”

---

## 4. 天气预报员 (WeatherReporter)

*   **作用**：获取实时天气信息和未来天气预报。
*   **前置条件**：您需要一个和风天气的API密钥。

#### 配置
1.  在`.env`文件中，找到`[插件API密钥]`部分，填入您的和风天气密钥���URL。
    ```env
    WeatherKey=YOUR_QWEATHER_KEY
    WeatherUrl=devapi.qweather.com
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPWeatherReporter}}`行没有被注释。

#### 使用方法
**示例指令**：
> “今天北京的天气怎么样？”

---

## 5. 随机性工具 (Randomness)

*   **作用**：提供生成随机数、掷骰子等功能。在需要引入随机元素的场景（如跑团、游戏）中非常有用。
*   **前置条件**：无。开箱即用。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPRandomness}}`行没有被注释。

#### 使用方法
**示例指令**：
> “掷一个D20骰子。”

> “生成一个1到100之间的随机数。”

---

## 6. 塔罗牌占卜 (TarotDivination)

*   **作用**：一个趣味性插件，允许AI为您进行塔罗牌占卜。它会随机抽取指定数量的塔罗牌，并可以根据牌意进行解读。
*   **前置条件**：无。开箱即用。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPTarotDivination}}`行没有被注释。

#### 使用方法
**示例指令**：
> “帮我算一下今天的运势，用一张牌的塔罗占卜。”

> “用三张牌的牌阵，看看我这个项目的未来发展。”
