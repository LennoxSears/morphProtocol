import axios from 'axios';
import { getServerConfig } from '../config';
import { logger } from '../utils/logger';

const config = getServerConfig();
const subTrafficUrl = config.api.subTrafficUrl;

export const subTraffic = async (userId: string | undefined, traffic: number | undefined) => {
    if (userId && traffic) {
        await axios({
            method: 'post',
            url: subTrafficUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': config.api.authToken
            },
            data: {
                id: userId,
                traffic: traffic
            }
        })
            .then(function (response: any) {
                logger.debug('Traffic subtracted', { userId, traffic, response: response.data });
            })
            .catch(function (error: any) {
                logger.error('Failed to subtract traffic', { error: error.message });
            });
    }
}

const addClientNumUrl = config.api.addClientNumUrl;
export const addClientNum = async (name: string | undefined) => {
    if (name) {
        await axios({
            method: 'post',
            url: addClientNumUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': config.api.authToken
            },
            data: {
                name: name
            }
        })
            .then(function (response: any) {
                logger.debug('Client count incremented', { name, response: response.data });
            })
            .catch(function (error: any) {
                logger.error('Failed to increment client count', { error: error.message });
            });
    }
}

const subClientNumUrl = config.api.subClientNumUrl;
export const subClientNum = async (name: string | undefined) => {
    if (name) {
        await axios({
            method: 'post',
            url: subClientNumUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': config.api.authToken
            },
            data: {
                name: name
            }
        })
            .then(function (response: any) {
                logger.debug('Client count decremented', { name, response: response.data });
            })
            .catch(function (error: any) {
                logger.error('Failed to decrement client count', { error: error.message });
            });
    }
}

const updateServerInfoUrl = config.api.updateServerInfoUrl;
export const updateServerInfo = async (name: string | undefined, ip: string | undefined, port: number, info: string | undefined) => {
    if (name && ip && info) {
        await axios({
            method: 'post',
            url: updateServerInfoUrl,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': config.api.authToken
            },
            data: {
                name: name,
                ip: ip,
                port: port.toString(),
                info: info,
                status: 'running'
            }
        })
            .then(function () {
                logger.info('Server info updated', { name, ip, port });
            })
            .catch(function (error: any) {
                logger.error('Failed to update server info', { error: error.message });
            });
    }
    else {
        logger.warn('updateServerInfo called with invalid parameters', { name, ip, info });
    }
}