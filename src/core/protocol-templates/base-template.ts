/**
 * Base interface for protocol templates
 * Templates wrap obfuscated data to mimic legitimate protocols
 * 
 * IMPORTANT: All templates MUST place the 16-byte clientID at the start of the packet
 * for O(1) session lookup. Packet structure:
 * [ClientID: 16 bytes][Protocol Header: varies][Obfuscated Data: N bytes]
 */

export interface TemplateParams {
  [key: string]: any;
}

export interface ProtocolTemplate {
  readonly id: number;
  readonly name: string;
  
  /**
   * Encapsulate obfuscated data with protocol header
   * @param data - Obfuscated payload
   * @param clientID - 16-byte client identifier (MUST be placed at bytes 0-15)
   * @returns Complete packet: [clientID][protocol header][data]
   */
  encapsulate(data: Buffer, clientID: Buffer): Buffer;
  
  /**
   * Decapsulate protocol packet to extract obfuscated data
   * @param packet - Complete packet (clientID already extracted by caller)
   * @returns Obfuscated payload (without clientID or protocol headers)
   */
  decapsulate(packet: Buffer): Buffer | null;
  
  /**
   * Get current template parameters (for handshake)
   */
  getParams(): TemplateParams;
  
  /**
   * Update internal state (sequence numbers, timestamps, etc.)
   */
  updateState(): void;
}

/**
 * Static helper to extract clientID from any template packet
 * All templates place clientID at bytes 0-15
 */
export function extractClientID(packet: Buffer): Buffer | null {
  if (packet.length < 16) {
    return null;
  }
  return packet.slice(0, 16);
}

export abstract class BaseTemplate implements ProtocolTemplate {
  abstract readonly id: number;
  abstract readonly name: string;
  
  protected sequenceNumber: number;
  
  constructor(params?: TemplateParams) {
    // Initialize with random sequence number
    this.sequenceNumber = params?.initialSeq ?? Math.floor(Math.random() * 65536);
  }
  
  abstract encapsulate(data: Buffer, clientID: Buffer): Buffer;
  abstract decapsulate(packet: Buffer): Buffer | null;
  
  getParams(): TemplateParams {
    return {
      initialSeq: this.sequenceNumber
    };
  }
  
  updateState(): void {
    // Increment sequence number (wrap at 65536 for 2-byte sequences)
    this.sequenceNumber = (this.sequenceNumber + 1) % 65536;
  }
}
