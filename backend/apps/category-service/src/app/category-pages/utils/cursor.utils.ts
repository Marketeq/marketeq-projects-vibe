/**
 * Cursor Utilities for Pagination
 * 
 * Implements opaque base64url-encoded cursors for stable pagination.
 * Cursors contain the last item's sorting key (createdAt + id) for deterministic ordering.
 */


export interface CursorData {
    id?: string;
    createdAt?: string;
  }
  
  /**
   * Encode cursor data to opaque base64url string
   * @param key - Object containing id and/or createdAt
   * @returns Base64url-encoded cursor string
   */
  export function encodeCursor(key: CursorData): string {
    return Buffer.from(JSON.stringify(key)).toString('base64url');
  }
  
  /**
   * Decode cursor string back to data object
   * @param token - Base64url-encoded cursor string
   * @returns Decoded cursor data or null if invalid
   */
  export function decodeCursor(token?: string): CursorData | null {
    if (!token) return null;
    
    try {
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      return JSON.parse(decoded);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Clamp limit to maximum allowed value
   * @param limit - Requested limit
   * @param max - Maximum allowed limit (default 10)
   * @returns Clamped limit value
   */
  export function clampLimit(limit?: number, max: number = 10): number {
    if (!limit || limit < 1) return max;
    return Math.min(limit, max);
  }