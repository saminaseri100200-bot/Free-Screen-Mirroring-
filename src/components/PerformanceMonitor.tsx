import React, { useEffect, useRef } from 'react';
import { Activity, Zap, ShieldAlert, Cpu, Terminal } from 'lucide-react';
import { PerformanceStats, CastLog } from '../types';

interface PerformanceMonitorProps {
  stats: PerformanceStats;
  logs: CastLog[];
  lang: 'fa' | 'en';
}

export default function PerformanceMonitor({ stats, logs, lang }: PerformanceMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<{ fps: number; latency: number; bw: number }[]>([]);
  const isFa = lang === 'fa';

  // Record history for graphing
  useEffect(() => {
    const history = historyRef.current;
    history.push({
      fps: stats.fps,
      latency: stats.latency,
      bw: stats.bandwidth,
    });
    if (history.length > 50) {
      history.shift();
    }
  }, [stats]);

  // Graph rendering loop on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const history = historyRef.current;
    if (history.length < 2) return;

    // Plot FPS (Green/Blue/Turquoise line)
    ctx.strokeStyle = '#06b6d4'; // Cyan
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    history.forEach((point, idx) => {
      const x = (width / 50) * idx;
      // Map FPS (0 - 140) to height
      const y = height - (point.fps / 140) * (height - 20) - 10;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill area under FPS curve
    ctx.fillStyle = 'rgba(6, 182, 212, 0.05)';
    ctx.lineTo((width / 50) * (history.length - 1), height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // Plot Latency (Red/Orange line)
    ctx.strokeStyle = '#f97316'; // Orange
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    history.forEach((point, idx) => {
      const x = (width / 50) * idx;
      // Map Latency (0 - 80ms) to height
      const y = height - (Math.min(point.latency, 80) / 80) * (height - 20) - 10;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

  }, [stats]);

  return (
    <div className="glass-panel rounded-2xl p-6 text-white h-full flex flex-col justify-between shadow-2xl relative border border-gray-800" id="performance-monitor">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold font-sans flex items-center gap-2">
            <Activity className="text-cyan-400 w-5 h-5 animate-pulse" />
            {isFa ? 'نمودار کارایی و پهنای باند' : 'Performance Analytics'}
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block font-mono"></span>
              {isFa ? 'نرخ فریم (FPS)' : 'FPS'}
            </span>
            <span className="flex items-center gap-1 text-orange-400">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block font-mono"></span>
              {isFa ? 'تاخیر (Latency)' : 'Latency'}
            </span>
          </div>
        </div>

        {/* Real-time stats cubes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block">{isFa ? 'فریم ریت دریافتی' : 'Framerate'}</span>
            <span className="text-xl font-bold font-mono text-cyan-400 flex items-baseline gap-1">
              {stats.fps}
              <span className="text-xs text-gray-400">FPS</span>
            </span>
          </div>

          <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block">{isFa ? 'تاخیر پینگ فریم' : 'Latency'}</span>
            <span className="text-xl font-bold font-mono text-orange-400 flex items-baseline gap-1">
              {stats.latency.toFixed(1)}
              <span className="text-xs text-gray-400">ms</span>
            </span>
          </div>

          <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block">{isFa ? 'پهنای باند مصرفی' : 'Throughput'}</span>
            <span className="text-xl font-bold font-mono text-pink-400 flex items-baseline gap-1">
              {stats.bandwidth.toFixed(2)}
              <span className="text-xs text-gray-400">Mbps</span>
            </span>
          </div>

          <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800">
            <span className="text-[10px] text-gray-400 block">{isFa ? 'فریم‌های رها شده' : 'Dropped Frames'}</span>
            <span className="text-xl font-bold font-mono text-red-400 flex items-baseline gap-1">
              {stats.droppedFrames}
              <span className="text-xs text-gray-400">drp</span>
            </span>
          </div>
        </div>

        {/* Diagnostic Canvas */}
        <div className="relative mb-4 h-32 rounded-xl overflow-hidden border border-gray-800 bg-gray-950">
          <canvas ref={canvasRef} className="w-full h-full block" />
          <div className="absolute top-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 uppercase tracking-widest leading-none">
            {isFa ? 'نمودار زنده پیوسته ۱۲۰ هرتز' : 'Live 120Hz Oscilloscope'}
          </div>
        </div>
      </div>

      {/* Embedded Terminal logger logs */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-400 uppercase tracking-wider">
          <Terminal className="w-4 h-4 text-violet-400" />
          <span>{isFa ? 'گزارش رویدادهای زنده سیستم' : 'Live System Logs'}</span>
        </div>
        <div className="bg-gray-950 border border-gray-800/80 rounded-xl p-3 h-28 overflow-y-auto font-mono text-[11px] leading-relaxed select-text flex flex-col gap-1.5 scrollbar-thin">
          {logs.map((log) => {
            const color =
              log.type === 'success'
                ? 'text-emerald-400'
                : log.type === 'error'
                  ? 'text-red-400'
                  : log.type === 'warning'
                    ? 'text-amber-400'
                    : 'text-gray-300';
            return (
              <div key={log.id} className="flex gap-2 hover:bg-gray-900/30 px-1 rounded transition-colors">
                <span className="text-gray-500 shrink-0">{log.timestamp}</span>
                <span className="text-violet-400/80 shrink-0 select-none">[{log.source}]</span>
                <span className={`${color} break-all`}>{log.message}</span>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div className="text-gray-600 italic text-center py-4">
              {isFa ? 'در انتظار اتصال دستگاه فرستنده...' : 'Awaiting broadcaster connection event...'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
