/**
 * 文件名省略
 * @param filename
 * @param maxLength
 * @return {*|string}
 */
function truncateFilename(filename, maxLength) {
    if (filename.length <= maxLength) return filename;

    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.slice(0, filename.length - extension.length - 1);

    const half = Math.floor((maxLength - 3) / 2);
    const start = nameWithoutExt.slice(0, half);
    const end = nameWithoutExt.slice(-half);

    return `${start}...${end}.${extension}`;
}

/**
 * 窗口中显示预备上传的文件
 */
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
            transfer_file = null;
        }, 300); // 等待过渡效果完成
    };

    container.appendChild(fileImg);
    container.appendChild(fileInfo);
    container.appendChild(closeButton);
    file.appendChild(container);

    // 显示文件信息容器
    file.classList.remove('hidden');
}
