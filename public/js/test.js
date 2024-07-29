let peerConnection;
let dataChannel;

function init() {
    peerConnection = createPeerConnection();
    console.log(peerConnection);
}

function createPeerConnection() {
    console.log('当前设备开始初始化 Peer Connection!');

    // 因为只是单纯的在内网运行所以不需要执行 RTCPeerConnection 的配置
    const peerConnection = new RTCPeerConnection();

    // 设置ICE候选处理程序
    peerConnection.onicecandidate = handleICECandidate;

    peerConnection.onconnectionstatechange = handleConnectionStateChange;

    return peerConnection;
}

/**
 *
 * @param {RTCPeerConnectionIceEvent} event
 */
function handleICECandidate(event) {
    if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        // 这里可以添加发送ICE候选到对等端的逻辑
        // 例如：sendToServer({ type: 'ice_candidate', candidate: event.candidate });
    }
}

/**
 * 处理连接状态变化
 * @param {Event} event
 */
function handleConnectionStateChange(event) {
    console.log('Connection state change:', peerConnection.connectionState);
    switch (peerConnection.connectionState) {
        case "connected":
            console.log("Peers connected!");
            break;
        case "disconnected":
        case "failed":
            console.log("Peer connection failed or disconnected.");
            // 这里可以添加重新连接或清理的逻辑
            break;
        case "closed":
            console.log("Peer connection closed.");
            // 这里可以添加清理逻辑
            break;
    }
}

function connectionToDevice(targetDeviceId) {
    console.log('初始化 P2P Connection Channel to Device', targetDeviceId);
    dataChannel = peerConnection.createDataChannel('messageChannel');

    setupDataChannel(dataChannel);

    // 创建并发送offer到目标设备
    createAndSendOffer(targetDeviceId);
}

function setupDataChannel(channel) {
    channel.onopen = () => {
        console.log('P2P data channel is open');
        // 现在可以直接通过数据通道发送消息了
        sendP2PMessage('this is message!')
    }

    channel.onmessage = (event) => {
        console.log('Received P2P message', event.data);
    }
}

function sendP2PMessage(message) {
    if (dataChannel && dataChannel.readyState === "open") {
        dataChannel.send(message);
        console.log("Sent P2P message:", message);
    } else {
        console.error("P2P data channel is not open");
    }
}

/**
 * 创建并发送 offer
 * @param {string} targetDeviceId
 */
function createAndSendOffer(targetDeviceId) {
    peerConnection.createOffer()
        .then(offer => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            // 发送 offer 到服务器，服务器再转发给目标设备
            sendToServer({
                type: "offer",
                offer: peerConnection.localDescription,
                target: targetDeviceId
            });
        })
        .catch(error => console.error("Error creating offer:", error));
}

/**
 * 窗口加载初始化当前设备的端口通道
 */
window.onload = init();


// ---------------

let peerConnections = {};

function connectToDevice(targetId) {
    if (peerConnections[targetId]) {
        console.log('连接已存在，准备发送文件');
        sendFile(targetId);
        return;
    }

    console.log('创建新的连接到设备:', targetId);
    const peerConnection = new RTCPeerConnection();
    peerConnections[targetId] = peerConnection;

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            wsSendMsg(ws, {
                type: 'candidate',
                target: targetId,
                candidate: event.candidate
            });
        }
    };

    peerConnection.ondatachannel = event => {
        const dataChannel = event.channel;
        setupDataChannel(dataChannel, targetId);
    };

    createOffer(targetId, peerConnection);
}

function createOffer(targetId, peerConnection) {
    const dataChannel = peerConnection.createDataChannel('fileTransfer');
    setupDataChannel(dataChannel, targetId);

    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => {
            wsSendMsg(ws, {
                type: 'offer',
                target: targetId,
                offer: peerConnection.localDescription
            });
        })
        .catch(error => console.error('创建 offer 失败:', error));
}

function setupDataChannel(dataChannel, targetId) {
    dataChannel.onopen = () => {
        console.log('数据通道已打开，准备发送文件');
        sendFile(targetId, dataChannel);
    };

    dataChannel.onclose = () => {
        console.log('数据通道已关闭');
        delete peerConnections[targetId];
    };

    dataChannel.onerror = error => {
        console.error('数据通道错误:', error);
    };
}

function sendFile(targetId, dataChannel) {
    // 这里模拟发送一个文本文件
    const message = "这是一个测试文件内容";
    dataChannel.send(message);
    console.log('文件已发送');

    // 发送完成后关闭连接
    setTimeout(() => {
        dataChannel.close();
        peerConnections[targetId].close();
        delete peerConnections[targetId];
    }, 1000);
}
