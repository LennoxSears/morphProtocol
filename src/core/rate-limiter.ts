/**
 * Rate Limiter
 * Provides per-IP rate limiting for handshakes and packets
 */

interface RateLimit {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimit> = new Map();
  private maxRequests: number;
  private windowMs: number;
  
  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }
  
  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const limit = this.limits.get(key);
    
    if (!limit || now > limit.resetTime) {
      // New window
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }
    
    if (limit.count >= this.maxRequests) {
      // Rate limit exceeded
      return false;
    }
    
    // Increment count
    limit.count++;
    return true;
  }
  
  /**
   * Cleanup expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, limit] of this.limits.entries()) {
      if (now > limit.resetTime) {
        this.limits.delete(key);
      }
    }
  }
  
  /**
   * Get current count for key
   */
  getCount(key: string): number {
    const limit = this.limits.get(key);
    if (!limit || Date.now() > limit.resetTime) {
      return 0;
    }
    return limit.count;
  }
  
  /**
   * Reset limit for key
   */
  reset(key: string) {
    this.limits.delete(key);
  }
}
