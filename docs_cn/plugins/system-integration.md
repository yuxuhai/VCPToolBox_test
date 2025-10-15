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

#### API密钥获取方法

1.  访问您的1Panel面板（例如：http://your-server-ip:port）
2.  登录后进入「设置」->「API密钥」
3.  点击「创建API密钥」
4.  记录生成的API Key

#### 配置

**配置文件位置：** `Plugin/1PanelInfoProvider/config.env`

```env
# 1Panel 应用的 URL
PanelBaseUrl=http://your-1panel-domain:port

# 1Panel OpenAPI Key
PanelApiKey=xxxxxxxxxxxxxxxxxxxxxxxx

# 是否为此插件启用调试模式
DebugMode=False

# 是否启用此插件
Enabled=True
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCP1PanelInfoProvider}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
1Panel服务器管理：
{{VCP1PanelInfoProvider}}
```

#### 使用方法

**示例指令**：
> "帮我看看1Panel服务器上所有应用的状态。"

> "查询一下服务器的实时系统负载。"

---

## 2. FRPS 信息提供器 (FRPSInfoProvider)

*   **作用**：用于获取[FRP](https://github.com/fatedier/frp)（一个专注于内网穿透的高性能反向代理应用）服务器（FRPS）的客户端连接信息。如果您使用FRP进行内网穿透，可以用此插件让AI帮您监控各个客户端的在线状态和流量信息。
*   **前置条件**：您的FRPS需要启用dashboard功能。

#### 配置

**1. FRPS服务器配置**

在`frps.ini`（您的FRPS配置文件）中，确保dashboard相关配置已启用：

```ini
[common]
bind_port = 7000
dashboard_port = 7500
dashboard_user = admin
dashboard_pwd = admin
```

**2. 插件配置文件位置：** `Plugin/FRPSInfoProvider/config.env`

```env
# FRPS服务器基础URL
FRPSBaseUrl=http://localhost:7500

# FRPS API管理员用户名
FRPSAdminUser=admin

# FRPS API管理员密码
FRPSAdminPassword=your_frps_admin_password

# 调试模式
DebugMode=false
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPFRPSInfoProvider}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
FRP服务器监控：
{{VCPFRPSInfoProvider}}
```

#### 使用方法

**示例指令**：
> "检查一下我的FRP服务器上有哪些客户端在线。"

> "查询名为'home-nas'的FRP客户端的流量信息。"

---

## 3. MCPO 多客户端监控 (MCPO & MCPOMonitor)

*   **作用**：MCPO (Multi-Client Process Observer) 是一套用于监控多个远程客户端（例如，多个ComfyUI实例、多个SD-WebUI实例）进程状态的系统。`MCPO`插件用于从客户端上报状态，而`MCPOMonitor`则用于让AI查询这些状态。
*   **前置条件**：需要配置和运行MCPO客户端脚本。

#### 配置

**1. VCPToolBox端配置文件：** `Plugin/MCPO/config.env` 和 `Plugin/MCPOMonitor/config.env`

```env
# MCPO 监控密钥，需要与客户端保持一致
MCPO_SECRET_KEY=your_shared_secret_key
```

**2. 客户端配置**

在客户端上运行`Plugin/MCPO/mcpo_client.py`脚本，并创建`config.ini`文件：

```ini
[server]
url = http://your-vcp-ip:6005/mcpo
secret_key = your_shared_secret_key

[process]
name = ComfyUI-Main
command = python main.py --listen --enable-cors
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPMCPO}}`和`{{VCPMCPOMonitor}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
多客户端进程监控：
{{VCPMCPO}}
{{VCPMCPOMonitor}}
```

#### 使用方法

**示例指令**：
> "检查一下所有MCPO客户端的状态。"

> "ComfyUI-Main这个客户端在线吗？"

---

## 4. Synapse 推送器 (SynapsePusher)

*   **作用**：可以将消息推送到[Matrix Synapse](https://github.com/matrix-org/synapse)服务器的指定房间。Matrix是一个开放、去中心化的实时通信协议，Synapse是其最流行的服务器实现。此插件可用于实现AI机器人在Matrix房间内的通知功能。
*   **前置条件**：
    1.  您需要一个Matrix Synapse服务器实例。
    2.  您需要在服务器上注册一个用于机器人的账号，并获取其Access Token。
    3.  您需要创建一个房间，并将机器人账号邀请进去。

#### Access Token获取方法

1.  使用Element或其他Matrix客户端登录机器人账号
2.  进入「设置」->「帮助&关于」->「高级」
3.  找到「Access Token」并复制
4.  **注意**：Access Token应严格保密

#### 配置

**配置文件位置：** `Plugin/SynapsePusher/config.env`

```env
# 启用调试模式
DebugMode=False

# VCP_Key用于WebSocket认证
VCP_Key=your_shared_vcplog_websocket_key

# Synapse Homeserver URL
SynapseHomeserver=https://matrix-client.matrix.org

# Synapse房间ID
SynapseRoomID=!yourRoomId:matrix.org

# --- 严格配置（正常操作）---
# JSON格式的Maid名称到Access Token的映射
MaidAccessTokensJSON={"XXX":"syt_XXX_TOKEN","YYY":"syt_YYY_TOKEN"}

# JSON格式的Maid工具白名单
MaidToolWhitelistJSON={"XXX":["ToolA","ToolB"],"YYY":["ToolB","ToolC","ToolD"]}

# --- 测试绕过配置（仅用于测试）---
BypassWhitelistForTesting=False
SynapseAccessTokenForTestingOnly=syt_YOUR_GENERAL_TESTING_TOKEN
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPSynapsePusher}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
Matrix消息推送：
{{VCPSynapsePusher}}
```

#### 使用方法

**示例指令**：
> "向Matrix房间发送一条消息，内容是'服务器重启完成'。"

> "把这段文字推送到Synapse。"

---

## 5. VCP 日志 (VCPLog)

*   **作用**：用于获取和分析VCPToolBox自身的运行日志。当出现问题需要排查，或者您想了解AI最近都调用了哪些工具时，这个插件非常有用。
*   **前置条件**：无。

#### 配置

**配置文件位置：** `Plugin/VCPLog/config.env`

```env
# VCP_Key用于WebSocket认证
VCP_Key=Your_Secret_VCP_Key_Here

# --- Gotify推送通知（可选）---
# 启用/禁用Gotify推送
Enable_Gotify_Push=false

# Gotify服务器URL
Gotify_Url=https://your.gotify.url

# Gotify应用令牌
Gotify_App_Token=XXXXXXXXXXXXXXXXXXX

# Gotify消息优先级（0-10）
Gotify_Priority=0
```

**注意**：日志相关的全局参数通常在项目根目录的`config.env`中配置：

```env
# 日志文件的路径
LOG_PATH=./logs/vcp.log

# 日志文件的最大大小（MB）
LOG_MAX_SIZE=10

# 保留的旧日志文件数量
LOG_MAX_FILES=5
```

#### 启用插件

**方式一：通过工具列表文件**

在`TVStxt/supertool.txt`中，确保`{{VCPLog}}`行没有被`#`注释。

**方式二：直接在系统提示词中添加**

```
日志分析工具：
{{VCPLog}}
```

#### 使用方法

**示例指令**：
> "帮我看看最近10条VCP的错误日志。"

> "分析一下日志，找出最近一小时内调用最频繁的插件是哪个。"

---

## 通用提示

### 系统集成最佳实践

1.  **安全性**：
    - 所有API密钥、Access Token应严格保密
    - 不要在公共仓库中提交包含敏感信息的配置文件
    - 定期更换密钥和令牌

2.  **监控策略**：
    - 合理配置监控频率，避免过度占用资源
    - 结合VCPLog插件及时发现系统异常
    - 设置必要的告警推送

3.  **工具组合**：
    您可以在系统提示词中组合使用多个监控工具：

    ```
    系统监控工具：
    - 1Panel管理：{{VCP1PanelInfoProvider}}
    - FRP监控：{{VCPFRPSInfoProvider}}
    - 进程监控：{{VCPMCPOMonitor}}
    - 日志分析：{{VCPLog}}
    
    消息推送：
    {{VCPSynapsePusher}}
    
    请根据需求选择合适的工具进行系统监控和信息推送。
    ```
