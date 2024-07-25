import WebSocket from "ws";
import * as common from "./common";

class Device {

    private ip: string = ''; // 内网IP
    private id: string = '';
    private name: string = ''; // 设备名称
    private nickname: string; // 设备昵称

    private socket: WebSocket;

    /**
     * 最后一次心跳时间
     * 心跳包机制
     * @private
     */
    private lastBeat: number = Date.now();
    private heartbeat: NodeJS.Timeout | null = null;

    constructor(ip: string, id: string, name: string, socket: WebSocket) {
        this.ip = ip;
        this.id = id;
        this.name = name;
        this.nickname = common.nickname();
        this.socket = socket;
    }

    /**
     * @return device base info
     */
    get info(): {} {
        return {
            'id': this.id,
            'name': this.name,
            'nickname': this.nickname,
        };
    }

    get Id(): string {
        return this.id;
    }

    get Socket(): WebSocket {
        return this.socket
    }

    /**
     * set device heard beat
     * @param interval 定时时间
     * @param func 心跳方法
     */
    public setBeatFunc(interval: number, func: Function) {
        this.heartbeat = setTimeout(() => func(), interval);
    }

    /**
     * 取消心跳
     * @private
     */
    public cancelKeep() {
        if (this && this.heartbeat) {
            clearTimeout(this.heartbeat);
        }
    }

    /**
     * 如果需要更新就更新
     * 如果没有最后一次心跳时间的话，就设置一个心跳时间
     * @return device last beat time
     */
    public setLastBeatTime(update?: boolean) {
        this.lastBeat = update ? Date.now() : this.lastBeat || Date.now();
        return this.lastBeat;
    }

}

export default Device;
