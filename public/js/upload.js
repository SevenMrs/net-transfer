let transfer_file;
const chunk_size = 16384;

// 初始化函数
(function () {
    document.getElementById('upload-submit').addEventListener('click', sendFile);
    document.getElementById('other').addEventListener('click', function () {
        document.getElementById('fileInput').click();
    });
    document.getElementById('fileInput').addEventListener('change', function (event) {
        transfer_file = event.target.files[0];
        if (transfer_file) {
            // console.log(transfer_file);
            preview()
        }
    });

    const fileElement = document.getElementById('file');

    // 处理拖拽进入事件
    fileElement.addEventListener("dragenter", preventDefault);
    // 处理拖拽悬停事件
    fileElement.addEventListener("dragover", preventDefault);
    // 处理文件拖放事件
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
    const fileMetadata = JSON.stringify({
        name: generateUUID(),
        type: transfer_file.type
    });
    channel.send(fileMetadata);

    const reader = new FileReader();
    let offset = 0;

    reader.onload = function (e) {
        const chunk = e.target.result;
        channel.send(chunk);

        offset += chunk.byteLength;

        if (offset < transfer_file.size) {
            readNextChunk();
        } else {
            channel.send('EOF'); // End of file marker
        }
    };

    function readNextChunk() {
        const slice = transfer_file.slice(offset, offset + chunk_size);
        reader.readAsArrayBuffer(slice);
    }

    readNextChunk();
}

function truncateFilename(filename, maxLength) {
    if (filename.length <= maxLength) return filename;

    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.slice(0, filename.length - extension.length - 1);

    const half = Math.floor((maxLength - 3) / 2);
    const start = nameWithoutExt.slice(0, half);
    const end = nameWithoutExt.slice(-half);

    return `${start}...${end}.${extension}`;
}

function preview() {
    if (!transfer_file) return;

    const name = transfer_file.name;
    const sizeBytes = transfer_file.size;
    let size;
    if (sizeBytes < 1024) {
        size = `${sizeBytes} B`;
    } else if (sizeBytes < 1024 * 1024) {
        size = `${(sizeBytes / 1024).toFixed(2)} KB`;
    } else if (sizeBytes < 1024 * 1024 * 1024) {
        size = `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else {
        size = `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }

    // 隐藏所有的 span 标签
    document.querySelectorAll('#file .text1').forEach(item => {
        item.classList.add('hidden');
    });
    document.getElementById('text2').classList.add('hidden');
    document.getElementById('other').classList.add('hidden');

    // 创建容器展示文件信息
    const file = document.getElementById('file');
    const container = document.createElement('div');
    container.className = 'file-container';

    // 文件图标
    const fileImg = document.createElement('img');
    fileImg.src = './image/upload-file.png';
    fileImg.alt = 'File Icon';
    fileImg.className = 'file-icon';

    // 文件信息
    const fileInfo = document.createElement('div');
    fileInfo.className = 'file-info';

    const fileName = document.createElement('div');
    fileName.className = 'file-name';
    fileName.textContent = truncateFilename(name, 20);
    fileName.title = name; // 添加完整文件名作为 title

    const fileSize = document.createElement('div');
    fileSize.className = 'file-size';
    fileSize.textContent = size;

    fileInfo.appendChild(fileName);
    fileInfo.appendChild(fileSize);

    setTimeout(() => {
        container.classList.add('show');
    }, 10);
    // 显示文件信息容器
    file.classList.add('show');

    // 关闭按钮
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'close-btn';
    // 修改关闭按钮的点击事件处理
    closeButton.onclick = () => {
        container.classList.remove('show');
        setTimeout(() => {
            container.remove();
            transfer_file = null; // Clear the selected file
            // 显示所有的 span 标签
            document.querySelectorAll('#file .text1').forEach(item => {
                item.classList.remove('hidden');
            });
            document.getElementById('text2').classList.remove('hidden');
            document.getElementById('other').classList.remove('hidden');
        }, 300); // 等待过渡效果完成
    };
    
    container.appendChild(fileImg);
    container.appendChild(fileInfo);
    container.appendChild(closeButton);
    file.appendChild(container);

    // 显示文件信息容器
    file.classList.remove('hidden');
}

