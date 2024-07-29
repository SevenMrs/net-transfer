/**
 * 监控浏览器的关闭情况
 * @param {WebSocket} ws
 */
function monitorClose(ws) {
    function sendCloseMessage() {
        wsSendMsg(ws, {'type': 'disconnect'});
        ws.close();
    }

    // 监控页面关闭/前进后退
    window.addEventListener('beforeunload', () => sendCloseMessage());
    window.addEventListener('pagehide', () => sendCloseMessage())

    // 处理 WebSocket 断开事件
    ws.addEventListener('close', (event) => {
        console.warn('node server websocket is close', event);
    });
}

/**
 * monitor node server message
 */
function monitorMessage(ws) {
    /**
     * node server message monitor
     * @param {{}} event
     */
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
            case 'connect':
                document.getElementById('display-name').textContent = message.info.nickname;
                break;
            case 'join':
                console.log(message.message);
                handleJoin(message.info);
                break;
            case 'ping':
                wsSendMsg(ws, {'type': 'pong'});
                break;
            case 'leave':
                console.log(message.message);
                handleLeave(message.id);
                break;
            case 'other':
                handleOther(message.array);
                break;
            case 'channel':
                answer(message);
                break;
            case 'answer':
                reply(message);
                break;
            default:
                break;
        }
    }
}

/**
 * 处理回复业务
 * @param message
 */
function reply(message) {
    peer.setRemoteDescription(message.data).then(() => console.log('通道终点接入成功!'));
    targetPeerId = message.sender;
    appendInfoElement();
}

/**
 * 将房间中已有设备加入到页面中
 * @param {array} list
 */
function handleOther(list) {
    list.forEach(info => handleJoin(info));
}

/**
 * 将新的设备新增到页面中
 * @param {{}} info
 */
function handleJoin(info) {

    /**
     * device item image
     * @param {string} deviceType
     * @returns
     */
    function deviceElementPush(deviceType) {
        const divEle = document.createElement('div');
        const imgEle = document.createElement('img');
        divEle.className = 'device-img';
        if (deviceType.indexOf('iOS') !== -1 || deviceType.indexOf('Android') !== -1) {
            imgEle.src = "/public/image/phone.png";
        } else {
            imgEle.src = "/public/image/computer.png";
        }
        divEle.appendChild(imgEle);
        return divEle;
    }

    const deviceList = document.getElementById('device-list');
    const listItem = document.createElement('li');
    listItem.id = `device-${info.id}`; // 设置唯一的 ID，以便后续可以删除
    listItem.onclick = function () {
        connectToDevice(info.id);
    };

    const container = document.createElement('div');
    container.className = 'device-container';

    const divEle = deviceElementPush(info.name);
    container.appendChild(divEle);

    const nickname = document.createElement('span');
    nickname.className = 'device-item-nickname';
    nickname.textContent = `${info.nickname}`;
    container.appendChild(nickname);

    const name = document.createElement('span');
    name.className = 'device-item-name';
    name.textContent = `${info.name}`;
    container.appendChild(name);

    listItem.appendChild(container);

    // 将列表项添加到列表中
    deviceList.appendChild(listItem);
}

/**
 * 设备离开, 删除页面列表
 * @param {device.id} id
 */
function handleLeave(id) {
    // 查找要删除的列表项
    const listItem = document.getElementById(`device-${id}`);

    if (listItem) {
        // 从列表中删除
        listItem.remove();
    }
    updateInfoElement(id);
}

/**
 * 给node server发送消息
 * @param {WebSocket} ws
 * @param {Object} message
 */
function wsSendMsg(ws, message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    } else {
        console.error('没连上node服务!')
    }
}
