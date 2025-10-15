# 插件详解：系统监控与服务集成

这类插件主要负责VCPToolBox与外部服务和系统进行通信，充当着信息采集器和消息推送器的角色。通过它们，AI可以获取到服务器的状态，或将重要的信息推送到其他平台。

---

## 目录
1.  [1Panel 信息提供器 (1PanelInfoProvider)](#1-1panel-信息提供器-1panelinfoprovider)
2.  [FRPS 信息提供器 (FRPSInfoProvider)](#2-frps-信息提供器-frpsinfoprovider)
3.  [MCPO 多客户端监控 (MCPO & MCPOMonitor)](#3-mcpo-多客户端监控-mcpo--mcpomonitor)
4.  [Synapse 推送器 (SynapsePusher)](#4-synapse-推送器-synapsepusher)
5.  [VCP 日志 (VCPLog)](#5-vcp-日志-vcplog)

---

## 1. 1Panel 信息提供器 (1PanelInfoProvider)

*   **作用**：允许AI获取[1Panel](https://1panel.cn/)服务器运维面板的信息。1Panel是一款现代化、开源的Linux服务器管理面板。通过此插件，您可以直接向AI查询服务器的应用状态、系统负载等信息。
*   **前置条件**：
    1.  您需要有一台安装了1Panel的服务器。
    2.  您需要在1Panel中创建API密钥。

#### 配置

1.  在`.env`文件中找到并填入1Panel的配置信息：
    ```env
    # 1Panel服务器面板地址
    ONEPANEL_API_URL=http://<your-1panel-ip>:port
    # 1Panel API Key
    ONEPANEL_API_KEY=<您的1Panel API Key>
    # 1Panel API Secret
    ONEPANEL_API_SECRET=<您的1Panel API Secret>
    ```
    *   请将`<your-1panel-ip>:port`替换为您的1Panel面板的实际访问地址。
    *   API Key和Secret可以在1Panel面板的「设置」->「API密钥」中创建。
2.  在`TVStxt/supertool.txt`中，确保`{{VCP1PanelInfoProvider}}`行没有被注释。

#### 使用方法

**示例指令**：
> “帮我看看1Panel服务器上所有应用的状态。”

> “查询一下服务器的实时系统负载。”

---

## 2. FRPS 信息提供器 (FRPSInfoProvider)

*   **作用**：用于获取[FRP](https://github.com/fatedier/frp)（一个专注于内网穿透的高性能反向代理应用）服务器（FRPS）的客户端连接信息。如果您使用FRP进行内网穿透，可以用此插件让AI帮您监控各个客户端的在线状态和流量信息。
*   **前置条件**：您的FRPS需要启用dashboard功能。

#### 配置

1.  在`frps.ini`（您的FRPS配置文件）中，确保dashboard相关配置已启用：
    ```ini
    [common]
    bind_port = 7000
    dashboard_port = 7500
    dashboard_user = admin
    dashboard_pwd = admin
    ```
2.  在VCPToolBox的`.env`文件中，填入FRPS dashboard的访问信息：
    ```env
    # FRPS Dashboard的地址
    FRPS_API_URL=http://<your-frps-ip>:7500
    # FRPS Dashboard的用户名
    FRPS_API_USER=admin
    # FRPS Dashboard的密码
    FRPS_API_PASSWORD=admin
    ```
3.  在`TVStxt/supertool.txt`中，确保`{{VCPFRPSInfoProvider}}`行没有被注释。

#### 使用方法

**示例指令**：
> “检查一下我的FRP服务器上有哪些客户端在线。”

> “查询名为‘home-nas’的FRP客户端的流量信息。”

---

## 3. MCPO 多客户端监控 (MCPO & MCPOMonitor)

*   **作用**：MCPO (Multi-Client Process Observer) 是一套用于监控多个远程客户端（例如，多个ComfyUI实例、多个SD-WebUI实例）进程状态的系统。`MCPO`插件用于从客户端上报状态，而`MCPOMonitor`则用于让AI查询这些状态。
*   **前置条件**：需要配置和运行MCPO客户端脚本。

#### 配置

1.  **VCPToolBox端 (`.env`文件)**：
    ```env
    # MCPO 监控密钥，需要与客户端保持一致
    MCPO_SECRET_KEY=<您的共享密钥>
    ```
2.  **客户端 (例如，一个ComfyUI实例)**：
    *   您需要在客户端上运行`Plugin/MCPO/mcpo_client.py`脚本。
    *   为该脚本创建一个`config.ini`文件，填入VCPToolBox服务器地址和密钥。
    ```ini
    [server]
    url = http://<your-vcp-ip>:6005/mcpo
    secret_key = <您的共享密钥>

    [process]
    name = ComfyUI-Main
    command = python main.py --listen --enable-cors
    ```
3.  在`TVStxt/supertool.txt`中，确保`{{VCPMCPO}}`和`{{VCPMCPOMonitor}}`行没有被注释。

#### 使用方法

**示例指令**：
> “检查一下所有MCPO客户端的状态。”

> “ComfyUI-Main这个客户端在线吗？”

---

## 4. Synapse 推送器 (SynapsePusher)

*   **作用**：可以将消息推送到[Matrix Synapse](https://github.com/matrix-org/synapse)服务器的指定房间。Matrix是一个开放、去中心化的实时通信协议，Synapse是其最流行的服务器实现。此插件可用于实现AI机器人在Matrix房间内的通知功能。
*   **前置条件**：
    1.  您需要一个Matrix Synapse服务器实例。
    2.  您需要在服务器上注册一个用于机器人的账号，并获取其Access Token。
    3.  您需要创建一个房间，并将机器人账号邀请进去。

#### 配置

1.  在`.env`文件中填入Synapse服务器和机器人的信息：
    ```env
    # Synapse服务器地址
    SYNAPSE_HOMESERVER_URL=https://your-synapse-server.com
    # 机器人账号的Access Token
    SYNAPSE_ACCESS_TOKEN=<您的机器人Access Token>
    # 要推送消息的目标房间ID
    SYNAPSE_ROOM_ID=!yourRoomId:your-synapse-server.com
    ```
2.  在`TVStxt/supertool.txt`中，确保`{{VCPSynapsePusher}}`行没有被注释。

#### 使用方法

**示例指令**：
> “向Matrix房间发送一条消息，内容是‘服务器重启完成’。”

> “把这段文字推送到Synapse。”

---

## 5. VCP 日志 (VCPLog)

*   **作用**：用于获取和分析VCPToolBox自身的运行日志。当出现问题需要排查，或者您想了解AI最近都调用了哪些工具时，这个插件非常有用。
*   **前置条件**：无。开箱即用。

#### 配置

*   在`.env`文件中，您可以配置日志相关的参数：
    ```env
    # 日志文件的路径
    LOG_PATH=./logs/vcp.log
    # 日志文件的最大大小（MB）
    LOG_MAX_SIZE=10
    # 保留的旧日志文件数量
    LOG_MAX_FILES=5
    ```
*   在`TVStxt/supertool.txt`中，确保`{{VCPLog}}`行没有被注释。

#### 使用方法

**示例指令**：
> “帮我看看最近10条VCP的错误日志。”

> “分析一下日志，找出最近一小时内调用最频繁的插件是哪个。”
