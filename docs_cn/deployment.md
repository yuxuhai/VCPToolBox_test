# 部署方案指南

本指南将为您提供多种部署VCPToolBox的方案，以适应不同的使用场景和技术背景。我们主要推荐使用Docker进行部署，因为它能提供一个干净、一致且易于管理的运行环境。

---

## 目录
1.  [方案一：使用 `docker-compose` （推荐）](#1-方案一使用-docker-compose-推荐)
2.  [方案二：使用 1Panel 服务器面板部署](#2-方案二使用-1panel-服务器面板部署)
3.  [生产环境建议](#3-生产环境建议)

---

## 1. 方案一：使用 `docker-compose`（推荐）

这是最标准、最灵活的部署方式，适用于本地开发和服务器部署。在[《入门指南》](./getting-started.md)中，我们已经介绍了这种方法的基础步骤。这里我们将提供更多细节。

### 步骤回顾

1.  **准备环境**：安装`Git`, `Docker`和`Docker Compose`。
2.  **克隆项目**：`git clone https://github.com/yuxuhai/VCPToolBox_test.git`
3.  **进入目录**：`cd VCPToolBox_test`
4.  **创建并配置`.env`文件**：`cp config.env.example .env`，然后编辑`.env`。
5.  **启动服务**：`docker-compose up -d`

### `docker-compose.yml` 文件解析

项目自带的`docker-compose.yml`文件默认配置如下：

```yaml
services:
  app:
    build: .
    container_name: vcptoolbox
    ports:
      - "6005:6005"
    volumes:
      - .:/usr/src/app
      - /usr/src/app/pydeps
      - /usr/src/app/node_modules
    restart: unless-stopped
```

*   `build: .`：指示Docker Compose在当前目录寻找`Dockerfile`并构建镜像。
*   `ports: - "6005:6005"`：将主机的`6005`端口映射到容器的`6005`端口。如果您需要更改端口，请修改第一个`6005`。
*   `volumes`:
    *   `- .:/usr/src/app`：这是最关键的一行。它将您主机上的**整个项目目录**挂载到容器的`/usr/src/app`工作目录中。
        *   **优点**：当您在主机上修改任何文件（例如，更新一个插件的配置，或添加一个新的Agent），您**无需重新构建镜像**，只需重启容器即可生效（`docker-compose restart`）。
        *   **缺点**：容器内的`node_modules`和Python依赖可能会与主机环境冲突。
    *   `- /usr/src/app/pydeps`, `- /usr/src/app/node_modules`：这两行是“匿名卷”，用于防止主机上的`node_modules`和`pydeps`目录覆盖容器在构建时安装的依赖，从而解决了上述缺点。

### 日常维护

*   **查看日志**：`docker-compose logs -f`
*   **重启服务**：`docker-compose restart`
*   **停止服务**：`docker-compose down`
*   **更新项目**：
    1.  `git pull`：从GitHub拉取最新的代码。
    2.  `docker-compose build`：如果`Dockerfile`或核心依赖有变动，需要重新构建镜像。
    3.  `docker-compose up -d`：重新启动服务。

---

## 2. 方案二：使用 1Panel 服务器面板部署

对于不熟悉命令行的用户，使用[1Panel](https://1panel.cn/)这类现代化的服务器管理面板是一个非常友好的选择。它能让您通过图形化界面来完成应用的部署和管理。

### 什么是 1Panel？
1Panel是一个开源的Linux服务器运维管理面板。您可以将它看作是一个可视化的服务器管家，帮您安装软件、管理网站、配置防火墙等。

### 使用 1Panel 部署 VCPToolBox

1.  **安装 1Panel**：
    请参考[1Panel官方文档](https://1panel.cn/docs/installation/online_installation/)，在您的服务器上安装1Panel。

2.  **进入应用商店**：
    登录您的1Panel面板，在左侧菜单栏选择“应用商店”。

3.  **安装 Docker**：
    如果尚未安装，请在应用商店中搜索并安装`Docker`。

4.  **创建容器**：
    *   在左侧菜单栏选择“容器”。
    *   点击“创建容器”按钮。
    *   选择“Compose”安装方式。

5.  **配置 Compose**：
    *   **名称**：给您的应用起一个名字，例如`VCPToolBox`。
    *   **Compose 文件**：将项目根目录下的`docker-compose.yml`文件的**全部内容**复制并粘贴到这里。
    *   **`.env` 文件**：将项目根目录下的`config.env.example`文件的**全部内容**复制并粘贴到这里。**然后，直接在这个文本框中修改您的配置**，例如填入`API_Key`和`AdminPassword`。

6.  **挂载项目代码**：
    *   这是最关键的一步。由于我们需要将整个项目代码提供给容器，最简单的方法是先将代码上传到服务器。
    *   使用1Panel的“文件”功能，在您喜欢的位置（例如`/opt/`）创建一个`vcptoolbox`目录。
    *   将从GitHub下载的完整VCPToolBox项目文件（除了`.git`目录外）上传到这个`/opt/vcptoolbox`目录中。
    *   回到创建容器的界面，修改Compose文件中的`volumes`部分，将`- .:/usr/src/app`改为一个绝对路径的挂载：
        ```yaml
        # ... (其他docker-compose内容)
        volumes:
          - /opt/vcptoolbox:/usr/src/app  # 将.改为服务器上的绝对路径
          - /usr/src/app/pydeps
          - /usr/src/app/node_modules
        # ...
        ```

7.  **创建并启动**：
    点击“确认”按钮。1Panel会自动拉取代码、构建镜���并启动容器。您可以在容器列表中看到`VCPToolBox`的运行状态，并在这里进行启动、停止、查看日志等所有管理操作。

---

## 3. 生产环境建议

*   **使用反向代理**：不要将VCPToolBox的端口直接暴露在公网上。建议使用Nginx或Caddy等反向代理工具，并配置HTTPS来加密通信。1Panel的“网站”功能可以非常方便地帮您实现这一点。
*   **定期备份**：定期备份您的`.env`文件以及整个`dailynote/`知识库目录，以防数据丢失。
*   **保护密钥**：您的`.env`文件中包含了所有服务的密钥，请务必妥善保管，不要泄露到公共代码仓库中。
