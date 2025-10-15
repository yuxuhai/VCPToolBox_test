# 插件详解：文件与系统操作

文件与系统操作插件是VCPToolBox中最为强大和灵活的工具之一。它们赋予了AI直接与您本地计算机文件系统交互的能力，甚至可以执行系统命令。这使得AI可以成为一个真正的编程助手、文件管理员和系统操作员。

**⚠️ 安全警告：** 由于这些插件可以直接修改您的文件和执行命令，请确保只在您信任的环境中运行VCPToolBox，并保护好您的`ADMIN_API_KEY`，防止未经授权的访问。

---

## 目录
1.  [文件操作器 (FileOperator)](#1-文件操作器-fileoperator)
2.  [文件列表生成器 (FileListGenerator)](#2-文件列表生成器-filelistgenerator)
3.  [文件树生成器 (FileTreeGenerator)](#3-文件树生成器-filetreegenerator)
4.  [工作区注入器 (WorkspaceInjector)](#4-工作区注入器-workspaceinjector)
5.  [文件服务器 (FileServer)](#5-文件服务器-fileserver)
6.  [图片服务器 (ImageServer)](#6-图片服务器-imageserver)
7.  [PowerShell 执行器 (PowerShellExecutor)](#7-powershell-执行器-powershellexecutor)

---

## 1. 文件操作器 (FileOperator)

*   **作用**：这是核心的文件操作插件，提供了对文件进行**读取、写入、修改、删除**等一列基础操作的能力。
*   **前置条件**：无。开箱即用。

#### 配置

*   默认情况下，`FileOperator`的操作范围被限制在VCPToolBox的项目目录内，以保证安全。
*   您可以在`Plugin/FileOperator/config.env`文件中修改`WORKSPACE_PATH`来指定AI可以操作的工作区根目录。**请谨慎修改此项**。
    ```env
    # 定义AI可以访问的文件系统根路径
    WORKSPACE_PATH=./
    ```
*   在`TVStxt/filetool.txt`或`supertool.txt`中，确保`{{VCPFileOperator}}`行没有被注释。

#### 使用方法

您可以直接向AI下达操作文件的指令。

**示例指令**：
> “帮我读取一下`package.json`文件的内容。”

> “在项目根目录下创建一个名为`notes.txt`的新文件，内容是‘Hello, World!’。”

> “将`notes.txt`文件中的‘Hello’修改为‘Hi’。”

> “删除`notes.txt`文件。”

---

## 2. 文件列表生成器 (FileListGenerator)

*   **作用**：用于列出指定目录下的所有文件和文件夹。当AI需要了解一个目录的结构时，会使用此工具。
*   **前置条件**：无。开箱即用。

#### 配置

*   在`TVStxt/filetool.txt`或`supertool.txt`中，确保`{{VCPFileListGenerator}}`行没有被注释。

#### 使用方法

AI通常会根据需要自动调用此插件。您也可以直接指定。

**示例指令**：
> “列出`Plugin/FileOperator`目录下的所有文件。”

> “看看项目根目录下都有哪些文件和文件夹。”

---

## 3. 文件树生成器 (FileTreeGenerator)

*   **作用**：以树状结构递归地展示一个目录及其所有子目录的内容。这对于AI快速掌握整个项目的代码结构非常有帮助。
*   **前置条件**：无。开箱即用。

#### 配置

*   在`Plugin/FileTreeGenerator/config.env.example`中，您可以配置一些忽略规则，以避免展示`node_modules`这类庞大而无意义的目录。建议将此文件复制为`config.env`并根据需要修改。
    ```env
    # 忽略的目录和文件，用逗号分隔
    IGNORE_PATTERNS=node_modules,.git,*.log
    ```
*   在`TVStxt/filetool.txt`或`supertool.txt`中，确保`{{VCPFileTreeGenerator}}`行没有被注释。

#### 使用方法

**示例指令**：
> “帮我生成整个项目的文件结构树。”

> “以树状图的形式展示`docs_cn`目录的结构。”

---

## 4. 工作区注入器 (WorkspaceInjector)

*   **作用**：一个开发与调试工具，可以将指定目录下的所有文件内容读取并注入到AI的上下文中。这对于让AI快速理解一个小型项目的全部代码非常有用。
*   **前置条件**：无。

#### 配置
*   在`TVStxt/supertool.txt`中，确保`{{VCPWorkspaceInjector}}`行没有被注释。

#### 使用方法
**⚠️ 警告：** 此插件会消耗大量的上下文Token，请只对小型、关键的目录使用。

**示例指令**：
> “注入`Plugin/MyNewPlugin`工作区的所有内容，然后帮我分析一下代码逻辑。”

---

## 5. 文件服务器 (FileServer)

*   **作用**：启动一个临时的本地HTTP服务器，用于托管文件。当AI需要生成一个文件（如`.zip`压缩包、`.docx`文档）并希望您能方便地下载时，这个插件非常有用。
*   **前置条件**：无。

#### 配置
*   在`.env`文件中，您可以配置服务器的默认端口和主机地址：
    ```env
    FILE_SERVER_PORT=6007
    FILE_SERVER_HOST=0.0.0.0
    ```
*   在`TVStxt/supertool.txt`中，确保`{{VCPFileServer}}`行没有被注释。

#### 使用方法
AI通常会在需要时自动调用此插件。例如，当您指令AI压缩一个文件夹后，它可能会接着启动文件服务器，并返回一个可供您点击下载的链接。

**示例指令**：
> “请将`docs_cn`这个目录压缩成`documentation.zip`，然后提供给我下载。”

---

## 6. 图片服务器 (ImageServer)

*   **���用**：与文件服务器类似，但专门用于托管和提供图片访问。当AI生成或处理了一张图片后，它会使用此插件来为您展示图片。
*   **前置条件**：无。

#### 配置
*   在`.env`文件中，您可以配置服务器的默认端口和主机地址：
    ```env
    IMAGE_SERVER_PORT=6006
    IMAGE_SERVER_HOST=0.0.0.0
    ```
*   在`TVStxt/supertool.txt`中，确保`{{VCPImageServer}}`行没有被注释。

#### 使用方法
此插件几乎总是由其他插件（如`NovelAIGen`, `ComfyUIGen`等）在生成图片后自动调用。您通常无需直接与其交互。AI生成图片后，会返回一个指向该图片服务器的URL，前端界面（如SillyTavern, OpenWebUI）可以直接渲染这张图片。

---

## 7. PowerShell 执行器 (PowerShellExecutor)

*   **作用**：允许AI直接执行PowerShell（在Windows上）或Shell（在Linux/macOS上）命令。这是一个极其强大的功能，赋予了AI几乎无限的系统操作能力。
*   **前置条件**：无。开箱即用。

#### 配置

*   在`TVStxt/filetool.txt`或`supertool.txt`中，确保`{{VCPPowerShellExecutor}}`行没有被注释。

#### 使用方法

**⚠️ 再次警告：** 执行命令具有潜在风险。请确保您完全理解AI将要执行的命令。

**示例指令**：
> “执行`node -v`命令，看看Node.js的版本。”

> “帮我运行`npm install`来安装项目依赖。”

> “列出当前目录下所有的`.js`文件。” (AI可能会调用`ls *.js`或`dir *.js`)
