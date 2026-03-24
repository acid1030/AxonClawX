/**
 * Ultra-Lite Health Check Middleware
 * Minimal health endpoint - <500B
 */

import type { Request, Response } from 'express';

/**
 * GET /health
 * Returns basic health status
 */
export function healthCheckUltra(req: Request, res: Response): void {
  res.json({
    status: 'ok',
    timestamp: Date.now()
  });
}

export default healthCheckUltra;
