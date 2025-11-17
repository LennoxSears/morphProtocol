import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

export interface ServerConfig {
  hostName: string;
  hostIp: string;
  handshakePortUdp: number;
  localWgAddress: string;
  localWgPort: number;
  password: string;
  timeoutDuration: number;
  trafficInterval: number;
  heartbeatInterval: number;
  debugMode: boolean;
  api: {
    subTrafficUrl: string;
    addClientNumUrl: string;
    subClientNumUrl: string;
    updateServerInfoUrl: string;
    authToken: string;
  };
}

export interface ClientConfig {
  remoteAddress: string;
  remotePort: number;
  userId: string;
  localWgAddress: string;
  localWgPort: number;
  maxRetries: number;
  heartbeatInterval: number;
  inactivityTimeout: number;
  debugMode: boolean;
  obfuscation: {
    key: number;
    layer: number;
    paddingLength: number;
  };
}

export function getServerConfig(): ServerConfig {
  return {
    hostName: process.env.HOST_NAME || 'unknown',
    hostIp: process.env.HOST_IP || '0.0.0.0',
    handshakePortUdp: Number(process.env.HANDSHAKE_PORT_UDP) || 12301,
    localWgAddress: process.env.LOCAL_WG_ADDRESS || '127.0.0.1',
    localWgPort: Number(process.env.LOCAL_WG_PORT) || 51820,
    password: process.env.PASSWORD || 'bumoyu123',
    timeoutDuration: Number(process.env.TIMEOUT_DURATION) || 1200000,
    trafficInterval: Number(process.env.TRAFFIC_INTERVAL) || 600000,
    heartbeatInterval: Number(process.env.HEARTBEAT_INTERVAL) || 120000,
    debugMode: process.env.DEBUG_MODE === 'true',
    api: {
      subTrafficUrl: process.env.SUB_TRAFFIC_URL || '',
      addClientNumUrl: process.env.ADD_CLIENTNUM_URL || '',
      subClientNumUrl: process.env.SUB_CLIENTNUM_URL || '',
      updateServerInfoUrl: process.env.UPDATE_SERVERINFO_URL || '',
      authToken: process.env.API_AUTH_TOKEN || '4EQQGDYZSDIYTCF4WJQFLXGBCNW6EAX6FVXA',
    },
  };
}

export function getClientConfig(remoteAddress: string): ClientConfig {
  const parts = remoteAddress.split(':');
  
  return {
    remoteAddress: parts[0],
    remotePort: Number(parts[1]) || 12301,
    userId: parts[2] || '',
    localWgAddress: process.env.LOCAL_WG_ADDRESS || '127.0.0.1',
    localWgPort: Number(process.env.LOCAL_WG_PORT) || 51820,
    maxRetries: Number(process.env.MAX_RETRIES) || 5,
    heartbeatInterval: Number(process.env.HEARTBEAT_INTERVAL) || 120000,
    inactivityTimeout: Number(process.env.INACTIVITY_TIMEOUT) || 30000,
    debugMode: process.env.DEBUG_MODE === 'true',
    obfuscation: {
      key: Math.floor(Math.random() * 256),
      layer: Number(process.env.OBFUSCATION_LAYER) || 3,
      paddingLength: Number(process.env.PADDING_LENGTH) || 8,
    },
  };
}
