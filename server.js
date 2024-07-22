const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    if (req.url === '/') {
        fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else if (req.url === '/main.js') {
        fs.readFile(path.join(__dirname, 'public', 'main.js'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading main.js');
            } else {
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not Found');
    }
});

const wss = new WebSocket.Server({ server });

let clients = [];

wss.on('connection', (ws) => {
    const id = Math.random().toString(36).substring(2, 15);
    clients.push({ id, ws });
    console.log(`Device connected: ${id}`);
    broadcastClients();

    ws.on('close', () => {
        clients = clients.filter(client => client.ws !== ws);
        console.log(`Device disconnected: ${id}`);
        broadcastClients();
    });
});

function broadcastClients() {
    const clientIds = clients.map(client => client.id);
    clients.forEach(client => {
        client.ws.send(JSON.stringify({ type: 'clients', data: clientIds }));
    });
}

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
