/**
 * Factory for creating protocol template instances
 */

import { ProtocolTemplate, TemplateParams } from './base-template';
import { QuicTemplate } from './quic-template';
import { KcpTemplate } from './kcp-template';
import { GenericGamingTemplate } from './generic-gaming-template';

/**
 * Create protocol template instance by ID
 */
export function createTemplate(id: number, params?: TemplateParams): ProtocolTemplate {
  switch (id) {
    case 1:
      return new QuicTemplate(params);
    case 2:
      return new KcpTemplate(params);
    case 3:
      return new GenericGamingTemplate(params);
    default:
      throw new Error(`Unknown template ID: ${id}. Valid IDs: 1 (QUIC), 2 (KCP), 3 (Generic Gaming)`);
  }
}
