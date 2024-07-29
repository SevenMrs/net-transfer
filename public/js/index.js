let ws;
(function () {
    initDeviceId();
    console.log('设备打开进入页面, 准备连接远程服务加入房间🔗');
    ws = new WebSocket('ws://192.168.1.6:3000');
    ws.onopen = () => { console.log('服务连接成功') }
    monitorClose(ws);
    monitorMessage(ws);
})()

/**
 * 查看是否需要初始化设备ID
 */
function initDeviceId() {
    let cookieArr = document.cookie.split(';').map(cookie => cookie.trim());

    // 检查是否已有 deviceId
    for (let cookie of cookieArr) {
        let [name] = cookie.split('=');
        if (name === 'deviceId') return;
    }

    let deviceId = generateUUID();
    let expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `deviceId=${deviceId}; expires=${expires}; path=/`;
}

// 生成并设置新的 deviceId
function generateUUID() {
    let array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    array[6] = (array[6] & 0x0f) | 0x40; // version 4
    array[8] = (array[8] & 0x3f) | 0x80; // variant 10
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}
