# 插件详解：AI能力与内容生成

这类插件是VCPToolBox的创意核心,它们赋予AI直接生成各种内容的能力,从精美的图像到动听的音乐,甚至是视频。本篇将详细介绍如何配置和使用这些强大的生成类插件。

---

## 目录
1.  [NovelAI 图像生成 (NovelAIGen)](#1-novelai-图像生成-novelaigen)
2.  [豆包图像生成 (DoubaoGen)](#2-豆包图像生成-doubaogen)
3.  [DMX 豆包图像生成 (DMXDoubaoGen)](#3-dmx-豆包图像生成-dmxdoubaogen)
4.  [Flux 图像生成 (FluxGen)](#4-flux-图像生成-fluxgen)
5.  [Suno AI 音乐生成 (SunoGen)](#5-suno-ai-音乐生成-sunogen)
6.  [视频生成 (VideoGenerator)](#6-视频生成-videogenerator)
7.  [ComfyUI 图像生成 (ComfyUIGen)](#7-comfyui-图像生成-comfyuigen)
8.  [Gemini 图像生成 (GeminiImageGen)](#8-gemini-图像生成-geminiimagegen)
9.  [NanoBananaGenOR (超分辨率)](#9-nanobananagenor-超分辨率)

---

## 1. NovelAI 图像生成 (NovelAIGen)

*   **作用**：允许AI调用[NovelAI](https://novelai.net/)的服务来生成高质量的动漫风格图像。
*   **前置条件**：您需要拥有一个NovelAI账号,并获取API密钥。

#### API密钥获取方法

1.  访问 [NovelAI官网](https://novelai.net/)
2.  注册账号并订阅服务（需要付费订阅才能使用API）
3.  登录后,访问账号设置页面
4.  在API设置中生成并复制您的API密钥

#### 配置

**方法一：通过插件配置文件（推荐）**

1.  找到插件配置文件：`Plugin/NovelAIGen/config.env`（如果不存在,请复制`Plugin/NovelAIGen/config.env.example`并重命名）
2.  填入您的NovelAI API密钥：
    ```env
    # NovelAI API 配置
    # 在 https://novelai.net/ 获取您的 API 密钥
    NOVELAI_API_KEY=your_novelai_api_key_here
    
    # 是否为此插件启用调试模式 (true/false)
    DebugMode=false
    ```

**方法二：通过Web管理面板**

1.  访问VCP管理面板：`http://<您的服务器IP>:<端口>/AdminPanel`
2.  进入"插件中心"
3.  找到"NovelAIGen"插件
4.  点击配置按钮,填入API密钥

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`文件中,确保`{{VCPNovelAIGen}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
NovelAI图像生成：
{{VCPNovelAIGen}}
```

#### 使用方法

直接向AI发出指令即可。AI会根据您的描述,自动构建请求并调用NovelAI进行绘图。

**示例指令**：
> "帮我画一个金发蓝眼的魔法少女,她正站在星空下吟唱咒语。"

---

## 2. 豆包图像生成 (DoubaoGen)

*   **作用**：调用字节跳动旗下"豆包"模型的图像生成能力。
*   **前置条件**：需要获取豆包服务的API密钥。

#### API密钥获取方法

1.  访问[火山引擎控制台](https://console.volcengine.com/)
2.  注册并登录账号
3.  在产品服务中找到"豆包大模型"或"视觉智能"服务
4.  创建应用并获取API Key和API URL
5.  注意：该服务可能需要企业认证和实名认证

#### 配置

**插件配置文件位置：** `Plugin/DoubaoGen/config.env`

```env
# 豆包 API 配置
DOUBAO_API_KEY=your_doubao_api_key_here
DOUBAO_API_URL=https://ark.cn-beijing.volces.com/api/v3
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`文件中,确保`{{VCPDoubaoGen}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
豆包图像生成：
{{VCPDoubaoGen}}
```

#### 使用方法

**示例指令**：
> "用豆包画一只正在喝咖啡的可爱熊猫。"

---

## 3. DMX 豆包图像生成 (DMXDoubaoGen)

*   **作用**：调用豆包模型的另一个版本（DMX）进行图像生成。它可能在某些场景下提供与标准`DoubaoGen`不同的风格或效果。
*   **前置条件**：与`DoubaoGen`共享相同的API密钥。

#### 配置

**插件配置文件位置：** `Plugin/DMXDoubaoGen/config.env`

此插件使用与`DoubaoGen`相同的API配置,您可以复用相同的密钥。

#### 启用插件

有两种方式启用此插件：

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`文件中,确保`{{VCPDMXDoubaoGen}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
图像生成工具：
{{VCPDMXDoubaoGen}}
```

#### 使用方法

**示例指令**：
> "用DMX豆包模型画一只正在喝咖啡的可爱熊猫。"

---

## 4. Flux 图像生成 (FluxGen)

*   **作用**：调用硅基流动(SiliconFlow)的Flux模型进行图像生成,这是一个速度快、效果好的开源模型。
*   **前置条件**：需要获取硅基流动服务的API密钥。

#### API密钥获取方法

1.  访问[硅基流动官网](https://siliconflow.cn/)
2.  注册并登录账号（支持微信/GitHub登录）
3.  进入控制台,点击"API密钥"
4.  创建新的API密钥并复制
5.  **注意**：新用户通常会获得免费额度,可直接使用

#### 配置

**方法一：全局配置（推荐,多个插件共用）**

在项目根目录的`config.env`文件中配置：
```env
# 硅基流动 (SiliconFlow): 用于图片/视频生成
# 注册并获取Key: https://siliconflow.cn/
SILICONFLOW_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

**方法二：插件独立配置**

在`Plugin/FluxGen/config.env`文件中配置：
```env
# 硅基流动API密钥
SILICONFLOW_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`文件中,确保`{{VCPFluxGen}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
Flux图像生成：
{{VCPFluxGen}}
```

#### 使用方法

**示例指令**：
> "使用Flux模型,生成一张赛博朋克风格的城市夜景照片。"

---

## 5. Suno AI 音乐生成 (SunoGen)

*   **作用**：调用[Suno AI](https://suno.ai/)的服务,根据您的描述生成包含人声和配乐的完整歌曲。
*   **前置条件**：需要Suno API服务密钥。

#### API密钥获取方法

1.  访问支持Suno API的服务商（如NewAPI等聚合服务）
2.  注册并获取API密钥
3.  确认服务商支持Suno音乐生成功能

#### 配置

**插件配置文件位置：** `Plugin/SunoGen/config.env`

```env
# Suno API密钥
SunoKey=your_suno_api_key_here

# Suno API基础URL（根据您的服务商填写）
SunoApiBaseUrl=https://your-api-provider.com
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`文件中,确保`{{VCPSunoGen}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
音乐生成工具：
{{VCPSunoGen}}
```

#### 使用方法

您可以指定歌词、风格,甚至让AI帮您创作歌词。

**示例指令**：
> "用Suno帮我创作一首关于夏天和冰淇淋的流行歌曲,歌词要欢快一些。"

> "用Suno生成一首纯音乐,风格是平静的钢琴曲,适合在读书时听。"

---

## 6. 视频生成 (VideoGenerator)

*   **作用**：调用硅基流动（SiliconFlow）的Wan2.1模型,实现文生视频或图生视频的功能。
*   **前置条件**：需要硅基流动的API密钥（与FluxGen共用）。

#### 配置

此插件使用全局的`SILICONFLOW_API_KEY`配置,请参考[Flux 图像生成](#4-flux-图像生成-fluxgen)部分的API密钥获取和配置方法。

**可选配置**（通常使用默认值即可）：

如需自定义模型,可编辑`Plugin/VideoGenerator/config.env`：
```env
Image2VideoModelName="Wan-AI/Wan2.1-I2V-14B-720P-Turbo"
Text2VideoModelName="Wan-AI/Wan2.1-T2V-14B-Turbo"
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`文件中,确保`{{VCPVideoGenerator}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
视频生成工具：
{{VCPVideoGenerator}}
```

#### 使用方法

**示例指令**：
> "生成一段视频,内容是一只蝴蝶在花丛中飞舞。"

> （在您发送一张图片后）"把这张图片变成一段动态视频。"

**注意**：视频生成为异步任务,提交后需要等待一段时间。AI会在生成完成后通过通知告知您结果。

---

## 7. ComfyUI 图像生成 (ComfyUIGen)

*   **作用**：这是一个功能极其强大的插件,它允许VCPToolBox与[ComfyUI](https://github.com/comfyanonymous/ComfyUI)服务进行联动。ComfyUI是一个基于节点的工作流图像生成界面,通过这个插件,AI可以直接调用您在ComfyUI中设计好的复杂工作流来生成图片。

#### 前置条件

1.  **ComfyUI实例**：您需要一个正在运行的ComfyUI实例
2.  **必要插件**：
    - ComfyUI Manager（用于管理节点和模型）
    - websocket_image_save节点（用于图像保存）
3.  **启动参数**：ComfyUI需要使用特定参数启动以允许跨域访问

#### ComfyUI 安装和配置

**1. 安装ComfyUI**

```bash
# 克隆ComfyUI仓库
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI

# 安装依赖
pip install -r requirements.txt
```

**2. 安装必要的节点**

- 安装ComfyUI Manager：按照[官方说明](https://github.com/ltdrdata/ComfyUI-Manager)安装
- 通过Manager安装websocket_image_save节点

**3. 启动ComfyUI**

```bash
# 需要添加 --listen 和 --enable-cors 参数
python main.py --listen --enable-cors --port 8188
```

**参数说明**：
- `--listen`：允许外部访问
- `--enable-cors`：启用跨域资源共享
- `--port 8188`：指定端口（默认8188）

#### VCP端配置

**方法一：通过全局配置文件**

在项目根目录的`config.env`中添加（如果不存在此配置项）：
```env
# ComfyUI服务器地址
COMFYUI_BASE_URL=http://127.0.0.1:8188
```

**方法二：通过插件配置文件**

在`Plugin/ComfyUIGen/config.env`中配置：
```env
# ComfyUI服务器地址（本地部署）
COMFYUI_BASE_URL=http://localhost:8188

# 如果是远程部署,使用实际IP
# COMFYUI_BASE_URL=http://192.168.1.100:8188

# API密钥（通常本地部署无需设置）
# COMFYUI_API_KEY=

# 调试模式
DEBUG_MODE=false
```

**方法三：通过Web管理面板（推荐）**

1.  访问VCP管理面板
2.  进入"插件中心"
3.  找到"ComfyUIGen"插件
4.  点击配置按钮,填入ComfyUI服务器地址
5.  点击"测试连接"验证配置是否正确

#### 工作流配置

**准备工作流文件**：

1.  在ComfyUI界面中设计并调试好您的工作流
2.  点击"Save (API Format)"保存为API格式的JSON文件
3.  将JSON文件放入`Plugin/ComfyUIGen/workflows/`目录

插件提供了一些示例工作流：
- `text2img_basic.json` - 基础文生图
- 您可以添加更多自定义工作流

#### 启用插件

有两种方式启用此插件：

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`文件中,确保`{{VCPComfyUIGen}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
ComfyUI专业图像生成：
{{VCPComfyUIGen}}
```

**高级用法** - 为AI提供工作流信息：
```
ComfyUI工作流引擎：
{{VCPComfyUIGen}}

可用工作流模板：
- text2img_basic: 基础文生图
- portrait_lora: 人像生成（支持LoRA）
- landscape_xl: 风景画（SDXL）

使用时请指定工作流名称和必要参数。
```

#### 使用方法

调用时,您需要告诉AI使用哪个工作流,并提供必要的参数。

**基础示例**：
> "使用ComfyUI的`text2img_basic`工作流生成一张图片。提示词是'一个宇航员在月球上骑马',负面提示词是'画质差,模糊'。"

**复杂工作流示例**：
> "用ComfyUI生成图片,使用我的自定义工作流`portrait_lora`,提示词是'一位穿着中式服装的女性',使用LoRA模型'hanfu_v1',LoRA强度0.8,CFG scale设为7。"

**提示**：
- ComfyUIGen的能力完全取决于您设计的工作流有多强大
- 建议先在ComfyUI界面中调试好工作流,确认各个节点参数正确
- 复杂工作流可能需要在AI的指令中提供更多参数
- 插件目录下的`README_PLUGIN_CN.md`有更详细的技术说明

---

## 8. Gemini 图像生成 (GeminiImageGen)

*   **作用**：调用Google Gemini模型的原生图像生成能力（Imagen 3）。
*   **前置条件**：需要Gemini API密钥,支持图像生成的模型。

#### API密钥获取方法

1.  访问[Google AI Studio](https://aistudio.google.com/)
2.  注册并登录Google账号
3.  创建API密钥
4.  或使用支持Gemini的API聚合服务（如NewAPI）

#### 配置

**插件配置文件位置：** `Plugin/GeminiImageGen/config.env`

```env
# Gemini API密钥（可填入多个,用逗号分隔）
GeminiImageKey=your_key_1,your_key_2,your_key_3

# 如需代理访问,填入代理地址（可选）
GeminiImageProxy=http://127.0.0.1:7890
```

**支持的模型**：
- `gemini-2.0-flash-exp-image-generation`（推荐）
- 其他支持图像生成的Gemini系列模型

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`文件中,确保`{{VCPGeminiImageGen}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
Gemini图像生成：
{{VCPGeminiImageGen}}
```

#### 使用方法

**示例指令**：
> "用Gemini画一幅水彩画,内容是海边的日落。"

> "使用Gemini Image Gen创建一张照片,主题是未来城市的空中花园。"

---

## 9. NanoBananaGenOR (Gemini 2.5图像生成)

*   **作用**：通过OpenRouter服务调用Google Gemini 2.5 Flash模型进行图像生成。
*   **前置条件**：需要OpenRouter API密钥。

#### API密钥获取方法

1.  访问[OpenRouter官网](https://openrouter.ai/)
2.  注册并登录账号
3.  在控制台创建API密钥
4.  **注意**：OpenRouter是一个AI模型聚合平台,可访问多种模型

#### 配置

**插件配置文件位置：** `Plugin/NanoBananaGenOR/config.env`

```env
# OpenRouter API密钥（可填入多个,用逗号分隔）
OpenRouterKeyImage=<your-openrouter-key-1>,<your-openrouter-key-2>

# 如需代理访问,填入代理地址（可选）
OpenRouterProxy=http://127.0.0.1:7890

# 分布式图床服务器地址（可选,用于处理file://路径）
DIST_IMAGE_SERVERS=
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`文件中,确保`{{VCPNanoBananaGenOR}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
Gemini 2.5图像生成：
{{VCPNanoBananaGenOR}}
```

#### 使用方法

您需要先向AI发送一张图片,然后指令AI使用此插件进行处理。

**示例指令**：
> （在发送一张低分辨率图片后）"请用NanoBanana增强这张图片的细节和分辨率。"

> "使用超分辨率插件放大这张图片,提升清晰度。"

---

## 通用提示

### 如何在Agent提示词中添加工具说明

在您的Agent配置文件中,添加工具列表引用即可：

```
系统工具：{{VarToolList}}
```

或者直接指定特定工具：

```
可用的图像生成工具：
{{VCPFluxGen}}
{{VCPNovelAIGen}}
{{VCPComfyUIGen}}
```

### 多工具组合使用示例

您可以在系统提示词中同时添加多个工具占位符：

```
可用的内容创作工具：
- 图像生成：{{VCPFluxGen}}
- 音乐生成：{{VCPSunoGen}}
- 视频生成：{{VCPVideoGenerator}}

请根据用户需求选择合适的工具。
```
