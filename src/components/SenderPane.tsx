import React, { useState, useEffect, useRef } from 'react';
import { Camera, RefreshCw, Layers, MonitorPlay, Wifi, Bluetooth, Play, Square, Settings, Radio, Check, Smartphone, Zap } from 'lucide-react';
import { AppSettings } from '../types';

interface SenderPaneProps {
  sessionId: string;
  ws: WebSocket | null;
  lang: 'fa' | 'en';
  isEmbeddedSimulator?: boolean;
}

export default function SenderPane({
  sessionId,
  ws,
  lang,
  isEmbeddedSimulator = false,
}: SenderPaneProps) {
  const isFa = lang === 'fa';
  
  // Cast configurations
  const [settings, setSettings] = useState<AppSettings>({
    fps: 120,
    resolution: '720p',
    connectionType: 'wifi',
    quality: 'High',
  });

  const [activeSource, setActiveSource] = useState<'vector' | 'camera' | 'screen'>('vector');
  const [isCasting, setIsCasting] = useState<boolean>(false);
  const [actualFps, setActualFps] = useState<number>(0);
  const [bandwidthUsed, setBandwidthUsed] = useState<number>(0);
  const [clientConnected, setClientConnected] = useState<boolean>(false);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameCount = useRef<number>(0);
  const lastFpsTime = useRef<number>(performance.now());
  const lastSendTime = useRef<number>(performance.now());
  const particles = useRef<{ x: number; y: number; vx: number; vy: number; color: string; size: number }[]>([]);

  // Init interactive vector particles for the 120 FPS simulated game/physics screen
  useEffect(() => {
    const list = [];
    const colors = ['#a78bfa', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'];
    for (let i = 0; i < 35; i++) {
      list.push({
        x: Math.random() * 320,
        y: Math.random() * 568,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 12 + 4,
      });
    }
    particles.current = list;
  }, []);

  // Sync settings metadata with receiver
  const sendSettingsChange = (newSettings: AppSettings) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'settings-change',
        sessionId,
        settings: newSettings,
      }));
    }
  };

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    sendSettingsChange(next);
  };

  // Start Cast Stream
  const startCasting = async () => {
    if (isCasting) return;
    setIsCasting(true);
    frameCount.current = 0;
    lastFpsTime.current = performance.now();
    lastSendTime.current = performance.now();

    if (activeSource === 'camera') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: settings.fps },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log('Video play interrupted', e));
        }
      } catch (err) {
        console.error('Camera acquisition failed:', err);
        alert(isFa ? 'دسترسی به دوربین مسدود شده یا دوربین یافت نشد!' : 'Camera block or camera not found');
        setActiveSource('vector');
      }
    } else if (activeSource === 'screen') {
      try {
        // Safe check for screenshare support on device Safari/Chrome
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: settings.fps }
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.log('Video play interrupted', e));
        }
      } catch (err) {
        console.error('Screen capture declined:', err);
        alert(isFa ? 'شروع فیلمبرداری لغو شد یا در مرورگر این گوشی مجاز نیست!' : 'Screen cast was rejected or unsupported on this device');
        setActiveSource('vector');
      }
    }

    // Launch streaming render loop
    loop();
  };

  // Stop Cast Stream
  const stopCasting = () => {
    setIsCasting(false);
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Clean-up loop
  useEffect(() => {
    return () => {
      stopCasting();
    };
  }, [activeSource, settings]);

  const loop = () => {
    if (!isCasting) return;

    const now = performance.now();
    const frameInterval = 1000 / settings.fps;
    const elapsed = now - lastSendTime.current;

    // Throttle rendering according to target FPS (up to 120)
    if (elapsed >= frameInterval) {
      lastSendTime.current = now - (elapsed % frameInterval);
      captureAndSendFrame();
    }

    // Frame counter for live FPS ticker
    frameCount.current++;
    if (now - lastFpsTime.current >= 1000) {
      setActualFps(frameCount.current);
      frameCount.current = 0;
      lastFpsTime.current = now;
    }

    animationFrameId.current = requestAnimationFrame(loop);
  };

  const captureAndSendFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on selected resolution (e.g., 720p is 1280x720, etc.)
    let targetWidth = 640;
    let targetHeight = 1136; // iPhone 16:9 vertical mockup
    if (settings.resolution === '360p') { targetWidth = 360; targetHeight = 640; }
    else if (settings.resolution === '720p') { targetWidth = 540; targetHeight = 960; }
    else if (settings.resolution === '1080p') { targetWidth = 1080; targetHeight = 1920; }
    else if (settings.resolution === '2K') { targetWidth = 1440; targetHeight = 2560; }

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    // Capture source
    if ((activeSource === 'camera' || activeSource === 'screen') && videoRef.current && videoRef.current.readyState >= 2) {
      // Draw camera video stream
      ctx.drawImage(videoRef.current, 0, 0, targetWidth, targetHeight);
    } else {
      // Vector Physics Generator at 120 FPS
      ctx.fillStyle = '#0f172a'; // Deep slate
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Grid background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < targetWidth; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, targetHeight);
        ctx.stroke();
      }
      for (let y = 0; y < targetHeight; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(targetWidth, y);
        ctx.stroke();
      }

      // Draw bouncing physics particles
      particles.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // Boundaries check
        if (p.x < p.size || p.x > targetWidth - p.size) p.vx *= -1;
        if (p.y < p.size || p.y > targetHeight - p.size) p.vy *= -1;

        // Draw particle with glow
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowBlur = 0; // Reset shadow for efficiency
      });

      // Digital Latency Ticker
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 24px JetBrains Mono, sands-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${new Date().toISOString().split('T')[1].slice(0, 11)}`, targetWidth / 2, 80);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText('LETSVIEW ULTRA SENDER - 120HZ TEST', targetWidth / 2, 110);

      // Moving Sine wave represent frequency
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const amplitude = 30;
      const frequency = 0.02;
      for (let x = 0; x < targetWidth; x++) {
        const y = targetHeight / 2 + Math.sin(x * frequency + performance.now() * 0.01) * amplitude;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Device frame metadata info overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(20, targetHeight - 120, targetWidth - 40, 100);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.strokeRect(20, targetHeight - 120, targetWidth - 40, 100);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.font = '14px Inter';
      ctx.fillText(`Target Speed: ${settings.fps} FPS`, 40, targetHeight - 90);
      ctx.fillText(`Casting Model: Apple iPhone 16 Pro`, 40, targetHeight - 70);
      ctx.fillText(`Status: Streaming Frame #${Math.floor(performance.now() / 10)}`, 40, targetHeight - 50);
    }

    // Convert frame to JPG buffer and transmit
    // Quality compression adjustment
    const qualityLevel = settings.quality === 'Standard' ? 0.45 : settings.quality === 'High' ? 0.75 : 0.95;

    // Capture canvas frame as base64 URL
    const frameData = canvas.toDataURL('image/jpeg', qualityLevel);

    // Calculate simulated Bluetooth packet splits and bandwidth usage
    // Base64 size in bytes roughly equals bytes * 0.75
    const byteSize = Math.round(frameData.length * 0.75);
    const mbitSize = (byteSize * 8) / (1024 * 1024);
    setBandwidthUsed(mbitSize * actualFps);

    // Prepare casting payload
    const payload: any = {
      type: 'frame',
      sessionId,
      data: frameData,
      info: {
        width: targetWidth,
        height: targetHeight,
        size: byteSize,
        timestamp: performance.now(),
        fps: settings.fps,
        connectionType: settings.connectionType,
      },
    };

    // If bluetooth emulation is turned on, we mock packet-by-packet slice delay
    if (settings.connectionType === 'bluetooth') {
      // Mock Bluetooth serial delay overhead
      payload.bluetoothMtu = 1024 * 4; // 4KB chunks
      payload.isSegmented = true;
    }

    // Direct Web socket transmission
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  };

  return (
    <div className="glass-panel text-white rounded-2xl p-6 shadow-2xl border border-gray-800 relative" id="sender-pane">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-pink-500 rounded-t-2xl"></div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Smartphone className="text-pink-400 w-5 h-5" />
              {isFa ? 'کنترلر فرستنده آیفون (Broadcaster)' : 'iPhone Airplay Sender'}
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {isFa 
              ? 'با تغییر منوها و فریم‌ریت، بازتاب تصویر کامپیوتر را به‌صورت آنی مدیریت و مقایسه کنید.'
              : 'Modify frame rates and feed type to live-cast streams directly into the computer tab.'}
          </p>
        </div>

        {/* Casting Trigger Indicators */}
        <div className="flex items-center gap-3">
          {isCasting ? (
            <button
              id="btn-stop-cast"
              onClick={stopCasting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all shadow-lg shadow-red-600/20"
            >
              <Square className="w-4 h-4 fill-white" />
              {isFa ? 'قطع اتصال' : 'Stop Casting'}
            </button>
          ) : (
            <button
              id="btn-start-cast"
              onClick={startCasting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 rounded-xl text-xs font-bold font-sans transition-all shadow-lg shadow-emerald-600/20 animate-bounce"
            >
              <Play className="w-4 h-4 fill-white" />
              {isFa ? 'شروع آینه کردن' : 'Start Airplay'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left column Settings controls */}
        <div className="md:col-span-5 space-y-5">
          {/* Casting Source Selection */}
          <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/80">
            <label className="text-xs text-gray-400 block mb-3 font-semibold uppercase tracking-wider">
              {isFa ? 'منبع تصویر ورودی' : 'Broadcaster Video Source'}
            </label>
            <div className="flex flex-col gap-2">
              <button
                id="source-vector"
                onClick={() => { setActiveSource('vector'); stopCasting(); }}
                className={`flex items-center gap-3 p-3 rounded-lg text-left text-xs font-sans transition-all ${
                  activeSource === 'vector'
                    ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                    : 'bg-gray-950/60 border-gray-850 text-gray-400 hover:text-white hover:bg-gray-900'
                } border`}
              >
                <Zap className="w-4 h-4" />
                <div className="flex-1 text-right">
                  <span className="block font-bold mb-0.5">{isFa ? 'شبیه‌ساز تصویر پویای ۱۲۰ فریم' : '120Hz Geometric Physics'}</span>
                  <span className="text-[10px] text-gray-400 font-sans block">physics generator, digital millisecond clock, vector engine</span>
                </div>
              </button>

              <button
                id="source-camera"
                onClick={() => { setActiveSource('camera'); stopCasting(); }}
                className={`flex items-center gap-3 p-3 rounded-lg text-left text-xs font-sans transition-all ${
                  activeSource === 'camera'
                    ? 'bg-pink-600/20 border-pink-500/50 text-pink-300'
                    : 'bg-gray-950/60 border-gray-850 text-gray-400 hover:text-white hover:bg-gray-900'
                } border`}
              >
                <Camera className="w-4 h-4" />
                <div className="flex-1 text-right">
                  <span className="block font-bold mb-0.5">{isFa ? 'دوربین واقعی آیفون (کمره‌)' : 'Live Device Video Camera'}</span>
                  <span className="text-[10px] text-gray-400 font-sans block">real-time device front or back hardware camera</span>
                </div>
              </button>

              <button
                id="source-screen"
                onClick={() => { setActiveSource('screen'); stopCasting(); }}
                className={`flex items-center gap-3 p-3 rounded-lg text-left text-xs font-sans transition-all ${
                  activeSource === 'screen'
                    ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                    : 'bg-gray-950/60 border-gray-850 text-gray-400 hover:text-white hover:bg-gray-900'
                } border`}
              >
                <MonitorPlay className="w-4 h-4" />
                <div className="flex-1 text-right">
                  <span className="block font-bold mb-0.5">{isFa ? 'به اشتراک‌گذاری اسکرین آیفون' : 'Direct iOS Screen Share'}</span>
                  <span className="text-[10px] text-gray-400 font-sans block">safari screen capture sharing standard protocol</span>
                </div>
              </button>
            </div>
          </div>

          {/* Adjust Frame Rate */}
          <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/80">
            <label className="text-xs text-gray-400 block mb-3 font-semibold uppercase tracking-wider">
              {isFa ? 'نرخ فریم ریت هدف (FPS)' : 'Target Framerate Control'}
            </label>
            <div className="grid grid-cols-3 gap-2 bg-gray-950 p-1 rounded-lg border border-gray-850">
              {([30, 60, 120] as const).map((v) => (
                <button
                  key={v}
                  id={`fps-${v}`}
                  onClick={() => handleSettingChange('fps', v)}
                  className={`py-2 rounded text-xs font-bold font-mono transition-all ${
                    settings.fps === v
                      ? 'bg-violet-600 text-white shadow shadow-violet-600/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {v} FPS
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Options */}
          <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/80">
            <label className="text-xs text-gray-400 block mb-3 font-semibold uppercase tracking-wider">
              {isFa ? 'کیفیت رزولوشن پخش' : 'Broadcast Resolution'}
            </label>
            <div className="grid grid-cols-4 gap-2 bg-gray-950 p-1 rounded-lg border border-gray-850">
              {(['360p', '720p', '1080p', '2K'] as const).map((r) => (
                <button
                  key={r}
                  id={`res-${r}`}
                  onClick={() => handleSettingChange('resolution', r)}
                  className={`py-2.5 rounded text-[11px] font-bold font-mono transition-all ${
                    settings.resolution === r
                      ? 'bg-pink-600 text-white shadow shadow-pink-600/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Connection Profile Emulator */}
          <div className="bg-gray-900/40 p-4 rounded-xl border border-gray-800/80">
            <label className="text-xs text-gray-400 block mb-3 font-semibold uppercase tracking-wider">
              {isFa ? 'پروفایل سخت‌افزاری ارتباط' : 'Hardware Stream Profile'}
            </label>
            <div className="grid grid-cols-3 gap-1 bg-gray-950 p-1 rounded-xl">
              <button
                id="conn-wifi"
                onClick={() => handleSettingChange('connectionType', 'wifi')}
                className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] sm:text-xs font-sans font-bold transition-all ${
                  settings.connectionType === 'wifi'
                    ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-300'
                    : 'text-gray-400 hover:text-white'
                } border border-transparent`}
              >
                <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                <span>Wi-Fi</span>
              </button>
              <button
                id="conn-bt"
                onClick={() => handleSettingChange('connectionType', 'bluetooth')}
                className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] sm:text-xs font-sans font-bold transition-all ${
                  settings.connectionType === 'bluetooth'
                    ? 'bg-amber-600/20 border-amber-500/50 text-amber-300'
                    : 'text-gray-400 hover:text-white'
                } border border-transparent`}
              >
                <Bluetooth className="w-3.5 h-3.5 text-amber-500" />
                <span>Bluetooth</span>
              </button>
              <button
                id="conn-airplay"
                onClick={() => handleSettingChange('connectionType', 'airplay')}
                className={`flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] sm:text-xs font-sans font-bold transition-all ${
                  settings.connectionType === 'airplay'
                    ? 'bg-pink-600/20 border-pink-500/50 text-pink-300'
                    : 'text-gray-400 hover:text-white'
                } border border-transparent`}
              >
                <Smartphone className="w-3.5 h-3.5 text-pink-400" />
                <span>AirPlay</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Broadcaster Monitor Feed */}
        <div className="md:col-span-7 flex flex-col justify-between">
          <div className="bg-gray-950 border border-gray-850 rounded-2xl overflow-hidden p-3 relative flex-1 flex flex-col items-center justify-center min-h-[300px]">
            {/* Aspect ratio frame for virtual phone screen content preview */}
            <div className="w-[200px] h-[356px] bg-slate-900 border-4 border-gray-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col justify-between bg-black">
              {/* Dynamic Camera or Physics preview inside frame */}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-cover rounded-xl"
                style={{ display: activeSource === 'vector' ? 'block' : 'none' }}
              />
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover rounded-xl"
                style={{ display: activeSource !== 'vector' ? 'block' : 'none' }}
              />

              {/* Status pill overlay inside phone view */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-[9px] font-mono tracking-wider flex items-center gap-1.5 backdrop-blur-sm border border-gray-800">
                <span className={`w-1.5 h-1.5 rounded-full ${isCasting ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></span>
                <span>{isCasting ? 'CASTING' : 'READY'}</span>
              </div>

              {/* Camera layout outline */}
              {!isCasting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-black/30 backdrop-blur-xs">
                  <Smartphone className="w-10 h-10 text-gray-500 mb-2 animate-bounce" />
                  <p className="text-[10px] text-gray-400 leading-snug font-sans">
                    {isFa ? 'برای شروع آینه کاری دکمه پخش بالا را انتخاب کنید' : 'Click "Start Airplay" above to trigger high-speed frame capture.'}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs font-mono text-gray-400">
              <span className="flex items-center gap-1">
                {isFa ? 'پینگ پالس:' : 'Ping:'}{' '}
                <strong className="text-emerald-400">{settings.connectionType === 'wifi' ? '4.2ms' : '18.5ms'}</strong>
              </span>
              <span className="flex items-center gap-1">
                {isFa ? 'سرعت فریم واقعی:' : 'Real FPS:'}{' '}
                <strong className="text-cyan-400">{isCasting ? actualFps : 0} FPS</strong>
              </span>
              <span className="flex items-center gap-1">
                {isFa ? 'ترافیک آپلود:' : 'Upload Data:'}{' '}
                <strong className="text-pink-400">{isCasting ? bandwidthUsed.toFixed(1) : '0.0'} Mbps</strong>
              </span>
            </div>
          </div>

          <div className="mt-4 bg-gray-900/20 p-4 border border-gray-850 rounded-xl flex items-center justify-between text-xs text-gray-300">
            <div>
              <span className="text-gray-500 block uppercase text-[10px] tracking-wider mb-0.5">{isFa ? 'نشست فعال' : 'Active Session ID'}</span>
              <span className="font-mono text-sm text-violet-300 font-bold">{sessionId}</span>
            </div>
            <div>
              <span className="text-gray-500 block uppercase text-[10px] tracking-wider mb-0.5">{isFa ? 'پروتکل شبکه' : 'Network Engine'}</span>
              <span className="font-mono text-sm text-emerald-400">WebSocket Over SSL</span>
            </div>
            <div>
              <span className="text-gray-500 block uppercase text-[10px] tracking-wider mb-0.5">{isFa ? 'مجوز رمزگذاری' : 'Video Codec'}</span>
              <span className="font-mono text-sm text-pink-400">Diff-JPEG 2K</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
