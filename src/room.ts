import * as common from './common';
import Device from "./device";
import device from "./device";

import WebSocket from "ws";
import {IncomingMessage} from "node:http";

class Room {

    private _wss: WebSocket.Server;
    private _session: Map<string, Device>;

    constructor(port: number) {
        this._wss = new WebSocket.Server({port: port});
        this._wss.on('connection', (socket: WebSocket, request: IncomingMessage) => this._onConnection(socket, request))
        this._session = new Map<string, Device>();
    }

    /**
     * 设备连接到当前服务上
     * @param socket web socket
     * @param req request
     * @private
     */
    private _onConnection(socket: WebSocket, req: IncomingMessage) {
        let info: common.info;
        try {
            info = common.reqParse(req);
            info.id = this._id(req);
        } catch (e) {
            console.warn('当前设备信息解析失败了!', e)
            return;
        }
        const device: device = new Device(info.ip, info.id, info.name, socket);
        this._joinRoom(device);
        device.Socket.on('message', message => this._onMessage(device, message))
        device.Socket.on('error', console.error);
        this._heardBeat(device);

        this._send(device, JSON.stringify({
            'type': "connect",
            'info': device.info,
        }))
    }

    /**
     * 将连接设备加入到房间中
     * @param device
     * @private
     */
    private _joinRoom(device: Device) {
        // 判断_session是否存在，如果不存在则创建
        if (!this._session) {
            this._session = new Map<string, Device>();
        }

        const id: string = device.Id;

        // 构建消息模板
        const message = (action: string) => JSON.stringify({
            'type': "join",
            'message': `设备: ${id} ${action}到房间!`,
            'info': device.info,
        });

        // 检查设备是否已经在房间中
        const existingDevice: Device | undefined = this._session.get(id);

        if (existingDevice) {
            console.log('房间中已经存在设备:', id);
            this._session.forEach(target => {
                if (target.Id !== id) this._send(target, message('重新回'))
            });
        } else {
            this._session.forEach(target =>
                this._send(target, message('加入'))
            );

            // 告诉新设备当前房间中有哪些旧的设备还在
            const otherDevices: {}[] = Array.from(this._session.values()).map((other: Device) => other.info);
            this._send(device, JSON.stringify({'type': 'other', 'array': otherDevices}));

            this._session.set(id, device);
            console.log(`<----------------------------------- 设备${device.Id}加入到房间`);

        }
    }

    /**
     * send message to specifying a device
     * @param device
     * @param message
     * @private
     */
    private _send(device: Device, message: string) {
        if (!device || !device.Socket) return;
        device.Socket.send(message, (err) => {
            if (err) {
                console.error(device.Id, '消息发送失败', message);
            }
        });
    }

    /**
     * 设置设备的心跳方法
     * @param device 设备
     * @private
     */
    private _heardBeat(device: Device) {
        device.cancelKeep();
        const lastBeatTime: number = device.setLastBeatTime();
        if (Date.now() - lastBeatTime > 3000) {
            console.log('设备心跳超时, 要被嘎了!');
            // device.cancelKeep();
            this._leaveRoom(device);
            return;
        }

        this._send(device, JSON.stringify({
            "type": "ping",
            "message": "node服务申请设备通信..."
        }))
        // 给设备上一个定时通讯的方法
        device.setBeatFunc(1000, () => this._heardBeat(device));
    }

    private _onMessage(sender: Device, message: WebSocket.RawData) {
        let msg: common.message;
        try {
            msg = JSON.parse(message.toString('utf-8'));
        } catch (e) {
            console.error(`${sender.Id} 发送给node服务的消息解析失败`, e)
            return;
        }

        // 处理消息
        switch (msg.type) {
            case 'pong':
                sender.setLastBeatTime(true);
                break;
            case 'disconnect':
                this._leaveRoom(sender);
                break;
            case 'channel':
                break;
            case 'answer':
                break;
            default:
                break;
        }

        // 如果是需要给目标设备发送消息的话
        if (msg.target) {
            const target: Device | undefined = this._session.get(msg.target);
            if (!target) return;
            delete msg.target;
            msg.sender = sender.Id;
            this._send(target, JSON.stringify(msg));
        }
    }

    /**
     * 设备离开房间
     * @param device 设备
     * @private
     */
    private _leaveRoom(device: Device) {
        console.log(`设备${device.Id}离开房间 ----------------------------------->`)
        this._session.delete(device.Id);
        device.cancelKeep();
        device.Socket.terminate();
        // 通知房间那其他的设备 XXX已离开
        this._session.forEach(target => {
            this._send(
                target,
                JSON.stringify({
                    'type': 'leave',
                    'message': `设备${device.Id}离开房间`,
                    'id': device.Id,
                })
            )
        });
    }

    /**
     * parse device request header cookie id
     * @param req
     * @private
     */
    private _id(req: IncomingMessage): string {
        let id: string | undefined = common.id(req)
        if (typeof id === 'undefined') {
            // TODO cookie not found
            throw new Error('cookie deviceId not found!')
        }
        return id?.toString();
    }
}

export default Room;
