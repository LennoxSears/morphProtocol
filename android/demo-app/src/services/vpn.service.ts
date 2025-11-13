import { MorphProtocol, ConnectionOptions, StatusResult } from '@morphprotocol/capacitor-plugin';

export interface VpnConfig {
  remoteAddress: string;
  remotePort: number;
  userId: string;
  encryptionKey: string;
  localWgAddress?: string;
  localWgPort?: number;
  obfuscationLayer?: number;
  paddingLength?: number;
  heartbeatInterval?: number;
  inactivityTimeout?: number;
  maxRetries?: number;
  handshakeInterval?: number;
  password?: string;
}

export class VpnService {
  private eventListeners: Map<string, (event: any) => void> = new Map();

  async connect(config: VpnConfig): Promise<void> {
    const options: ConnectionOptions = {
      remoteAddress: config.remoteAddress,
      remotePort: config.remotePort,
      userId: config.userId,
      encryptionKey: config.encryptionKey,
      localWgAddress: config.localWgAddress,
      localWgPort: config.localWgPort,
      obfuscationLayer: config.obfuscationLayer,
      paddingLength: config.paddingLength,
      heartbeatInterval: config.heartbeatInterval,
      inactivityTimeout: config.inactivityTimeout,
      maxRetries: config.maxRetries,
      handshakeInterval: config.handshakeInterval,
      password: config.password,
    };

    const result = await MorphProtocol.connect(options);
    if (!result.success) {
      throw new Error(result.message);
    }
  }

  async disconnect(): Promise<void> {
    const result = await MorphProtocol.disconnect();
    if (!result.success) {
      throw new Error(result.message);
    }
  }

  async getStatus(): Promise<StatusResult> {
    return await MorphProtocol.getStatus();
  }

  addEventListener(event: 'connected' | 'disconnected' | 'error', callback: (event: any) => void): void {
    this.eventListeners.set(event, callback);
    MorphProtocol.addListener(event, callback);
  }

  removeAllListeners(): void {
    this.eventListeners.clear();
    MorphProtocol.removeAllListeners();
  }
}

export const vpnService = new VpnService();
