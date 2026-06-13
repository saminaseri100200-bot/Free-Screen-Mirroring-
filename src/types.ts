export interface AppSettings {
  fps: 30 | 60 | 120;
  resolution: '360p' | '720p' | '1080p' | '2K';
  connectionType: 'wifi' | 'bluetooth' | 'airplay';
  quality: 'Standard' | 'High' | 'UHD';
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'waiting';

export interface PerformanceStats {
  fps: number;
  latency: number; // in milliseconds
  bandwidth: number; // in Mbps
  droppedFrames: number;
  totalFrames: number;
  packetLoss: number; // percentage
  status: string;
}

export interface CastLog {
  id: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  source: 'Local' | 'Remote' | 'System';
}
