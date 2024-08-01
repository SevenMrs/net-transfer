let transfer_file;
const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB buffer
let isSending = false;

//流控制参数
let totalChunks = 0;
let sendQueue = [];
const CHUNK_SIZE = 1024 * 160; // (128kb + 32kb) 最大好像就是这么大, 再大就撕裂了

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

    // 计算分片数量, 并设置进度条样式
    totalChunks = Math.ceil(transfer_file.size / CHUNK_SIZE);
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
        // 转码之后(JSONString 没法直接传输ArrayBuffer) 塞队列
        const base64Data = arrayBufferToBase64(e.target.result);
        queueChunk(JSON.stringify({index: index, data: base64Data}));
        if (index === Math.ceil(transfer_file.size / CHUNK_SIZE) - 1) {
            queueChunk(JSON.stringify({schedule: 'EOF'}));
        }
    };
    reader.readAsArrayBuffer(slice);
}

/**
 * 将需要给数据通道发送的消息都加入到队列中
 * @param chunk 消息块
 */
function queueChunk(chunk) {
    sendQueue.push(chunk);
    if (!isSending) {
        isSending = true;
        sendNextChunk();
    }
}

/**
 * 队列分片发送方法
 */
function sendNextChunk() {
    if (sendQueue.length === 0) {
        isSending = false;
        return;
    }

    // 如果缓冲区的大小大于检测目标, 退出当前方法, 执行异步启动
    if (channel.bufferedAmount > MAX_BUFFER_SIZE) {
        setTimeout(sendNextChunk, 100);
        return;
    }

    // 执行了一个类似与递归的方法, 进行分片的数据发送
    const chunk = sendQueue.shift();
    channel.send(chunk);
    setTimeout(sendNextChunk, 0);
}

/**
 * 进度条更新方法
 * @param progress
 */
function updateProgress(progress) {
    requestAnimationFrame(() => {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    })
}

/**
 * 对响应消息进行解析
 * @param event
 */
function handleFileTransferResponse(event) {

    function endFunc() {
        sendQueue = []; // 初始化队列的信息
        isSending = false;
        channel.removeEventListener('message', handleFileTransferResponse); // 删除消息监听, 防止内存泄漏
        document.getElementById('progress-container').classList.add('hidden'); // 隐藏进度条
    }

    const response = JSON.parse(event.data);
    if (response.type === 'FILE_RECEIVED') {
        console.log(transfer_file.name, '文件发送成功!');
        endFunc();
        document.querySelector('.close-btn').click();
    } else if (response.type === 'FILE_DAMAGE') {
        console.log(transfer_file.name, '文件损坏!');
        endFunc();
    } else if (response.type === 'ACK') {
        // 可以在这里实现更复杂的流控制逻辑
        console.log(`Chunk ${response.index} acknowledged`);
        updateProgress((response.index + 1) / totalChunks * 100);
    }
}
