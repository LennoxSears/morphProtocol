/**
 * Base interface for protocol templates
 * Templates wrap obfuscated data to mimic legitimate protocols
 * 
 * DUAL INDEXING APPROACH:
 * - Templates use protocol-native header fields as identifiers (4-8 bytes)
 * - Server maintains two indexes:
 *   1. ipIndex: Map<"ip:port:headerID", fullClientID> for O(1) lookup
 *   2. sessions: Map<fullClientID, Session> for IP migration support
 * - Zero packet overhead (use existing header fields)
 */

export interface TemplateParams {
  [key: string]: any;
}

export interface ProtocolTemplate {
  readonly id: number;
  readonly name: string;
  
  /**
   * Extract header ID from packet for dual indexing
   * This is the protocol-native identifier (QUIC connID, KCP conv, etc.)
   * @param packet - Complete packet with protocol header
   * @returns Header ID buffer (4-8 bytes depending on protocol)
   */
  extractHeaderID(packet: Buffer): Buffer | null;
  
  /**
   * Encapsulate obfuscated data with protocol header
   * @param data - Obfuscated payload
   * @param clientID - 16-byte client identifier (used to derive header fields)
   * @returns Complete packet: [protocol header][data]
   */
  encapsulate(data: Buffer, clientID: Buffer): Buffer;
  
  /**
   * Decapsulate protocol packet to extract obfuscated data
   * @param packet - Complete packet with protocol header
   * @returns Obfuscated payload (without protocol headers)
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

export abstract class BaseTemplate implements ProtocolTemplate {
  abstract readonly id: number;
  abstract readonly name: string;
  
  protected sequenceNumber: number;
  
  constructor(params?: TemplateParams) {
    // Initialize with random sequence number
    this.sequenceNumber = params?.initialSeq ?? Math.floor(Math.random() * 65536);
  }
  
  abstract extractHeaderID(packet: Buffer): Buffer | null;
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
