const parser = require('ua-parser-js');
const {uniqueNamesGenerator, animals, colors} = require('unique-names-generator');

/**
 * 连接的设备的Bean
 */
class Peer {

    constructor(socket, request) {
        this.socket = socket; // 设置 socket
        this._setIP(request); // 设置远程 IP
        this._setPeerId(request); // 设置 peer ID
        this.rtcSupported = request.url.indexOf('webrtc') > -1; // 检查是否支持 WebRTC
        this._setName(request); // 设置设备名称

        // 用于保持连接活跃
        this.timerId = 0;
        this.lastBeat = Date.now();
    }

    /**
     * 生成 UUID
     * @returns {string} 返回生成的 UUID
     */
    static uuid() {
        let uuid = '', ii;
        for (ii = 0; ii < 32; ii += 1) {
            switch (ii) {
                case 8:
                case 20:
                    uuid += '-';
                    uuid += (Math.random() * 16 | 0).toString(16);
                    break;
                case 12:
                    uuid += '-';
                    uuid += '4';
                    break;
                case 16:
                    uuid += '-';
                    uuid += (Math.random() * 4 | 8).toString(16);
                    break;
                default:
                    uuid += (Math.random() * 16 | 0).toString(16);
            }
        }
        return uuid;
    }

    /**
     * 解析请求，设置 IP 地址
     * @param {object} request - 客户端请求对象
     * @private
     */
    _setIP(request) {
        if (request.headers['x-forwarded-for']) {
            this.ip = request.headers['x-forwarded-for'].split(/\s*,\s*/)[0];
        } else {
            this.ip = request.connection.remoteAddress;
        }
        if (this.ip === '::1' || this.ip === '::ffff:127.0.0.1') {
            this.ip = '127.0.0.1';
        }
    }

    /**
     * 设置 peer ID
     * @param {object} request - 客户端请求对象
     * @private
     */
    _setPeerId(request) {
        if (request.peerId) {
            this.id = request.peerId;
        } else {
            this.id = request.headers.cookie.replace('peerid=', '');
        }
    }

    /**
     * 解析用户代理字符串，设置设备名称
     * @param {object} req - 客户端请求对象
     * @private
     */
    _setName(req) {
        // 解析用户代理字符串
        let ua = parser(req.headers['user-agent']);
        let deviceName = '';

        if (ua.os && ua.os.name) {
            deviceName = ua.os.name.replace('Mac OS', 'Mac') + ' ';
        }

        // 如果设备型号存在，添加到设备名称中；否则，添加浏览器名称
        if (ua.device.model) {
            deviceName += ua.device.model;
        } else {
            deviceName += ua.browser.name;
        }

        if (!deviceName) deviceName = 'Unknown Device';

        // 使用 unique-names-generator 生成一个唯一的显示名称
        const displayName = uniqueNamesGenerator({
            length: 2,
            separator: ' ',
            dictionaries: [colors, animals],
            style: 'capital',
            seed: this.id.hashCode()
        });

        // 将解析出的信息和生成的显示名称存入 this.name 属性中
        this.name = {
            model: ua.device.model,
            os: ua.os.name,
            browser: ua.browser.name,
            type: ua.device.type,
            deviceName,
            displayName
        };
    }

    /**
     * 获取设备信息
     * @returns {object} 包含设备信息的对象
     */
    getInfo() {
        return {
            id: this.id,
            name: this.name,
            rtcSupported: this.rtcSupported
        };
    }
}

module.exports = Peer
