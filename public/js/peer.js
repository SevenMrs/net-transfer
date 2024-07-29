let peer;
let channel;

/**
 * 连接到目标设备
 * @param target
 */
function connectToDevice(target) {
    if (!peer) {
        console.error('Peer connection is not init!')
        return;
    }
    channel = peer.createDataChannel(generateUUID());
    channel.onopen = function () {
        console.log('通道打开成功!')
    }
    channel.onmessage = function (ev) {
        console.log(ev.data);
    }

    peer.createOffer()
        .then(offer => {
            console.log('创建的 offer:', offer);
            return peer.setLocalDescription(offer);
        })
        .then(() => {
            console.log('本地SDP设置成功!')
            wsSendMsg(ws, {
                'type': 'channel',
                'target': target,
                'data': peer.localDescription,
            })
        })
        .catch(error => console.log('设置SDP时发生错误:', error));
}

/**
 * 加入到远程会话中
 * @param message
 */
function answer(message) {
    if (!peer) {
        console.error('Peer connection is not init!')
        return;
    }
    console.log(message);

    peer.setRemoteDescription(message.data);

    peer.createAnswer()
        .then(answer => peer.setLocalDescription(answer))
        .then(() => {
            peer.ondatachannel = e => {
                channel = e.channel;
                console.log('收到数据通道事件', channel.label);
                channel.onopen = function () {
                    console.log('远程通道加入成功!');
                }
                channel.onmessage = function (e) {
                    console.log(e.data);
                }
            }
            console.log('本地SDP设置成功!');
            wsSendMsg(ws, {
                type: 'answer',
                target: message.sender,
                data: peer.localDescription,
            });
        })
        .catch(error => console.log('设置SDP时发生错误:', error));
}

window.onload = function () {
    peer = new RTCPeerConnection();
    console.log('RTCPeerConnection 已初始化');
}
