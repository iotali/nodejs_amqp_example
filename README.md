# IoT 平台服务端订阅的 Node.js 消费者示例

这是一个简单的 IoT 平台服务端订阅功能的 AMQP 消费者示例，用 Node.js 实现，用于订阅指定的队列并接收消息。

## 环境要求

- Node.js 14.0+
- npm 6.0+ 或 pnpm 5.0+

## 安装

1. 克隆代码库后，使用 npm 或 pnpm 安装依赖：

```bash
npm install
# 或
pnpm install
```

## 配置说明

默认 MQ 连接信息已在代码中配置（src/AMQPConsumer.js）：

- 服务器: xxx.xxx.xxx.xxx
- 端口: 5672
- 用户名: ZHiGPqEVwC
- 密码: JyAfWnXoXR
- 队列名: queue_NUWiXpCwlE

## 功能特点

- 自动连接 MQ 服务器并订阅指定队列
- 接收并显示原始消息
- 自动格式化 JSON 消息，提高可读性
- 支持嵌套 JSON 结构的格式化显示
- 详细的日志记录

## 如何运行

使用 npm 命令启动：

```bash
npm start
```

或直接运行：

```bash
node src/AMQPConsumer.js
```

## 命令行参数

- `--debug`: 启用调试模式，显示详细连接信息
- `--log-file <path>`: 将日志输出到指定文件

## 日志

日志将输出到控制台。

## 消息格式示例

原始消息格式：

```
"{\"content\":\"{\\\"clientIp\\\":\\\"172.16.116.61\\\",\\\"time\\\":\\\"2025-04-28 15:54:51\\\",\\\"productKey\\\":\\\"kdlxqvXX\\\",\\\"deviceName\\\":\\\"qLeIdlTiUI\\\",\\\"status\\\":\\\"online\\\"}\",\"generateTime\":1745826891,\"messageId\":\"1745826891727\",\"topic\":\"/as/mqtt/status/kdlxqvXX/qLeIdlTiUI\"}"
```

格式化后：

```json
{
  "content": "{\"clientIp\":\"172.16.116.61\",\"time\":\"2025-04-28 15:54:51\",\"productKey\":\"kdlxqvXX\",\"deviceName\":\"qLeIdlTiUI\",\"status\":\"online\"}",
  "generateTime": 1745826891,
  "messageId": "1745826891727",
  "topic": "/as/mqtt/status/kdlxqvXX/qLeIdlTiUI"
}

内层content内容:
{
  "clientIp": "172.16.116.61",
  "time": "2025-04-28 15:54:51",
  "productKey": "kdlxqvXX",
  "deviceName": "qLeIdlTiUI",
  "status": "online"
}
```
