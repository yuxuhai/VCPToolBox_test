# 外部集成：VCPChrome 浏览器扩展

VCPChrome是VCPToolBox官方出品的浏览器扩展，它在AI与您的浏览器之间建立了一座桥梁，极大地扩展了AI的感知和操作能力。

---

## VCPChrome扩展有什么用？

安装VCPChrome扩展并配合相应的插件后，您的AI将获得两项核心能力：

1.  **浏览器观察 (Browser Observation)**：AI能够“看到”您当前正在浏览的网页内容。它可以读取页面的文本、提取链接和图片，甚至理解页面的结构。这使得您可以向AI提出基于当前网页的问题。
    *   **相关插件**：[Chrome 浏览器观察者 (ChromeObserver)](../plugins/browser-agents.md#2-chrome-浏览器观察者-chromeobserver)

2.  **浏览器控制 (Browser Control)**：AI能够操作您的浏览器，就像一个遥控器。它可以打开新标签页、访问指定网址、在标签页之间切换、刷新页面等。
    *   **相关插件**：[Chrome 浏览器控制器 (ChromeControl)](../plugins/browser-agents.md#1-chrome-浏览器控制器-chromecontrol)

将这两者结合起来��就能实现非常强大的自动化工作流。例如，您可以命令AI：“打开GitHub的趋势页面，找到排名前三的Python项目，然后依次打开它们的页面并总结项目的主要功能。”

---

## 如何安装和配置？

要让VCPChrome扩展正常工作，需要同时完成**浏览器端**和**VCPToolBox端**的配置。

### 步骤一：启动Chrome的远程调试模式

这是让VCPToolBox能够与Chrome通信的先决条件。

1.  **找到Chrome快捷方式**：在您的桌面或开始菜单中找到Google Chrome的快捷方式。
2.  **修改目标属性**：
    *   右键点击快捷方式，选择“属性”。
    *   在“目标(T)”输入框中，将光标移动到内容的**最末尾**。
    *   输入一个**空格**，然后紧接着输入`--remote-debugging-port=9222`。
    *   完整的“目标”内容看起来应该像这样（路径可能因人而异）：
        `"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222`
3.  **应用并重启**：点击“确定”保存更改。**务必关闭所有正在运行的Chrome窗口**，然后使用这个修改过的快捷方式重新启动Chrome。

### 步骤二：安装VCPChrome扩展程序

1.  **打开扩展管理页面**：
    在Chrome浏览器中，输入`chrome://extensions/`并回车。

2.  **启用开发者模式**：
    在页面右上角，找到并打开“开发者模式”的开关。

3.  **加载扩展**：
    *   点击左上角的“加载已解压的扩展程序”按钮。
    *   在弹出的文件选择窗口中，找到并选择VCPToolBox项目根目录下的`VCPChrome`文件夹。
    *   点击“选择文件夹”。

您应该能看到一个新的名为“VCP Chrome Extension”的卡片出现在扩展列表中，这表示安装成功。

### 步骤三：启用相关插件

确保在您的`TVStxt/supertool.txt`（或您在`.env`中指定的工具列表文件）中，以下两行没有被`#`注释掉：

```
{{VCPChromeControl}}
{{VCPChromeObserver}}
```

完成以上所有步骤后，重启VCPToolBox服务。现在，您的AI已经具备了与浏览器交互的能力！

---

## 使用示例

*   **总结网页**：
    > 打开任意一个新闻文章页面，然后对AI说：“帮我总结一下当前页面的内容。”

*   **网页导航**：
    > “打开 b站 首页。”
    > “然后搜索‘VCPToolBox’。” (这需要AI知道如何在特定网站的搜索框中输入内容)

*   **信息提取**：
    > 打开一个商品页面，然后对AI说：“帮我找到这个页面的价格和用户评分。”
