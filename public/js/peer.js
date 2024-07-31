let peer;
let channel;
let targetPeerId;

let receivedBuffers = [];
let receivedSize = 0;
let fileName = '';
let fileType = '';


/**
 * 连接到目标设备
 * @param target
 */
function connectToDevice(target) {
    channel = peer.createDataChannel(generateUUID());
    channel.onopen = () => console.log("传输通道连接成功!");
    channel.onerror = e => console.error('Data Channel Error:', e);
    channel.onclose = () => console.log("Data channel closed");
    channel.onmessage = e => console.log(e.data);
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
        channel.binaryType = 'arraybuffer';
        // channel.onmessage = e => console.log(e.data);
        channel.onopen = () => console.log("传输通道接入成功!");
        channel.onerror = e => console.error('Data Channel Error:', e);
        channel.onclose = () => console.log("Data channel closed");
        channel.onmessage = (event) => {
            if (typeof event.data === 'string') {
                try {
                    const metadata = JSON.parse(event.data);
                    fileName = metadata.name;
                    fileType = metadata.type;
                } catch (e) {
                    if (event.data === 'EOF') {
                        // 所有块已接收
                        const receivedBlob = new Blob(receivedBuffers, {type: fileType});
                        saveFile(receivedBlob, fileName);
                    }
                }
            } else if (event.data instanceof ArrayBuffer) {
                receivedBuffers.push(event.data);
                receivedSize += event.data.byteLength;
            }
        };
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
            targetPeerId = message.sender;
            appendInfoElement();
        })
        .catch(error => console.error('Error creating answer:', error));
}

// 保存文件并触发下载
function saveFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'downloaded_file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // 释放内存
    console.log('File downloaded successfully as', fileName);
}

function appendInfoElement() {
    const connection = document.getElementById('connection');
    connection.textContent = `已连接`;
    setUploadWinStyle(true)
}

function updateInfoElement(id) {
    if (id !== targetPeerId) return;
    const connection = document.getElementById('connection');
    connection.textContent = `连接已断开`;
    setUploadWinStyle(false)
}

function setUploadWinStyle(styleStatus) {
    toggleUpload(styleStatus);
}

function toggleUpload(show) {
    document.getElementById('upload').classList.toggle('show', show);
    document.getElementById('file').classList.toggle('show', show);
}

window.onload = function () {
    peer = new RTCPeerConnection();
    console.log('WebRTC Peer Connection Init Success!');
}
