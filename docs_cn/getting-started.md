# 入门指南：开始您的VCPToolBox之旅

欢迎来到VCPToolBox的世界！本指南将引导您完成从零到一的安装和基本配置过程。我们推荐使用Docker进行部署，因为这是最简单、最能保证环境一致性的方式。

---

## 1. 环境准备

在开始之前，请确保您的系统已经安装了以下软件：

*   **Git**: 用于从GitHub上下载项目代码。
*   **Docker**: 用于运行VCPToolBox容器。
*   **Docker Compose**: 用于编排和管理Docker容器。

如果您尚未安装这些工具，可以参考它们的官方文档进行安装：
*   [安装Git](https://git-scm.com/book/zh/v2/起步-安装-Git)
*   [安装Docker](https://docs.docker.com/engine/install/)
*   [安装Docker Compose](https://docs.docker.com/compose/install/)

---

## 2. 下载项目代码

打开您的终端（命令行工具），使用`git`命令将VCPToolBox项目克隆到您的本地电脑或服务器上。

```bash
git clone https://github.com/yuxuhai/VCPToolBox_test.git
```

然后，进入项目目录：

```bash
cd VCPToolBox_test
```

---

## 3. 配置您的VCPToolBox

VCPToolBox的配置是通过一个名为`.env`的文件来管理的。项目提供了一个配置模板`config.env.example`，您需要复制并重命名它，然后根据您的需求进行修改。

**步骤 3.1: 创建配置文件**

在项目根目录下，执行以下命令复制模板文件：

```bash
cp config.env.example .env
```

**步骤 3.2: 编辑配置文件**

现在，使用您喜欢的文本编辑器（如`nano`, `vim`, 或 `VS Code`）打开`.env`文件。

```bash
nano .env
```

您会看到许多配置项，以下是一些您需要**立即关注**的核心配置：

*   `ADMIN_API_KEY`: **（必需）** 设置一个您自己的密码，用于访问管理后台和API。请务必修改为一个强密码。
    ```
    ADMIN_API_KEY=YourStrongPassword
    ```

*   `OPENAI_API_KEY`: **（强烈推荐）** 填入您的OpenAI API密钥。这是许多核心AI功能（如与代理对话）的基础。
    ```
    OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
    ```

*   `OPENAI_BASE_URL`: 如果您使用第三方或自建的OpenAI兼容API服务，请在此处填入对应的URL。
    ```
    OPENAI_BASE_URL=https://api.openai.com/v1
    ```

*   `AGENT_NAME`: 选择您希望默认加载的代理。例如，要使用"Metis"，可以这样设置：
    ```
    AGENT_NAME=Metis
    ```
    可用的代理可以在`Agent`目录下找到。

> **注意**: `.env`文件中包含许多其他插件和功能的配置项。在初次启动时，您只需关注以上几项即可。其他配置可以在您需要使用特定插件时，再参考[《配置指南》](./configuration.md)和插件的详细说明进行设置。

---

## 4. 启动VCPToolBox

我们提供了`docker-compose.yml`文件，让您可以通过一条命令轻松启动VCPToolBox及其所有依赖服务。

在项目根目录下，运行以下命令：

```bash
docker-compose up -d
```

*   `docker-compose up`会根据`docker-compose.yml`的定义，自动拉取镜像并创建、启动容器。
*   `-d`参数表示在后台（detached mode）运行容器。

启动过程可能需要几分钟，因为它需要从网上下载Docker镜像。

---

## 5. 验证安装

启动完成后，VCPToolBox服务将在默认端口`7860`上运行。

打开您的浏览器，访问 `http://<您的服务器IP或localhost>:7860/admin`。

*   如果您是在本地电脑上部署，请访问 `http://localhost:7860/admin`。
*   如果您是在服务器上部署，请将`<您的服务器IP>`替换为服务器的公网IP地址。

您应该会看到VCPToolBox的管理后台登录界面。输入您在`.env`文件中设置的`ADMIN_API_KEY`，如果能成功登录，恭喜您，VCPToolBox已经成功部署！

---

## 下一步

现在您已经成功安装了VCPToolBox，接下来您可以：

*   探索[《核心概念》](./core-concepts.md)，了解项目背后的设计思想。
*   查阅[《配置指南》](./configuration.md)，学习如何启用和配置更多高级功能。
*   浏览[《插件系统总览》](./plugins/index.md)，发现并启用您感兴趣的插件。

如果您在安装过程中遇到任何问题，请随时查阅相关文档或在社区寻求帮助。
