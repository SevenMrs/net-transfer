let peer;
let channel;

/**
 * 初始化RTC设备
 */
function init() {
    peer = new RTCPeerConnection();
    console.log('WebRTC Peer Connection Init Success!');
    channel = peer.createDataChannel(generateUUID());
    channel.onopen = () => console.log("传输通道连接成功!");
    channel.onerror = e => console.error('Data Channel Error:', e);
    channel.onclose = () => console.log("Data channel closed");
}

/**
 * 连接到目标设备
 * @param target
 */
function connectToDevice(target) {
    console.log('节点准备就绪, 发送信息连接远程节点!');

    peer.createOffer()
        .then(offer => peer.setLocalDescription(offer))
        .then(() => {
            // Wait for ICE gathering to complete
            return new Promise(resolve => {
                if (peer.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    peer.addEventListener('icegatheringstatechange', () => {
                        if (peer.iceGatheringState === 'complete') {
                            resolve();
                        }
                    });
                }
            });
        })
        .then(() => {
            wsSendMsg(ws, {
                'type': 'channel',
                'target': target,
                'data': peer.localDescription,
            });
        })
        .catch(error => console.error('Error creating offer:', error));
}

/**
 * 加入到远程会话中
 * @param message
 */
function answer(message) {
    peer.ondatachannel = e => {
        channel = e.channel;
        channel.onmessage = e => console.log(e.data);
        channel.onopen = () => console.log("传输通道接入成功!");
        channel.onerror = e => console.error('Data Channel Error:', e);
        channel.onclose = () => console.log("Data channel closed");
    };

    peer.setRemoteDescription(new RTCSessionDescription(message.data))
        .then(() => console.log('通道起始节点加入成功!'))
        .then(() => peer.createAnswer())
        .then(answer => peer.setLocalDescription(answer))
        .then(() => {
            // Wait for ICE gathering to complete
            return new Promise(resolve => {
                if (peer.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    peer.addEventListener('icegatheringstatechange', () => {
                        if (peer.iceGatheringState === 'complete') {
                            resolve();
                        }
                    });
                }
            });
        })
        .then(() => {
            wsSendMsg(ws, {
                'type': 'answer',
                'target': message.sender,
                'data': peer.localDescription,
            });
        })
        .catch(error => console.error('Error creating answer:', error));
}

window.onload = function () {
    init();
}
