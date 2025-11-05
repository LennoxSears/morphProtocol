/**
 * Factory for creating protocol template instances
 */

import { ProtocolTemplate, TemplateParams } from './base-template';
import { QuicTemplate } from './quic-template';
import { MinecraftTemplate } from './minecraft-template';
import { KcpTemplate } from './kcp-template';
import { GenericGamingTemplate } from './generic-gaming-template';
import { WebRtcTemplate } from './webrtc-template';
import { FortniteTemplate } from './fortnite-template';
import { PubgTemplate } from './pubg-template';
import { MobaTemplate } from './moba-template';
import { SteamTemplate } from './steam-template';
import { RaknetTemplate } from './raknet-template';
import { BilibiliTemplate } from './bilibili-template';
import { DouyinTemplate } from './douyin-template';

/**
 * Create protocol template instance by ID
 */
export function createTemplate(id: number, params?: TemplateParams): ProtocolTemplate {
  switch (id) {
    case 1:
      return new QuicTemplate(params);
    case 2:
      return new MinecraftTemplate(params);
    case 3:
      return new KcpTemplate(params);
    case 4:
      return new GenericGamingTemplate(params);
    case 5:
      return new WebRtcTemplate(params);
    case 6:
      return new FortniteTemplate(params);
    case 7:
      return new PubgTemplate(params);
    case 8:
      return new MobaTemplate(params);
    case 9:
      return new SteamTemplate(params);
    case 10:
      return new RaknetTemplate(params);
    case 11:
      return new BilibiliTemplate(params);
    case 12:
      return new DouyinTemplate(params);
    default:
      throw new Error(`Unknown template ID: ${id}`);
  }
}
