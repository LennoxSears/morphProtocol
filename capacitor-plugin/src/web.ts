import { WebPlugin } from '@capacitor/core';

import type {
  MorphProtocolPlugin,
  ConnectionOptions,
  ConnectionResult,
  DisconnectionResult,
  StatusResult,
} from './definitions';

export class MorphProtocolWeb extends WebPlugin implements MorphProtocolPlugin {
  async connect(options: ConnectionOptions): Promise<ConnectionResult> {
    console.log('MorphProtocol web implementation - connect', options);
    return {
      success: false,
      message: 'MorphProtocol is not supported on web platform',
    };
  }

  async disconnect(): Promise<DisconnectionResult> {
    console.log('MorphProtocol web implementation - disconnect');
    return {
      success: false,
      message: 'MorphProtocol is not supported on web platform',
    };
  }

  async getStatus(): Promise<StatusResult> {
    console.log('MorphProtocol web implementation - getStatus');
    return {
      connected: false,
      status: 'MorphProtocol is not supported on web platform',
    };
  }
}
