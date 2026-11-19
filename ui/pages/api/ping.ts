import type { NextApiRequest, NextApiResponse } from 'next';

export interface PingResponse {
  status: 'ok';
  timestamp: number;
  server: string;
  protocol: string;
}

export default function handler(req: NextApiRequest, res: NextApiResponse<PingResponse>) {
  // Prevent all caching to guarantee authentic live measurement of website round-trip latency
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  res.status(200).json({
    status: 'ok',
    timestamp: Date.now(),
    server: 'aegis-mesh-edge',
    protocol: req.headers['x-forwarded-proto'] ? String(req.headers['x-forwarded-proto']) : 'https'
  });
}
