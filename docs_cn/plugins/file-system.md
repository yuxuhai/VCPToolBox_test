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

*   **作用**：这是核心的文件操作插件，提供了对文件进行**读取、写入、修改、删除**等一系列基础操作的能力。
*   **前置条件**：无特殊要求，建议配置允许访问的目录以提高安全性。

#### 配置

**插件配置文件位置：** `Plugin/FileOperator/config.env`

```env
# 允许访问的目录（用逗号分隔，使用绝对路径）
# 留空则允许所有目录（不推荐）
ALLOWED_DIRECTORIES=../..

# 最大文件大小（字节）
MAX_FILE_SIZE=20485760

# 最大目录列表项数
MAX_DIRECTORY_ITEMS=1000

# 最大搜索结果数
MAX_SEARCH_RESULTS=100

# 调试模式
DEBUG_MODE=true

# WebSocket设置
WEBSOCKET_HOST=localhost
WEBSOCKET_PORT=6573

# 文件操作设置
ENABLE_RECURSIVE_OPERATIONS=true
ENABLE_HIDDEN_FILES=false

# 备份设置（可选）
CREATE_BACKUPS=true
BACKUP_DIRECTORY=./backups
```

**安全建议**：
- 设置`ALLOWED_DIRECTORIES`限制AI可访问的目录范围
- 根据需要调整`MAX_FILE_SIZE`避免处理过大的文件

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/filetool.txt`或`supertool.txt`中，确保`{{VCPFileOperator}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
文件操作工具：
{{VCPFileOperator}}
```

#### 使用方法

您可以直接向AI下达操作文件的指令。

**示例指令**：
> "帮我读取一下`package.json`文件的内容。"

> "在项目根目录下创建一个名为`notes.txt`的新文件，内容是'Hello, World!'。"

> "将`notes.txt`文件中的'Hello'修改为'Hi'。"

> "删除`notes.txt`文件。"

---

## 2. 文件列表生成器 (FileListGenerator)

*   **作用**：用于列出指定目录下的所有文件和文件夹。当AI需要了解一个目录的结构时，会使用此工具。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/filetool.txt`或`supertool.txt`中，确保`{{VCPFileListGenerator}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
文件列表查看：
{{VCPFileListGenerator}}
```

#### 使用方法

AI通常会根据需要自动调用此插件。您也可以直接指定。

**示例指令**：
> "列出`Plugin/FileOperator`目录下的所有文件。"

> "看看项目根目录下都有哪些文件和文件夹。"

---

## 3. 文件树生成器 (FileTreeGenerator)

*   **作用**：以树状结构递归地展示一个目录及其所有子目录的内容。这对于AI快速掌握整个项目的代码结构非常有帮助。
*   **前置条件**：无。

#### 配置

**插件配置文件位置：** `Plugin/FileTreeGenerator/config.env`（可选配置）

```env
# 目标目录（留空则使用调用时指定的目录）
TARGET_DIRECTORY=

# 排除的目录列表（用逗号分隔，不要空格）
# 示例：.git,node_modules,.obsidian,target,__pycache__
EXCLUDE_DIRS=.git,node_modules
```

**建议配置**：
- 设置`EXCLUDE_DIRS`排除`node_modules`、`.git`等大型目录，避免生成过于庞大的树结构

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/filetool.txt`或`supertool.txt`中，确保`{{VCPFileTreeGenerator}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
文件树生成：
{{VCPFileTreeGenerator}}
```

#### 使用方法

**示例指令**：
> "帮我生成整个项目的文件结构树。"

> "以树状图的形式展示`docs_cn`目录的结构。"

---

## 4. 工作区注入器 (WorkspaceInjector)

*   **作用**：一个开发与调试工具，可以将指定目录下的所有文件内容读取并注入到AI的上下文中。这对于让AI快速理解一个小型项目的全部代码非常有用。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPWorkspaceInjector}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
工作区内容注入：
{{VCPWorkspaceInjector}}
```

#### 使用方法

**⚠️ 警告：** 此插件会消耗大量的上下文Token，请只对小型、关键的目录使用。

**示例指令**：
> "注入`Plugin/MyNewPlugin`工作区的所有内容，然后帮我分析一下代码逻辑。"

---

## 5. 文件服务器 (FileServer)

*   **作用**：启动一个受密码保护的本地HTTP服务器，用于托管文件。当AI需要生成一个文件（如`.zip`压缩包、`.docx`文档）并希望您能方便地下载时，这个插件非常有用。
*   **前置条件**：需要配置访问密钥。

#### 配置

**配置文件位置：** 项目根目录`config.env`（全局配置）

```env
# 文件服务器访问密钥
File_Key=your_secure_key_here

# 调试模式（可选）
DebugMode=false
```

**说明**：
- 服务器默认运行在6007端口
- 访问文件的URL格式：`http://localhost:6007/pw=[File_Key]/files/文件名`

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPFileServer}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
文件服务器：
{{VCPFileServer}}
```

#### 使用方法

AI通常会在需要时自动调用此插件。例如，当您指令AI压缩一个文件夹后，它可能会接着启动文件服务器，并返回一个可供您点击下载的链接。

**示例指令**：
> "请将`docs_cn`这个目录压缩成`documentation.zip`，然后提供给我下载。"

---

## 6. 图片服务器 (ImageServer)

*   **作用**：与文件服务器类似，但专门用于托管和提供图片访问。当AI生成或处理了一张图片后，它会使用此插件来为您展示图片。
*   **前置条件**：需要配置访问密钥。

#### 配置

**配置文件位置：** 项目根目录`config.env`（全局配置）

```env
# 图片服务器访问密钥
Image_Key=your_secure_image_key_here

# 文件服务器访问密钥（可选，用于文件访问）
File_Key=your_secure_file_key_here

# 调试模式（可选）
DebugMode=false
```

**说明**：
- 服务器默认运行在6006端口
- 访问图片的URL格式：`http://localhost:6006/pw=[Image_Key]/images/图片名`

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPImageServer}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
图片服务器：
{{VCPImageServer}}
```

#### 使用方法

此插件几乎总是由其他插件（如`NovelAIGen`, `ComfyUIGen`等）在生成图片后自动调用。您通常无需直接与其交互。AI生成图片后，会返回一个指向该图片服务器的URL，前端界面（如SillyTavern, OpenWebUI）可以直接渲染这张图片。

---

## 7. PowerShell 执行器 (PowerShellExecutor)

*   **作用**：允许AI直接执行PowerShell（在Windows上）或Shell（在Linux/macOS上）命令。这是一个极其强大的功能，赋予了AI几乎无限的系统操作能力。
*   **前置条件**：无。

#### 配置

无需配置，开箱即用。

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/filetool.txt`或`supertool.txt`中，确保`{{VCPPowerShellExecutor}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
命令执行工具：
{{VCPPowerShellExecutor}}
```

#### 使用方法

**⚠️ 安全警告：** 执行命令具有潜在风险。请确保您完全理解AI将要执行的命令。

**示例指令**：
> "执行`node -v`命令，看看Node.js的版本。"

> "帮我运行`npm install`来安装项目依赖。"

> "列出当前目录下所有的`.js`文件。" (AI可能会调用`ls *.js`或`dir *.js`)

---

## 通用提示

### 安全最佳实践

1. **限制访问范围**：在FileOperator中设置`ALLOWED_DIRECTORIES`
2. **保护密钥**：为FileServer和ImageServer设置强密码
3. **谨慎授权**：PowerShellExecutor具有系统级权限，使用时需谨慎
4. **定期备份**：启用FileOperator的备份功能

### 工具组合使用

您可以在系统提示词中组合多个文件操作工具：

```
文件系统工具：
- 文件操作：{{VCPFileOperator}}
- 目录查看：{{VCPFileListGenerator}}
- 结构展示：{{VCPFileTreeGenerator}}
- 命令执行：{{VCPPowerShellExecutor}}

请根据用户需求选择合适的工具。
```
