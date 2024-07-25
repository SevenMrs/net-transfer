(function () {
    initDeviceId();
    console.log('设备打开进入页面, 准备连接远程服务加入房间🔗');
    let ws = new WebSocket('ws://192.168.1.6:3000');
    ws.onopen = () => { console.log('服务连接成功') }
    monitorClose(ws);
    monitor(ws);
})()

/**
 * 监控浏览器的关闭情况
 * @param {WebSocket} ws 
 */
function monitorClose(ws) {
    function sendCloseMessage() {
        wsSendMsg(ws, { 'type': 'disconnect' });
        ws.close();
    }

    // 监控页面关闭/前进后退
    window.addEventListener('beforeunload', () => sendCloseMessage());
    window.addEventListener('pagehide', () => sendCloseMessage())
    // window.addEventListener('visibilitychange', () => sendCloseMessage());

    // 处理 WebSocket 断开事件
    ws.addEventListener('close', (event) => {
        console.warn('node server websocet is close', event);
        // alert('node server is close!')
    });
}

/**
 * monitor node server message
 */
function monitor(ws) {
    /**
     * node server message monitor
     * @param {string} event 
     */
    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
            case 'connection_success':
                document.getElementById('display-name').textContent = message.info.nickname;
                break;
            case 'join':
                console.log(message.message);
                handleJoin(message.info);
                break;
            case 'ping':
                wsSendMsg(ws, { 'type': 'pong' });
                break;
            case 'leave':
                console.log(message.message);
                handleLeave(message.id);
                break;
            case 'other':
                handleOther(message.array);
                break;
            default:
                break;
        }
    }
}

/**
 * 将房间中已有设备加入到页面中
 * @param {array} list 
 */
function handleOther(list) {
    const deviceList = document.getElementById('device-list');
    list.forEach(info => handleJoin(info));
}

/**
 * 将新的设备新增到页面中
 * @param {deivce.info} info 
 */
function handleJoin(info) {
    
    /**
     * device item image
     * @param {string} deivceType 
     * @returns 
     */
    function deviceElementPush(deivceType) {
        const divEle = document.createElement('div');
        const imgEle = document.createElement('img');
        divEle.className = 'device-img';
        if (deivceType.indexOf('iOS') != -1 || deivceType.indexOf('Android') != -1) {
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

/**
 * 查看是否需要初始化设备ID
 */
function initDeviceId() {
    let cookieArr = document.cookie.split(';').map(cookie => cookie.trim());

    // 检查是否已有 deviceId
    for (let cookie of cookieArr) {
        let [name, value] = cookie.split('=');
        if (name === 'deviceId') return;
    }

    // 生成并设置新的 deviceId
    function generateUUID() {
        let array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        array[6] = (array[6] & 0x0f) | 0x40; // version 4
        array[8] = (array[8] & 0x3f) | 0x80; // variant 10
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    let deviceId = generateUUID();
    let expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `deviceId=${deviceId}; expires=${expires}; path=/`;
}
