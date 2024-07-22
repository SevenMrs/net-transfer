const ws = new WebSocket(`ws://${window.location.host}`);

ws.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.type === 'clients') {
        const deviceList = document.getElementById('deviceList');
        deviceList.innerHTML = '';
        data.data.forEach(clientId => {
            const li = document.createElement('li');
            li.textContent = `Device ID: ${clientId}`;
            deviceList.appendChild(li);
        });
    }
};
