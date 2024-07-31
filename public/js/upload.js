let transfer_file;
const chunk_size = 16384; // 保持原有的分块大小
const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB buffer
let queuedChunks = [];
let isSending = false;

// 初始化函数
(function () {
    document.getElementById('upload-submit').addEventListener('click', sendFile);
    document.getElementById('other').addEventListener('click', function () {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', function (event) {
        transfer_file = event.target.files[0];
        if (transfer_file) {
            preview()
        }
    });

    const fileElement = document.getElementById('file');
    fileElement.addEventListener("dragenter", preventDefault);
    fileElement.addEventListener("dragover", preventDefault);
    fileElement.addEventListener("drop", function (event) {
        preventDefault(event);
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            transfer_file = files[0];
        }
    });

    function preventDefault(event) {
        event.preventDefault();
    }
})();

function sendFile() {
    if (!transfer_file) {
        console.warn("请选择需要发送的文件!");
        return;
    }

    const fileMetadata = JSON.stringify({
        name: generateUUID(),
        type: transfer_file.type,
        size: transfer_file.size,
    });
    queueChunk(fileMetadata);

    const reader = new FileReader();
    let offset = 0;
    let chunkIndex = 0;

    reader.onload = function (e) {
        const chunk = e.target.result;
        const base64Data = arrayBufferToBase64(chunk);
        queueChunk(JSON.stringify({index: chunkIndex, data: base64Data}));

        chunkIndex++;
        offset += chunk.byteLength;

        if (offset < transfer_file.size) {
            readNextChunk();
        } else {
            queueChunk(JSON.stringify({schedule: 'EOF'}));
            startSending();
        }
    };

    function readNextChunk() {
        const slice = transfer_file.slice(offset, offset + chunk_size);
        reader.readAsArrayBuffer(slice);
    }

    readNextChunk();

    channel.addEventListener('message', function onFileReceived(event) {
        if (event.data === 'FILE_RECEIVED') {
            console.log(transfer_file.name, '文件发送成功!');
            resetSendState();
        } else if (event.data === 'FILE_DAMAGE') {
            console.log(transfer_file.name, '文件损坏!');
            resetSendState();
        }
        channel.removeEventListener('message', onFileReceived);
        document.querySelector('.close-btn').click();
    });
}

function queueChunk(chunk) {
    queuedChunks.push(chunk);
    if (!isSending) {
        startSending();
    }
}

function startSending() {
    if (!isSending) {
        isSending = true;
        sendNextChunk();
    }
}

function sendNextChunk() {
    if (queuedChunks.length === 0) {
        isSending = false;
        return;
    }

    if (channel.bufferedAmount > MAX_BUFFER_SIZE) {
        setTimeout(sendNextChunk, 100); // 等待100ms后重试
        return;
    }

    const chunk = queuedChunks.shift();
    channel.send(chunk);

    setTimeout(sendNextChunk, 0);
}

function resetSendState() {
    queuedChunks = [];
    isSending = false;
}
