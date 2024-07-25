// import http from 'http';
// import WebSocket from 'ws';
// import {SocketIP} from './common';
//
// const server = http.createServer((req, res) => {
//     if (req.url === '/') {
//         const ip: string | null = SocketIP(req);
//         if (null === ip) {
//             return;
//         } else {
//             console.log(`Request from IP: ${ip}`);
//             res.writeHead(200, {'Content-Type': 'text/plain'});
//             res.end(`Your internal IP is: ${ip}`);
//         }
//     } else {
//         res.writeHead(404, {'Content-Type': 'text/plain'});
//         res.end('Not Found');
//     }
// });
//
// // 创建 WebSocket 服务器
// const wss = new WebSocket.Server({server});
//
// wss.on('connection', (ws: WebSocket) => {
//     console.log('New WebSocket connection');
//
//     ws.on('message', (message: WebSocket.MessageEvent) => {
//         console.log(`Received message: ${message}`);
//         ws.send(`Echo: ${message}`);
//     });
//
//     ws.on('close', () => {
//         console.log('WebSocket connection closed');
//     });
// });
//
// // 启动 HTTP 和 WebSocket 服务器
// server.listen(3000, () => {
//     console.log('Server running at http://localhost:3000/');
// });
