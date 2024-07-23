const process = require('process');
const Peer = require('./peer');

/**
 * 处理终止信号，关闭服务器
 * SIGINT 是用户发出的中断信号，通常用于立即停止程序
 * SIGTERM 是系统发出的终止信号，通常用于请求程序优雅地结束运行。
 */
process.on('SIGINT', () => {
    console.info("SIGINT Received, exiting...");
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.info("SIGTERM Received, exiting...");
    process.exit(0);
});

/**
 * 公网服务
 */
class PublicNetServer {

    constructor(port) {
        const WebSocket = require('ws');
        this._wss = new WebSocket.Server({port: port});
        this._wss.on('connection', (socket, request) => this._onConnection(new Peer(socket, request)));
        this._wss.on('headers', (headers, response) => this._onHeaders(headers, response));

        this._rooms = {};

        console.log('Snapdrop is running on port', port);
    }

    /**
     * 处理新的设备连接
     * @param peer 新连接的设备
     * @private
     */
    _onConnection(peer) {
        // 将设备加入到房间
        this._joinRoom(peer);
        peer.socket.on('message', message => this._onMessage(peer, message));
        peer.socket.on('error', console.error);
        // 心跳包，用于检测连接是否活跃
        this._keepAlive(peer);

        // 向设备发送包含显示名称和设备名称的消息
        this._send(peer, {
            type: 'display-name',
            message: {
                displayName: peer.name.displayName,
                deviceName: peer.name.deviceName
            }
        });
    }

    /**
     * 设置 Cookie：检查请求头中是否已有 peerId。如果没有，生成一个新的 peerId 并设置为 Cookie，以便识别设备。
     * @param headers 请求头
     * @param response 响应对象
     * @private
     */
    _onHeaders(headers, response) {
        // 检查请求是否已包含 peerId，如果没有则生成一个新的
        if (response.headers.cookie && response.headers.cookie.indexOf('peerid=') > -1) return;
        response.peerId = Peer.uuid();
        headers.push('Set-Cookie: peerid=' + response.peerId + "; SameSite=Strict; Secure");
    }

    /**
     * 处理收到的消息
     * @param sender 发送消息的设备
     * @param message 收到的消息
     * @private
     */
    _onMessage(sender, message) {
        try {
            message = JSON.parse(message);
        } catch (e) {
            return; // 如果消息格式不正确，则忽略该消息
        }

        /**
         * 根据消息类型进行处理
         * disconnect 处理设备断开连接的消息，并从房间中移除该设备
         * pong 更新设备的最后心跳时间
         */
        switch (message.type) {
            case 'disconnect':
                this._leaveRoom(sender);
                break;
            case 'pong':
                sender.lastBeat = Date.now();
                break;
        }

        /**
         * 如果消息中包含目标设备 ID，并且目标设备在房间中，将消息转发给目标设备。
         *      检查消息是否存在指定设备 并且 房间也存在
         *      获取设备id，并且通过设备ID从房间中获取到具体设备
         *      从消息对象中删除 to 字段。这个字段在转发消息时不再需要，因为它只在发送消息时才有用
         *      将消息的 sender 字段设置为发送者的 ID。这样，目标设备在收到消息时可以知道消息是从哪个设备发来的
         *      调用 _send 方法将消息发送给目标设备 recipient。消息现在已经准备好，包含了发送者的信息，并且没有了 to 字段
         */
        if (message.to && this._rooms[sender.ip]) {
            const recipientId = message.to;
            const recipient = this._rooms[sender.ip][recipientId];
            delete message.to;
            message.sender = sender.id;
            this._send(recipient, message);
        }
    }

    /**
     * 将设备信息加入到房间，并通知其他设备新设备的加入
     * @param peer 新加入的设备
     * @private
     */
    _joinRoom(peer) {
        // 查看这个设备的IP对应的房间是否存在，如果不存在就创建一个房间
        if (!this._rooms[peer.ip]) {
            this._rooms[peer.ip] = {};
        }

        // 通知同一房间中的其他设备，有新设备加入
        for (const otherPeerId in this._rooms[peer.ip]) {
            const otherPeer = this._rooms[peer.ip][otherPeerId];
            this._send(otherPeer, {
                type: 'peer-joined',
                peer: peer.getInfo()
            });
        }

        // 将目前房间中的设备信息发送给新的设备
        const otherPeers = [];
        for (const otherPeerId in this._rooms[peer.ip]) {
            otherPeers.push(this._rooms[peer.ip][otherPeerId].getInfo());
        }

        // 将其他设备的信息发送给新加入的设备
        this._send(peer, {
            type: 'peers',
            peers: otherPeers
        });

        // 将新设备加入房间
        this._rooms[peer.ip][peer.id] = peer;
    }

    /**
     * 处理设备断开连接事件
     * @param peer 断开连接的设备
     * @private
     */
    _leaveRoom(peer) {
        // 检查这个设备是否存在于对应的房间中(检查房间是否存在，检查房间下的设备是否存在)
        if (!this._rooms[peer.ip] || !this._rooms[peer.ip][peer.id]) return;

        // 取消设备的心跳定时器
        this._cancelKeepAlive(this._rooms[peer.ip][peer.id]);

        // 从房间中删除设备
        delete this._rooms[peer.ip][peer.id];

        // 终止设备的 WebSocket 连接
        peer.socket.terminate();

        // 如果房间中已没有其他设备，删除房间
        if (!Object.keys(this._rooms[peer.ip]).length) {
            delete this._rooms[peer.ip];
        } else {
            // 通知房间中的其他设备该设备已断开连接
            for (const otherPeerId in this._rooms[peer.ip]) {
                const otherPeer = this._rooms[peer.ip][otherPeerId];
                this._send(otherPeer, {type: 'peer-left', peerId: peer.id});
            }
        }
    }

    /**
     * 给目标设备发送消息
     * @param peer 目标设备
     * @param message 要发送的消息
     * @private
     */
    _send(peer, message) {
        // 检查设备和设备的 WebSocket 连接状态
        if (!peer) return;
        if (peer.socket.readyState !== peer.socket.OPEN) return; // 修正：应该检查设备的 WebSocket 状态
        message = JSON.stringify(message);
        peer.socket.send(message, error => '');
    }

    /**
     * 心跳连接，用于检测设备是否在线
     * @param peer 指定的设备
     * @private
     */
    _keepAlive(peer) {
        // 取消之前的心跳定时器
        this._cancelKeepAlive(peer);
        const timeout = 30000; // 30秒的心跳包间隔

        // 如果设备的 lastBeat 属性不存在，设置为当前时间
        if (!peer.lastBeat) {
            peer.lastBeat = Date.now();
        }

        // 如果当前时间与最后一次心跳时间的间隔超过 60 秒，认为设备已离线并将其从房间中移除
        if (Date.now() - peer.lastBeat > 2 * timeout) {
            this._leaveRoom(peer);
            return;
        }

        // 发送心跳消息 (ping) 以检测设备是否在线
        this._send(peer, {type: 'ping'});

        // 设置心跳定时器，每 30 秒执行一次 _keepAlive 方法
        peer.timerId = setTimeout(() => this._keepAlive(peer), timeout);
    }

    /**
     * 取消设备的心跳定时器
     * @param peer 指定的设备
     * @private
     */
    _cancelKeepAlive(peer) {
        if (peer && peer.timerId) {
            clearTimeout(peer.timerId);
        }
    }
}

const server = new PublicNetServer(3001);
