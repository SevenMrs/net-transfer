let transfer_file;
const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB buffer
let isSending = false;

let totalChunks = 0;
let sentChunks = 0;

(function () {
    // DOM节点时间监听
    document.getElementById('upload-submit').addEventListener('click', sendFile);
    document.getElementById('other').addEventListener('click', () => document.getElementById('fileInput').click());
    document.getElementById('fileInput').addEventListener('change', function (event) {
        transfer_file = event.target.files[0];
        if (transfer_file) {
            preview();
        }
    });

    // 取消默认事件
    const fileElement = document.getElementById('file');
    ['dragenter', 'dragover', 'drop'].forEach(eventName => {
        fileElement.addEventListener(eventName, preventDefault);
    });
    fileElement.addEventListener("drop", function (event) {
        preventDefault(event)
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            transfer_file = files[0];
            preview();
        }
    });

    function preventDefault(event) {
        event.preventDefault();
    }
})();

/**
 * 发送文件数据
 */
function sendFile() {
    if (!transfer_file) {
        console.warn("请选择需要发送的文件!");
        return;
    }

    // 向对方发送文件的基本信息
    const fileMetadata = JSON.stringify({
        name: generateUUID(),
        type: transfer_file.type,
        size: transfer_file.size,
    });
    queueChunk(fileMetadata);

    totalChunks = Math.ceil(transfer_file.size / CHUNK_SIZE);
    sentChunks = 0;
    updateProgress(0);
    document.getElementById('progress-container').classList.remove('hidden');

    for (let i = 0; i < totalChunks; i++) {
        readAndQueueChunk(i);
    }

    channel.addEventListener('message', handleFileTransferResponse);
}

/**
 * 拆分文件
 * @param index
 */
function readAndQueueChunk(index) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, transfer_file.size);
    const slice = transfer_file.slice(start, end);

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64Data = arrayBufferToBase64(e.target.result);
        queueChunk(JSON.stringify({index: index, data: base64Data}));
        if (index === Math.ceil(transfer_file.size / CHUNK_SIZE) - 1) {
            queueChunk(JSON.stringify({schedule: 'EOF'}));
        }
    };
    reader.readAsArrayBuffer(slice);
}

function queueChunk(chunk) {
    sendQueue.push(chunk);
    if (!isSending) {
        isSending = true;
        sendNextChunk();
    }
}

function sendNextChunk() {
    if (sendQueue.length === 0) {
        isSending = false;
        return;
    }

    if (channel.bufferedAmount > MAX_BUFFER_SIZE) {
        setTimeout(sendNextChunk, 100); // 等待100ms后重试
        return;
    }

    const chunk = sendQueue.shift();
    channel.send(chunk);

    // 更新进度
    sentChunks++;
    const progress = (sentChunks / totalChunks) * 100;
    updateProgress(progress);

    setTimeout(sendNextChunk, 0);
}

function updateProgress(progress) {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${Math.round(progress)}%`;
}

function handleFileTransferResponse(event) {
    const response = JSON.parse(event.data);
    if (response.type === 'FILE_RECEIVED') {
        console.log(transfer_file.name, '文件发送成功!');
        resetSendState();
        channel.removeEventListener('message', handleFileTransferResponse);
        document.querySelector('.close-btn').click();
        // 隐藏进度条
        document.getElementById('progress-container').classList.add('hidden');
    } else if (response.type === 'FILE_DAMAGE') {
        console.log(transfer_file.name, '文件损坏!');
        resetSendState();
        channel.removeEventListener('message', handleFileTransferResponse);
        // 隐藏进度条
        document.getElementById('progress-container').classList.add('hidden');
    } else if (response.type === 'ACK') {
        // 可以在这里实现更复杂的流控制逻辑
        console.log(`Chunk ${response.index} acknowledged`);
    }
}

function resetSendState() {
    sendQueue = [];
    isSending = false;
}
