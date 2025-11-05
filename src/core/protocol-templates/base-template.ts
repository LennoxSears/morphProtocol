/**
 * Base interface for protocol templates
 * Templates wrap obfuscated data to mimic legitimate protocols
 */

export interface TemplateParams {
  [key: string]: any;
}

export interface ProtocolTemplate {
  readonly id: number;
  readonly name: string;
  
  /**
   * Encapsulate obfuscated data with protocol header
   * @param data - Obfuscated payload (already contains clientID prepended by caller)
   * @param clientID - 16-byte client identifier
   * @returns Complete packet with protocol header + data
   */
  encapsulate(data: Buffer, clientID: Buffer): Buffer;
  
  /**
   * Decapsulate protocol packet to extract obfuscated data
   * @param packet - Complete packet with protocol header
   * @returns Object containing extracted clientID and obfuscated payload
   */
  decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null;
  
  /**
   * Get current template parameters (for handshake)
   */
  getParams(): TemplateParams;
  
  /**
   * Update internal state (sequence numbers, timestamps, etc.)
   */
  updateState(): void;
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
  abstract decapsulate(packet: Buffer): { clientID: Buffer; data: Buffer } | null;
  
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
