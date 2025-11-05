/**
 * Template selection with weighted random for China GFW resistance
 */

export interface TemplateWeight {
  id: number;
  weight: number;
}

// Weighted selection favoring Chinese-owned platforms
// Total weight: 104
// Chinese templates (3,7,8,11,12) = 56/104 = 54% probability
export const TEMPLATE_WEIGHTS: TemplateWeight[] = [
  { id: 1, weight: 10 },  // QUIC - universal
  { id: 2, weight: 8 },   // Minecraft - popular
  { id: 3, weight: 12 },  // KCP - made in China
  { id: 4, weight: 5 },   // Generic - fallback
  { id: 5, weight: 7 },   // WebRTC - WeChat
  { id: 6, weight: 5 },   // Fortnite
  { id: 7, weight: 12 },  // PUBG - Tencent
  { id: 8, weight: 12 },  // MOBA - Tencent (王者荣耀)
  { id: 9, weight: 7 },   // Steam - DOTA 2
  { id: 10, weight: 6 },  // Raknet
  { id: 11, weight: 10 }, // Bilibili - Chinese
  { id: 12, weight: 10 }  // Douyin - Chinese
];

/**
 * Select random template ID using weighted probability
 */
export function selectRandomTemplate(): number {
  const totalWeight = TEMPLATE_WEIGHTS.reduce((sum, t) => sum + t.weight, 0);
  let random = Math.floor(Math.random() * totalWeight);
  
  for (const template of TEMPLATE_WEIGHTS) {
    random -= template.weight;
    if (random < 0) {
      return template.id;
    }
  }
  
  // Fallback (should never reach here)
  return 1;
}
