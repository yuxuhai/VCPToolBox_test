# 外部集成：SillyTavern

[SillyTavern](https://github.com/SillyTavern/SillyTavern)是一个非常受欢迎的、功能强大的AI角色扮演聊天前端。VCPToolBox与SillyTavern的集成，旨在将VCPToolBox强大的插件系统、知识库和多代理能力，作为SillyTavern的“超级后端”，为其注入无限可能。

---

## 集成能带来什么？

将VCPToolBox作为SillyTavern的后端，您可以：

*   **让您的角色拥有“超能力”**：您的SillyTavern角色将能够使用VCPToolBox的所有插件，例如上网搜索、生成图片、查询天气、操作文件等。
*   **实现长期记忆**：通过VCPToolBox的知识库（DailyNote）系统，您的角色可以将对话的关键内容记录下来，并在未来的对话中“回忆”起来。
*   **动态上下文注入**：使用`VCPTavern`插件，可以根据对话动态地将预设的文本块（如世界观设定、地点描述、人物背景）注入到上下文中，极大地丰富角色扮演的深度和一致性。
*   **增强前端体验**：通过配套的用户脚本（Userscripts）和主题，可以优化SillyTavern的界面，例如美化日记和VCP工具调用的显示效果。

---

## 如何配置集成？

### 步骤一：将VCPToolBox作为SillyTavern的API后端

1.  **启动VCPToolBox**：确保您的VCPToolBox服务正在运行。

2.  **配置SillyTavern**：
    *   启动SillyTavern。
    *   点击顶部菜单栏的“API连接”按钮（🔌图标）。
    *   在连接预设中，选择一个卡槽，将API类型设置为`OpenAI`。
    *   在下方的`OpenAI Keys`部分，填入VCPToolBox的API地址和密钥：
        *   **API Base URL**：`http://<您的VCPToolBox服务器IP>:6005/v1`
          *   如果SillyTavern和VCPToolBox在同一台机器上，IP就是`127.0.0.1`。
          *   `/v1`是必需的路径。
        *   **API Key**：填入您在VCPToolBox的`.env`文件中设置的`Key`。
    *   点击“连接”按钮。如果状态显示为绿色“已连接”，则表示后端配置成功。

### 步骤二：使用`VCPTavern`插件进行动态上下文注入

`VCPTavern`插件是一个强大的工具，它允许您预先定义一些文本块（我们称之为“预设”），然后在对话中通过简单的命令，让AI将这些文本块的内容动态地注入到对话的上下文或系统提示词中。

1.  **创建预设**：
    *   进入VCPToolBox项目下的`Plugin/VCPTavern/presets/`目录。
    *   这里已经有一些示例`.json`文件，如`dailychat.json`和`RPGMaster.json`。
    *   您可以复制并修改一个示例，或创建一个新的`YourPresetName.json`文件。
    *   文件内容格式如下：
        ```json
        {
          "name": "世界观设定",
          "description": "注入关于'艾瑞大陆'的核心世界观和历史背景。",
          "content": "艾瑞大陆是一片魔法与科技交织的奇幻之地。三大王国分庭抗礼，古老的巨龙在天际盘旋..."
        }
        ```

2.  **在SillyTavern中使用**：
    *   在SillyTavern的系统提示词（或角色的描述、世界信息等）中，使用`{{VCPTavern::预设名}}`的格式来引用您创建的预设。
    *   `预设名`就是您创建的JSON文件的文件名（不含`.json`后缀）。
    *   **示例**：
        在世界信息（World Info）中加入一条：
        `Keywords: 世界观`
        `Content: {{VCPTavern::WorldSetting}}`
        当您在对话中提到“世界观”时，`VCPTavern`插件就会被触发，将`WorldSetting.json`文件中的`content`内容注入到上下文中，让AI能够基于这个设定进行回答。
    *   在`TVStxt/supertool.txt`中，确保`{{VCPTavern}}`行没有被注释。

### 步骤三：安装前端优化脚本（可选）

为了获得最佳的视觉体验，您可以安装`SillyTavernSub`目录下的配套文件。

1.  **油猴用户脚本 (Userscripts)**：
    *   您需要为您的浏览器安���[Tampermonkey](https://www.tampermonkey.net/)（篡改猴）或类似的用户脚本管理器。
    *   将`SillyTavernSub/`目录下的`.js`文件（如`ST油猴插件-酒馆VCP-VCP渲染.js`）的内容复制到Tampermonkey中，创建为新的用户脚本。
    *   这些脚本会自动美化VCPToolBox在SillyTavern中的输出格式。

2.  **主题与正则**：
    *   `ST主题布局... .json`是SillyTavern的界面主题文件，可以在SillyTavern的UI设置中导入。
    *   `ST正则... .json`是SillyTavern的正则表达式文件，可以在“扩展”->“文本清理”中导入，用于优化特定内容的显示。

完成这些配置后，您的SillyTavern将与VCPToolBox深度集成，成为一个无所不能的超级AI角色扮演平台。
