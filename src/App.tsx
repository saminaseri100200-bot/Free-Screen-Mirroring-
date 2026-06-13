import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Smartphone, Wifi, Bluetooth, QrCode, Activity, Languages, Sparkles, RefreshCw, Layers, ShieldCheck, Cpu } from 'lucide-react';
import { ConnectionStatus, AppSettings, PerformanceStats, CastLog } from './types';
import ConnectionGuide from './components/ConnectionGuide';
import PerformanceMonitor from './components/PerformanceMonitor';
import SenderPane from './components/SenderPane';
import ReceiverPane from './components/ReceiverPane';

export default function App() {
  // Localization: 'fa' for Persian/Dari, 'en' for English
  const [lang, setLang] = useState<'fa' | 'en'>('fa');
  const isFa = lang === 'fa';

  // State values
  const [sessionId, setSessionId] = useState<string>('');
  const [role, setRole] = useState<'receiver' | 'sender' | 'dual'>('receiver');
  const [connectionType, setConnectionType] = useState<'wifi' | 'bluetooth' | 'airplay'>('wifi');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [activeSettings, setActiveSettings] = useState<AppSettings>({
    fps: 120,
    resolution: '720p',
    connectionType: 'wifi',
    quality: 'High',
  });

  // Streaming State
  const [incomingFrame, setIncomingFrame] = useState<string | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    fps: 0,
    latency: 0,
    bandwidth: 0,
    droppedFrames: 0,
    totalFrames: 0,
    packetLoss: 0,
    status: 'Ready',
  });

  const [logs, setLogs] = useState<CastLog[]>([]);

  // Web socket ref
  const wsRef = useRef<WebSocket | null>(null);
  const localEventPipe = useRef<boolean>(false);
  const lastPingTime = useRef<number>(0);
  const fpsCounter = useRef<number>(0);
  const lastFpsCalculateTime = useRef<number>(0);
  const totalBwReceived = useRef<number>(0);

  // Generate dynamic unique session ID
  useEffect(() => {
    // Read from search query parameters (e.g. ?session=1234&role=sender)
    const params = new URLSearchParams(window.location.search);
    const sessionParam = params.get('session');
    const roleParam = params.get('role');

    const generatedId = sessionParam || Math.floor(1000 + Math.random() * 9000).toString();
    setSessionId(generatedId);

    if (roleParam === 'sender') {
      setRole('sender');
    } else if (roleParam === 'receiver') {
      setRole('receiver');
    }
  }, []);

  // System Logging helper
  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', source: 'Local' | 'Remote' | 'System' = 'System') => {
    const timeStr = new Date().toLocaleTimeString(undefined, { hour12: false });
    const logId = Math.random().toString(36).substring(7);
    
    setLogs((prev) => [
      { id: logId, timestamp: timeStr, type, message, source },
      ...prev.slice(0, 48), // limit logs
    ]);
  };

  // Setup WebSocket connection
  useEffect(() => {
    if (!sessionId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socketUrl = `${protocol}//${window.location.host}`;

    addLog(isFa ? `در حال ایجاد لوله ارتباطی با سرور صوتی-تصویری...` : `Opening websocket pipe on server...`, 'info', 'System');
    
    const socket = new WebSocket(socketUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      addLog(isFa ? `کانال وب‌سوکت با موفقیت باز شد.` : `Websocket channel opened successfully.`, 'success', 'System');
      setConnectionStatus('connecting');

      // Register client role
      const registrationType = role === 'sender' ? 'register-sender' : 'register-receiver';
      socket.send(JSON.stringify({
        type: registrationType,
        sessionId,
        settings: activeSettings,
      }));

      // Launch latency ping heart-beat loop
      startPingLoop();
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type } = payload;

        if (type === 'sender-connected') {
          setConnectionStatus('connected');
          addLog(isFa ? `دستگاه آیفون فرستنده با موفقیت جفت شد.` : `iPhone Sender successfully paired.`, 'success', 'Remote');
          if (payload.settings) {
            setActiveSettings(payload.settings);
          }
        } 
        
        else if (type === 'receiver-connected') {
          setConnectionStatus('connected');
          addLog(isFa ? `مانیتور کامپیوتر گیرنده جفت شد.` : `Computer Monitor receiver linked.`, 'success', 'Remote');
        } 
        
        else if (type === 'waiting-for-sender') {
          setConnectionStatus('waiting');
          addLog(isFa ? `در انتظار اتصال دستگاه فرستنده آیفون...` : `Awaiting iPhone client connection...`, 'info', 'System');
        } 
        
        else if (type === 'waiting-for-receiver') {
          setConnectionStatus('waiting');
          addLog(isFa ? `در انتظار بالا آمدن مانیتور کامپیوتر...` : `Awaiting projection receiver client...`, 'info', 'System');
        } 
        
        else if (type === 'sender-disconnected') {
          setConnectionStatus('waiting');
          setIncomingFrame(null);
          addLog(isFa ? `ارتباط فرستنده قطع شد.` : `Broadcaster stream offline.`, 'warning', 'Remote');
        } 
        
        else if (type === 'receiver-disconnected') {
          setConnectionStatus('waiting');
          addLog(isFa ? `مانیتور گیرنده آفلاین شد.` : `Receiver display offline.`, 'warning', 'Remote');
        } 
        
        else if (type === 'settings-change') {
          if (payload.settings) {
            setActiveSettings(payload.settings);
            addLog(
              isFa 
                ? `تنظیمات کست تغییر یافت: ${payload.settings.resolution} @ ${payload.settings.fps}FPS [${payload.settings.connectionType}]` 
                : `Settings synced: ${payload.settings.resolution} @ ${payload.settings.fps}FPS [${payload.settings.connectionType}]`,
              'info',
              'Remote'
            );
          }
        } 
        
        else if (type === 'frame') {
          if (role !== 'sender') {
            setIncomingFrame(payload.data);
            
            // Calculate bandwith and statistics
            fpsCounter.current++;
            if (payload.info && payload.info.size) {
              totalBwReceived.current += payload.info.size;
            }

            const now = performance.now();
            if (now - lastFpsCalculateTime.current >= 1000) {
              const secondsElapsed = (now - lastFpsCalculateTime.current) / 1000;
              const actualFps = Math.round(fpsCounter.current / secondsElapsed);
              const mbits = (totalBwReceived.current * 8) / (1024 * 1024) / secondsElapsed;

              setPerformanceStats(prev => ({
                ...prev,
                fps: actualFps,
                bandwidth: mbits,
                totalFrames: prev.totalFrames + fpsCounter.current
              }));

              fpsCounter.current = 0;
              totalBwReceived.current = 0;
              lastFpsCalculateTime.current = now;
            }
          }
        }

        else if (type === 'pong') {
          const latencyVal = performance.now() - payload.timestamp;
          setPerformanceStats(prev => ({
            ...prev,
            latency: latencyVal,
          }));
        }

        else if (type === 'pointer-event') {
          addLog(isFa ? `رویداد کلیک بازگشتی: X:${payload.x}% Y:${payload.y}%` : `Back-touch pointer clicked: X:${payload.x}% Y:${payload.y}%`, 'info', 'Remote');
        }

      } catch (err) {
        console.error('Error on ws packet parser:', err);
      }
    };

    socket.onerror = (e) => {
      addLog(isFa ? `اتصال وب‌سوکت خطایی را گزارش کرد. لوله محلی به عنوان جایگزین فعال شد.` : `Socket exception noticed. Local virtual buffer activated.`, 'warning', 'System');
      localEventPipe.current = true;
    };

    socket.onclose = () => {
      addLog(isFa ? `دریافت ارتباط از سرور متوقف شد.` : `Server WS pipe was closed.`, 'info', 'System');
    };

    return () => {
      socket.close();
    };
  }, [sessionId, role]);

  const startPingLoop = () => {
    const ws = wsRef.current;
    if (!ws) return;

    const ping = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          sessionId,
          timestamp: performance.now()
        }));
        setTimeout(ping, 2000);
      }
    };

    ping();
  };

  // Emulation pipeline: let the user trigger instant side-by-side split simulation inside the same tab!
  const triggerSimulation = () => {
    setRole('dual');
    addLog(isFa ? `شبیه‌ساز پیشرفته آینه موازی (Dual Simulation) فعال شد.` : `Dual Casting loop triggered.`, 'success', 'System');
    setConnectionStatus('connected');
    
    // Auto start frames forwarding on local fallback loop if needed
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'register-receiver',
        sessionId,
      }));
    }
  };

  // Relay click pointer back down
  const handleSendPointer = (x: number, y: number) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'pointer-event',
        sessionId,
        x,
        y
      }));
    }
  };

  // Generate complete casting URL
  const castingUrl = `${window.location.origin}${window.location.pathname}?role=sender&session=${sessionId}`;

  return (
    <div className="min-h-screen bg-mesh text-white font-sans flex flex-col justify-between" id="app-root">
      {/* Decorative top blurred lines */}
      <div className="h-1 bg-gradient-to-r from-violet-600 via-pink-600 to-cyan-500"></div>

      {/* Modern Header Navigation bar */}
      <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md sticky top-0 z-40 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-violet-600 to-pink-500 rounded-xl shadow-lg shadow-violet-500/10">
              <RefreshCw className="w-6 h-6 text-white animate-spin-slow" style={{ animationDuration: '8s' }} />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-sans tracking-tight">LetsView-Web Pro</h1>
                <span className="text-[10px] bg-cyan-900/40 text-cyan-400 border border-cyan-800/60 px-1.5 py-0.5 rounded font-mono uppercase font-semibold">
                  120 Hz Max
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-sans mt-0.5">
                {isFa 
                  ? 'برنامه آینه‌سازی و کست بدون سیم صفحه آیفون به کامپیوتر' 
                  : 'High-speed iOS Screen Mirroring over WiFi & Bluetooth Profiles'}
              </p>
            </div>
          </div>

          {/* Quick Stats Toolbar */}
          {connectionStatus === 'connected' && (
            <div className="hidden lg:flex items-center gap-6 bg-gray-900/60 px-4 py-1.5 rounded-xl border border-gray-850 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping"></span>
                <span className="text-gray-400">{isFa ? 'سرعت زنده:' : 'Live Rate:'}</span>
                <strong className="text-white">{performanceStats.fps} FPS</strong>
              </div>
              <div className="w-px h-3 bg-gray-800"></div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{isFa ? 'تأخیر گیرنده:' : 'Receiver Delay:'}</span>
                <strong className="text-orange-400">{performanceStats.latency.toFixed(1)} ms</strong>
              </div>
              <div className="w-px h-3 bg-gray-800"></div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{isFa ? 'پهنای باند:' : 'Throughput:'}</span>
                <strong className="text-pink-400">{performanceStats.bandwidth.toFixed(2)} Mbps</strong>
              </div>
            </div>
          )}

          {/* Nav Controls Toggles */}
          <div className="flex items-center gap-3">
            {/* Split Screen Simulator Toggle */}
            <button
              id="role-switch-dual"
              onClick={triggerSimulation}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-sans font-medium border transition-all ${
                role === 'dual'
                  ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white border-transparent shadow shadow-violet-600/30'
                  : 'bg-gray-900/40 border-gray-800 text-gray-300 hover:text-white hover:bg-gray-850'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isFa ? 'شبیه‌ساز موازی (تست سریع)' : 'Split Display'}</span>
            </button>

            {/* Language Selection */}
            <button
              id="lang-selector"
              onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}
              className="flex items-center gap-1.5 bg-gray-900/40 border border-gray-800 hover:bg-gray-850 hover:text-white text-gray-300 px-3 py-1.5 rounded-xl text-xs transition-all font-sans font-medium"
            >
              <Languages className="w-4 h-4 text-violet-400" />
              <span>{lang === 'fa' ? 'English' : 'Farsi / دری'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 flex-1 w-full grid grid-cols-1 gap-6">
        
        {/* Mode Selector Panel for Desktop experience demonstration */}
        <div className="bg-gradient-to-r from-gray-900/60 to-gray-950/60 p-4 border border-gray-850 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4" id="role-selector">
          <div>
            <h3 className="text-sm font-bold font-sans">
              {isFa ? 'انتخاب نقش و سناریوی اتصال دستگاه' : 'Casting Role Selection'}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {isFa
                ? 'مشخص کنید که این صفحه می‌خواهد به عنوان مانیتور کامپیوتر (گیرنده) عمل کند یا به عنوان گوشی آیفون فرستنده.'
                : 'Select whether this active browser tab acts as the primary host console or the mobile sender.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 bg-gray-950 p-1.5 rounded-xl border border-gray-850 shrink-0 w-full md:w-auto">
            <button
              id="role-receiver"
              onClick={() => { setRole('receiver'); setIncomingFrame(null); }}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-sans transition-all ${
                role === 'receiver'
                  ? 'bg-violet-600 text-white shadow shadow-violet-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4" />
              {isFa ? 'مانیتور کامپیوتر (گیرنده)' : 'Computer Receiver'}
            </button>

            <button
              id="role-sender"
              onClick={() => { setRole('sender'); setIncomingFrame(null); }}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold font-sans transition-all ${
                role === 'sender'
                  ? 'bg-pink-600 text-white shadow shadow-pink-600/30'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              {isFa ? 'کنترلر آیفون (فرستنده)' : 'iPhone Sender'}
            </button>
          </div>
        </div>

        {/* Dynamic Role Render Tree */}
        {role === 'receiver' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left side panel: Guides & stats */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <ConnectionGuide
                sessionId={sessionId}
                joinUrl={castingUrl}
                connectionType={connectionType}
                setConnectionType={setConnectionType}
                lang={lang}
              />
              <PerformanceMonitor stats={performanceStats} logs={logs} lang={lang} />
            </div>

            {/* Right side panel: Cast display screen */}
            <div className="lg:col-span-7 h-full">
              <ReceiverPane
                status={connectionStatus}
                frameSrc={incomingFrame}
                settings={activeSettings}
                lang={lang}
                onSimulateMockCast={triggerSimulation}
                onSendPointerEvent={handleSendPointer}
              />
            </div>
          </div>
        )}

        {role === 'sender' && (
          <div className="max-w-3xl mx-auto w-full">
            <SenderPane
              sessionId={sessionId}
              ws={wsRef.current}
              lang={lang}
            />
          </div>
        )}

        {role === 'dual' && (
          <div className="space-y-6">
            <div className="bg-amber-900/20 border border-amber-800/40 p-4 rounded-xl flex items-center gap-3 text-xs text-amber-300">
              <Sparkles className="w-5 h-5 shrink-0" />
              <p>
                {isFa
                  ? 'حالت موازی فعال است! برای مشاهده بازتاب تصویر لازم است دکمه سبز رنگ "شروع آینه کردن" را در فرستنده سمت چپ بزنید.'
                  : 'Split test activated. Simply click "Start Airplay" on the left broadcaster config to cast the stream live to the right monitor.'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-5 flex flex-col gap-6">
                <SenderPane
                  sessionId={sessionId}
                  ws={wsRef.current}
                  lang={lang}
                  isEmbeddedSimulator={true}
                />
                <PerformanceMonitor stats={performanceStats} logs={logs} lang={lang} />
              </div>

              <div className="lg:col-span-7 flex flex-col gap-6">
                <ReceiverPane
                  status={connectionStatus}
                  frameSrc={incomingFrame}
                  settings={activeSettings}
                  lang={lang}
                  onSimulateMockCast={() => {}}
                  onSendPointerEvent={handleSendPointer}
                />
                
                {/* Embedded QR details for dual tests */}
                <div className="bg-gray-900/40 p-4 rounded-2xl border border-gray-800/80 text-xs flex flex-wrap justify-between items-center gap-4">
                  <div>
                    <span className="text-gray-400 block font-sans mb-1 font-semibold">{isFa ? 'اسکن فرستنده با گوشی واقعی آیفون:' : 'Cast with real iPhone:'}</span>
                    <span className="font-mono text-violet-300 select-all break-all">{castingUrl}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-950 p-2 rounded-lg border border-gray-850 shrink-0">
                    <QrCode className="w-5 h-5 text-violet-400" />
                    <span className="font-mono text-gray-300 font-bold">{sessionId}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Modern Footer section */}
      <footer className="border-t border-gray-900 bg-gray-950/40 py-4 px-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>LetsView Pro Receiver Core v2.5.0-Release</span>
          </div>
          <div>
            {isFa 
              ? 'انتقال فوق سریع صفحات نمایش با شبیه‌ساز فشرده‌سازی متمایز بلوتوث' 
              : 'Super-speed differential vector rendering with dual-channel stream profiling'}
          </div>
          <p className="font-mono text-[10px]">
            &copy; 1352-2026 LetsView Web Integration Hub
          </p>
        </div>
      </footer>
    </div>
  );
}
