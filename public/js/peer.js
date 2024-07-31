let peer;
let channel;
let targetPeerId;

// 文件传输使用参数
let receivedBuffers = [];
let receivedSize = 0;
let expectedSize = 0;
let fileName = '';
let fileType = '';


/**
 * 连接到目标设备
 * @param target 目标设备ID
 */
function connectToDevice(target) {
    channel = peer.createDataChannel(generateUUID());
    channel.onopen = () => console.log("传输通道连接成功!");
    channel.onerror = e => console.error('数据传输通道异常:', e);
    channel.onclose = () => console.log("数据通道关闭!");
    channel.onmessage = event => onMessage(event);

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
 * @param message 远程设备信息
 */
function answer(message) {
    peer.ondatachannel = e => {
        channel = e.channel;
        channel.binaryType = 'arraybuffer';
        channel.onopen = () => console.log("传输通道接入成功!");
        channel.onerror = e => console.error('数据通道异常:', e);
        channel.onclose = () => console.log("数据通道关闭!");
        channel.onmessage = event => onMessage(event);
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

/**
 * 接受到消息之后执行下载的逻辑
 * @param event
 */
function onMessage(event) {
    if (typeof event.data === 'string') {
        try {
            const parsedData = JSON.parse(event.data);

            if (parsedData.name && parsedData.type) {
                initUploadFileParam();
                console.log(parsedData);
                // 处理文件元数据
                fileName = parsedData.name;
                fileType = parsedData.type;
                expectedSize = parsedData.size;
            } else if (parsedData.index >= 0 && parsedData.data) {
                // 处理文件数据块
                const arrayBuffer = base64ToArrayBuffer(parsedData.data);
                receivedBuffers[parsedData.index] = arrayBuffer;
                receivedSize += arrayBuffer.byteLength;
            } else if (parsedData.schedule === 'EOF') {
                // 文件接收完成
                const receivedBlob = new Blob(receivedBuffers, {type: fileType});
                if (receivedSize === expectedSize) {
                    saveFile(receivedBlob, fileName);
                    console.log('文件接收完成：', fileName);
                    channel.send('FILE_RECEIVED');
                } else {
                    console.error('文件接收不完整，预期大小:', expectedSize, '实际接收大小:', receivedSize);
                    channel.send('FILE_DAMAGE');
                }
                initUploadFileParam();
            }
        } catch (e) {
            // console.error('解析数据时出错:', e);
        }
    }
}

/**
 * 保存文件并触发下载
 * @param blob
 * @param fileName
 */
function saveFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'downloaded_file';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // 释放内存
    console.log('文件下载成功: ', fileName);
}

/**
 * 通道连接上之后页面显示信息
 */
function appendInfoElement() {
    const connection = document.getElementById('connection');
    connection.textContent = `已连接`;
    toggleUpload(true)
}

/**
 * 通道断开后 页面响应信息
 * @param id
 */
function updateInfoElement(id) {
    if (id !== targetPeerId) return;
    const connection = document.getElementById('connection');
    connection.textContent = `连接已断开`;
    toggleUpload(false)
    transfer_file = null
}

/**
 * 页面文件上传窗体的CSS效果
 * @param show
 */
function toggleUpload(show) {
    document.getElementById('upload').classList.toggle('show', show);
    document.getElementById('file').classList.toggle('show', show);
}

function initUploadFileParam() {
    receivedBuffers = [];
    receivedSize = 0;
    expectedSize = 0;
    fileName = '';
    fileType = '';
}


window.onload = function () {
    peer = new RTCPeerConnection();
    console.log('WebRTC Peer Connection Init Success!');
}
