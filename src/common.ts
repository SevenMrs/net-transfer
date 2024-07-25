import {IncomingMessage} from 'http';
import {names, uniqueNamesGenerator} from 'unique-names-generator';
import crypto from 'crypto';
import parse, {IResult} from 'ua-parser-js';

const IPV4_START: string = '::ffff:';

/**
 * 通过Req解析出内网地址
 * @param req request
 * @constructor
 */
export function ip(req: IncomingMessage): string {
    const ip: string | undefined = req.socket.remoteAddress;
    if (!ip) {
        throw new Error('设备的内网IP解析没解析出来');
    } else {
        return ip.replace(IPV4_START, '');
    }
}

/**
 * 解析出设备浏览器环境
 * @param req request
 */
export function name(req: IncomingMessage): string {
    const ua: IResult = parse(req.headers['user-agent'] || '');

    let deviceName: string = 'Unknown Device';

    if (ua.os && ua.os.name) {
        deviceName = ua.os.name.replace('Mac OS', 'Mac');
    }

    if (ua.browser && ua.browser.name) {
        deviceName += ` ${ua.browser.name}`;
    }

    return deviceName;
}

/**
 * request headers cookie parse deviceId
 * @param req
 */
export function id(req: IncomingMessage): string | undefined {
    const cookies: string | undefined = req.headers.cookie;
    if (!cookies) return undefined;

    const cookieArray: string[] = cookies.split(';');

    for (const cookie of cookieArray) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'deviceId') {
            return value;
        }
    }
    return undefined;
}

/**
 * request base info parse
 * @param req
 */
export function reqParse(req: IncomingMessage): info {
    return {
        ip: ip(req),
        name: name(req),
        id: '',
    };
}

/**
 * 生成uuid
 */
export function uuid(): string {
    return crypto.randomUUID().toString();
}

/**
 * 生成设备昵称
 */
export function nickname(): string {
    return uniqueNamesGenerator({dictionaries: [names]});
}

export type info = {
    ip: string;
    id: string;
    name: string;
}

export type message = {
    type: string;
    sender?: string;
    target?: string;
    message: string;
}
