export interface MorphProtocolPlugin {
  /**
   * Connect to MorphProtocol server
   * @param options Connection configuration
   * @returns Promise with connection result
   */
  connect(options: ConnectionOptions): Promise<ConnectionResult>;

  /**
   * Disconnect from MorphProtocol server
   * @returns Promise with disconnection result
   */
  disconnect(): Promise<DisconnectionResult>;

  /**
   * Get current connection status
   * @returns Promise with current status
   */
  getStatus(): Promise<StatusResult>;

  /**
   * Add listener for connection events
   * @param eventName Event name ('connected' | 'disconnected' | 'error')
   * @param listenerFunc Callback function
   */
  addListener(
    eventName: 'connected' | 'disconnected' | 'error',
    listenerFunc: (event: ConnectionEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Remove all listeners
   */
  removeAllListeners(): Promise<void>;
}

export interface ConnectionOptions {
  /**
   * Server address (hostname or IP)
   */
  remoteAddress: string;

  /**
   * Server port
   */
  remotePort: number;

  /**
   * User ID
   */
  userId: string;

  /**
   * Encryption key (format: "base64key:base64iv")
   */
  encryptionKey: string;

  /**
   * Local WireGuard address (default: "127.0.0.1")
   */
  localWgAddress?: string;

  /**
   * Local WireGuard port (default: 51820)
   */
  localWgPort?: number;

  /**
   * Obfuscation layer count (1-4, default: 3)
   */
  obfuscationLayer?: number;

  /**
   * Padding length (1-8, default: 8)
   */
  paddingLength?: number;

  /**
   * Heartbeat interval in milliseconds (default: 30000)
   */
  heartbeatInterval?: number;

  /**
   * Inactivity timeout in milliseconds (default: 180000)
   */
  inactivityTimeout?: number;

  /**
   * Max retries (default: 10)
   */
  maxRetries?: number;

  /**
   * Handshake interval in milliseconds (default: 5000)
   */
  handshakeInterval?: number;

  /**
   * Encryption password (default: "bumoyu123")
   */
  password?: string;
}

export interface ConnectionResult {
  /**
   * Whether connection was successful
   */
  success: boolean;

  /**
   * Success or error message
   */
  message: string;

  /**
   * Client ID (hex string)
   */
  clientId?: string;

  /**
   * Server port assigned by the server
   */
  serverPort?: number;
}

export interface DisconnectionResult {
  /**
   * Whether disconnection was successful
   */
  success: boolean;

  /**
   * Success or error message
   */
  message: string;
}

export interface StatusResult {
  /**
   * Whether client is connected
   */
  connected: boolean;

  /**
   * Current status message
   */
  status: string;

  /**
   * Client ID if connected (hex string)
   */
  clientId?: string;

  /**
   * Server port if connected
   */
  serverPort?: number;
}

export interface ConnectionEvent {
  /**
   * Event type
   */
  type: 'connected' | 'disconnected' | 'error';

  /**
   * Event message
   */
  message: string;

  /**
   * Additional data
   */
  data?: any;
}

export interface PluginListenerHandle {
  remove: () => Promise<void>;
}
