# 1PanelInfoProvider Plugin

## Introduction to 1Panel

[1Panel](https://github.com/1Panel-dev/1Panel) is a modern and open-source Linux server management panel. It provides a user-friendly graphical interface to manage your server, including websites, databases, files, and more. The `1PanelInfoProvider` plugin for VCPToolBox allows you to connect to your 1Panel server and retrieve real-time information about its status.

## Purpose

The `1PanelInfoProvider` plugin is a **static** VCP plugin that injects real-time status and basic information from your 1Panel server into the AI's context. This enables the AI to "sense" the server's operational status, resource usage, installed applications, and other key information, allowing for more intelligent responses and decisions based on this live data. For example, the AI can advise whether to perform resource-intensive tasks based on the server load or report which websites or databases are installed on the server.

## Core Features

*   **Real-time Information Retrieval**: Directly fetches the latest server status and operating system information from the 1Panel API.
*   **Dynamic Variable Injection**: Provides `{{1PanelOsInfo}}` and `{{1PanelDashboard}}` placeholders for use in any VCP variable-supported context (such as system prompts, agent profiles).
*   **Resilient Caching**: When unable to connect to the 1Panel API, the plugin automatically uses the last successfully fetched data as a cache, ensuring the stability of the information provided.
*   **Simple Configuration**: Only requires configuring the 1Panel address and API key in the project's root `config.env` file.

## Provided Variables

This plugin registers two core placeholder variables with the VCP system:

### `{{1PanelOsInfo}}`

This variable provides detailed information about the **operating system** of the 1Panel server. It is a JSON object containing static hardware and software information of the server.

*   **Content**:
    *   Operating system name (Distributor)
    *   Operating system version (Release)
    *   System codename (Codename)
    *   System architecture (Architecture)
    *   ...and other relevant system-level information.
*   **Purpose**: Allows the AI to understand its operating hardware and system environment, which is helpful for making environment-related judgments (e.g., when discussing software compatibility or compilation options).

### `{{1PanelDashboard}}`

This variable provides a real-time overview of the 1Panel server's **dashboard**. It is a JSON object containing dynamically changing performance metrics and resource statistics of the server.

*   **Content**:
    *   **Monitoring Information**: CPU usage, core count, average load, memory usage, disk space occupation, etc.
    *   **Status Information**: Server uptime, network speed, etc.
    *   **Resource Statistics**: Number of installed applications, websites, databases, cron jobs, etc.
*   **Purpose**: This is the most valuable variable, as it gives the AI "insight" into the server's health and resource usage. The AI can use this information to answer questions like "Is the server busy right now?", "Is there enough disk space?", or "How many websites have I installed?".

## Configuration Guide

To use this plugin, you need to add the following two environment variables to the `config.env` file in the **root directory of the VCPToolBox project**:

*   `PanelBaseUrl`
    *   **Description**: The access address of your 1Panel server, which must include `http://` or `https://`.
    *   **Example**: `PanelBaseUrl="http://192.168.1.100:12345"`

*   `PanelApiKey`
    *   **Description**: The API key you created in the security settings of 1Panel.
    *   **Example**: `PanelApiKey="<your_api_key>"`

After configuration, please **restart the VCPToolBox server** for the settings to take effect.

### `config.env.example`

```
PanelBaseUrl="http://<your_1panel_server_ip:port>"
PanelApiKey="<your_1panel_api_key>"
```

## How to Use

Once configured, you can easily use these new variables in the AI's system prompt or agent profile. The VCP server will automatically replace these placeholders with the real-time JSON data fetched from 1Panel when processing messages sent to the AI.

**Add the following to your agent's profile or system prompt:**

```
- Operating System Information: {{1PanelOsInfo}}
- Real-time Server Status: {{1PanelDashboard}}
```

This way, the AI can "learn" the current state of the server before the conversation begins and be ready to answer your related questions.

## Data Structure Examples

The following are examples of the JSON data structures that the two variables might return, to help you better understand their content.

### `1PanelOsInfo` Example

```json
{
  "name": "Ubuntu",
  "version": "22.04.3 LTS (Jammy Jellyfish)",
  "arch": "x86_64",
  "kernel": "5.15.0-88-generic",
  "distributor": "Ubuntu",
  "release": "22.04",
  "codename": "jammy"
}
```

### `1PanelDashboard` Example

```json
{
  "monitor": {
    "cpu_used": 5.8,
    "cpu_total": 4,
    "cpu_load": {
      "load1": 0.53,
      "load5": 0.38,
      "load15": 0.35
    },
    "mem_used": 4180,
    "mem_total": 7837,
    "disk_used": 50,
    "disk_total": 200,
    "uptime": 1234567
  },
  "state": {
    "net_speed_up": 1024,
    "net_speed_down": 20480,
    "net_total_up": 1234567890,
    "net_total_down": 9876543210
  },
  "resource_stats": {
    "app": 10,
    "database": 5,
    "website": 8,
    "cronjob": 3
  }
}
```
