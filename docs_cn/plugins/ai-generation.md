# 插件详解：AI能力与内容生成

这类插件是VCPToolBox的创意核心，它们赋予AI直接生成各种内容的能力，从精美的图像到动听的音乐，甚至是视频。本篇将详细介绍如何配置和使用这些强大的生成类插件。

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
*   **前置条件**：您需要拥有一个NovelAI账号，并获取API密钥。

#### 配置

1.  在`.env`文件中找到并填入NovelAI的配置：
    ```env
    # NovelAI API Key
    NOVELAI_API_KEY=YOUR_NOVELAI_KEY

    # NovelAI API URL (通常无需修改)
    NOVELAI_API_URL=https://api.novelai.net
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPNovelAIGen}}`行没有被注释。

#### 使用方法

直接向AI发出指令即可。AI会根据您的描述，自动构建请求并调用NovelAI进行绘图。

**示例指令**：
> “帮我画一个金发蓝眼的魔法少女，她正站在星空下吟唱咒语。”

---

## 2. 豆包图像生成 (DoubaoGen)

*   **作用**：调用字节跳动旗下“豆包”模型的图像生成能力。
*   **前置条件**：需要获取豆包服务的API密钥。

#### 配置

1.  在`.env`文件中找到并填入豆包的配置：
    ```env
    # Doubao API Key
    DOUBAO_API_KEY=YOUR_DOUBAO_KEY

    # Doubao API URL (如有特殊需要可修改)
    DOUBAO_API_URL=https://api.doubao.com/v1
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPDoubaoGen}}`行没有被注释。

#### 使用方法

**示例指令**：
> “用豆包画一只正在喝咖啡的可爱熊猫。”

---

## 3. DMX 豆包图像生成 (DMXDoubaoGen)

*   **作用**：调用豆包模型的另一个版本（DMX）进行图像生成。它可能在某些场景下提供与标准`DoubaoGen`不同的风格或效果。
*   **前置条件**：与`DoubaoGen`共享相同的API密钥。

#### 配置

1.  此插件使用与`DoubaoGen`相同的`DOUBAO_API_KEY`和`DOUBAO_API_URL`。
2.  在`TVStxt/supertool.txt`中，确保`{{VCPDMXDoubaoGen}}`行没有被注释。

#### 使用方法

**示例指令**：
> “用DMX豆包模型画一只正在喝咖啡的可爱熊猫。”

---

## 4. Flux 图像生成 (FluxGen)

*   **作用**：调用Black-Mamba的[Flux](https://flux.black-mamba.top/)模型进行图像生成，这是一个速度快、效果好的新模型。
*   **前置条件**：需要获取Flux服务的API密钥。

#### 配置

1.  在`.env`文件中找到并填入Flux的配置：
    ```env
    # Flux API Key
    FLUX_API_KEY=YOUR_FLUX_KEY

    # Flux API URL (通常无需修改)
    FLUX_API_URL=https://api.flux.black-mamba.top
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPFluxGen}}`行没有被注释。

#### 使用方法

**示例指令**：
> “使用Flux模型，生成一张赛博朋克风格的城市夜景照片。”

---

## 5. Suno AI 音乐生成 (SunoGen)

*   **作用**：调用[Suno AI](https://suno.ai/)的服务，根据您的描述生成包含人声和配乐的完整歌曲。
*   **前置条件**：需要一个Suno账号，并获取相应的Cookie信息。

#### 配置

1.  在`.env`文件中找到并填入Suno的配置：
    ```env
    # Suno Cookie
    SUNO_COOKIE=__client=YOUR_SUNO_COOKIE_VALUE;
    ```
    *获取Cookie的方法请参考相关社区教程。*
2.  在`TVStxt/supertool.txt`中，确保`{{VCPSunoGen}}`行没有被注释。

#### 使用方法

您可以指定歌词、风格，甚至让AI帮您创作歌词。

**示例指令**：
> “用Suno帮我创作一首关于夏天和冰淇淋的流行歌曲，歌词要欢快一些。”

> “用Suno生成一首纯音乐，风格是平静的钢琴曲，适合在读时听。”

---

## 6. 视频生成 (VideoGenerator)

*   **作用**：调用硅基流动（SiliconFlow）的[Wan2.1](https://siliconflow.cn/)模型，实现文生视频或图生视频的功能。
*   **前置条件**：需要注册硅基流动账号并获取API密钥。

#### 配置

1.  在`.env`文件中，找到`[插件API密钥]`部分，填入您的密钥：
    ```env
    # 硅基流动 (SiliconFlow): 用于图片/视频生成。注册并获取Key: https://siliconflow.cn/
    SILICONFLOW_API_KEY=YOUR_SILICONFLOW_KEY_SUCH_AS_sk-xxxxxxxxxxxxxxxxxxxxxxxx
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPVideoGenerator}}`行没有被注释。

#### 使用方法

**示例指令**：
> “生成一段视频，内容是一只蝴蝶在花丛中飞���。”

> （在您发送一张图片后）“把这张图片变成一段动态视频。”

---

## 7. ComfyUI 图像生成 (ComfyUIGen)

*   **作用**：这是一个功能极其强大的插件，它允许VCPToolBox与[ComfyUI](https://github.com/comfyanonymous/ComfyUI)服务进行联动。ComfyUI是一个基于节点的工作流图像生成界面，通过这个插件，AI可以直接调用您在ComfyUI中设计好的复杂工作流来生成图片。
*   **前置条件**：
    1.  您需要一个正在运行的ComfyUI实例。
    2.  您的ComfyUI需要安装`ComfyUI Manager`和`websocket_image_save.py`节点。
    3.  需要将ComfyUI的启动参数设置为允许CORS，例如`--listen --enable-cors`。

#### 配置

1.  **VCPToolBox端**：
    在`.env`文件中，配置ComfyUI的地址：
    ```env
    # ComfyUI服务器地址
    COMFYUI_BASE_URL=http://127.0.0.1:8188
    ```
    *请将`127.0.0.1:8188`替换为您的ComfyUI实例的实际地址。*

2.  **ComfyUI端**：
    *   本插件利用ComfyUI的工作流模板（Workflow Template）功能。您需要将设计好的工作流保存为API格式的JSON文件。
    *   插件的`Plugin/ComfyUIGen/workflows/`目录下提供了一些示例工作流，如`text2img_basic.json`。
    *   您需要将您的工作流JSON文件放入此目录，或者在调用时指定完整路径。

#### 使用方法

调用时，您需要告诉AI使用哪个工作流，并提供填充工作流模板所需的参数。

**示例指令**：
> “使用ComfyUI的`text2img_basic`工作流生成一张图片。提示词是‘一个宇航员在月球上骑马’，负面提示词是‘画质差，模糊’。”

**更复杂的工作流调用**：
如果您的工作流需要更多参数（例如，指定LoRA模型、设置CFG scale等），您也可以在指令中一并提供。AI足够聪明，能够解析您的意图并填充到工作流的对应节点中。

> **提示**：`ComfyUIGen`插件非常灵活，其能力完全取决于您设计的ComfyUI工作流有多强大。建议您先在ComfyUI界面中调试好工作流，然后将其保存为API格式，供VCPToolBox调用。插件目录下的`README_PLUGIN_CN.md`有更详细的技术说明。

2.  在`TVStxt/supertool.txt`中，确保`{{VCPComfyUIGen}}`行没有被注释。

---

## 8. Gemini 图像生成 (GeminiImageGen)

*   **作用**：调用Google Gemini模型的原生图像生成能力。
*   **前置条件**：您的后端AI模型需要是支持图像生成的Gemini系列模型。

#### 配置
*   此插件通常无需额外配置，它会直接使用您在核心配置中设置的`API_Key`和`API_URL`。
*   在`TVStxt/supertool.txt`中，确保`{{VCPGeminiImageGen}}`行没有被注释。

#### 使用方法
**示例指���**：
> “用Gemini画一幅水彩画，内容是海边的日落。”

---

## 9. NanoBananaGenOR (超分辨率)

*   **作用**：这是一个特殊的“超分辨率”插件，它调用`Nano-Banana`服务，对一张**已有的图片**进行细节增强和分辨率提升。
*   **前置条件**：需要配置`Nano-Banana`服务的API地址和密钥。

#### 配置
1.  在`.env`文件中找到并填入`Nano-Banana`的配置：
    ```env
    # Nano-Banana API URL
    NANOBANANA_API_URL=http://<your-nanobanana-ip>:port
    # Nano-Banana API Key
    NANOBANANA_API_KEY=YOUR_NANOBANANA_KEY
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPNanoBananaGenOR}}`行没有被注释。

#### 使用方法
您需要先向AI发送一张图片，然后指令AI使用此插件进行处理。

**示例指令**：
> （在发送一张低分辨率图片后）“请用NanoBanana增强这张图片的细节和分辨率。”
