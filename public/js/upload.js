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
            console.log(transfer_file);
        } else {
            console.log('none');
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
            console.log(transfer_file)
        } else {
            console.log('没有拖拽文件');
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

