let transfer_file;
const chunk_size = 16384;

// 初始化函数
(function () {
    // 处理点击Other触发文件筛选事件
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

    // 处理 拖拽, 拖拽悬停, 文件拖放 事件
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

    // 禁用默认事件
    function preventDefault(event) {
        event.preventDefault();
    }
})();

/**
 * 发送文件
 */
function sendFile() {
    if (!transfer_file) {
        console.warn("请选择需要发送的文件!")
        return;
    }
    // 使用通道发送文件基本信息, 下载的名称, 类型
    const fileMetadata = JSON.stringify({
        name: generateUUID(),
        type: transfer_file.type,
        size: transfer_file.size,
    });
    channel.send(fileMetadata);

    const reader = new FileReader();
    let offset = 0;
    let chunkIndex = 0;

    reader.onload = function (e) {
        const chunk = e.target.result;
        const base64Data = arrayBufferToBase64(chunk); // 转换为 base64 字符串
        // channel.send(chunk);

        // 使用序号和分片数据发送
        channel.send(JSON.stringify({index: chunkIndex, data: base64Data}));
        chunkIndex++;
        offset += chunk.byteLength;

        if (offset < transfer_file.size) {
            readNextChunk();
        } else {
            channel.send(JSON.stringify({schedule: 'EOF'})); // End of file marker
        }
    };

    function readNextChunk() {
        const slice = transfer_file.slice(offset, offset + chunk_size);
        reader.readAsArrayBuffer(slice);
    }

    readNextChunk();

    // 添加接收确认消息的监听器
    channel.addEventListener('message', function onFileReceived(event) {
        if (event.data === 'FILE_RECEIVED') {
            console.log(transfer_file.name, '文件发送成功!');
        } else if (event.data === 'FILE_DAMAGE') {
            console.log(transfer_file.name, '文件损坏!');
        }
        channel.removeEventListener('message', onFileReceived);
        document.querySelector('.close-btn').click();
    });
}
