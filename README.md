# 内网文件传输Demo

这个项目是一个基于 [Snapdrop](https://snapdrop.net) 的小 Demo，它实现了一个内网文件传输的功能。Snapdrop 是一个使用 WebRTC 和 WebSockets 技术的开源项目，允许用户在不同设备之间直接传输文件。本项目参考并结合了 Snapdrop 的源代码来实现类似的功能。

## 功能特点

- **内网传输**：利用 WebRTC 和 WebSockets 在内网中实现点对点文件传输。
- **设备发现**：自动发现同一内网中的其他设备。
- **文件传输**：支持多种文件类型的传输，包括图片、视频、文档等。
- **心跳机制**：通过 WebSocket 维持设备间的心跳连接，确保通信稳定。
- **用户界面**：提供简洁的用户界面，方便文件传输操作。

## 技术栈

- **前端**：HTML5 / CSS3 / JavaScript
- **后端**：Node.js
- **通信**：WebSockets / WebRTC

## 部署指南

1. **安装依赖**：运行 `npm install` 安装项目依赖。
2. **启动服务**：运行 `npm run dev` 启动 Node.js 服务。
3. **访问页面**：在不同机器的浏览器中打开 `http://内网地址:3000/public/index.html` 开始使用。

## 使用方法

1. **连接设备**：在浏览器中打开指定的 URL，系统会自动发现同一内网中的其他设备。
2. **选择文件**：在页面上选择需要传输的文件。
3. **发送文件**：选择目标设备，开始文件传输。
4. **接收文件**：在接收设备上确认接收文件。

## 代码结构

- `server.ts`：Node.js 服务器的主入口，负责启动 WebSocket 服务。
- `common.ts`：包含公共函数，如设备信息解析、UUID 生成等。
- `device.ts`：定义设备类，处理设备相关的逻辑。
- `room.ts`：管理房间和设备连接，处理设备间的通信。
- `base64.js`：提供 Base64 编码和解码功能。
- `develop.js`：开发过程中使用的辅助脚本。
- `index.js`：页面初始化脚本，负责连接 WebSocket 服务。
- `monitor.js`：监控 WebSocket 连接状态和消息处理。
- `peer.js`：处理 WebRTC Peer Connection 的逻辑。
- `preview.js`：文件预览功能。
- `ui.js`：用户界面相关的动态效果。
- `upload.js`：文件上传和发送逻辑。

## 致谢

本项目在开发过程中参考了 [Snapdrop](https://snapdrop.net) 的源代码。特别感谢 Snapdrop 项目的贡献者们提供的开源代码和灵感。本项目仅对 Snapdrop 的部分功能进行了 Web 页面的简单封装和展示。

---