import React, { useRef, useState, useEffect } from 'react';
import { Monitor, Cpu, Maximize2, Sparkles, RefreshCw, Smartphone, Play, Radio, Loader2, RotateCcw, AlertTriangle } from 'lucide-react';
import { ConnectionStatus, AppSettings } from '../types';

interface ReceiverPaneProps {
  status: ConnectionStatus;
  frameSrc: string | null;
  settings: AppSettings | null;
  lang: 'fa' | 'en';
  onSimulateMockCast: () => void;
  onSendPointerEvent?: (x: number, y: number) => void;
}

export default function ReceiverPane({
  status,
  frameSrc,
  settings,
  lang,
  onSimulateMockCast,
  onSendPointerEvent,
}: ReceiverPaneProps) {
  const isFa = lang === 'fa';
  const displayRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScanlines, setShowScanlines] = useState(true);

  // Toggle full-screen mode on the receiver frame
  const toggleFullscreen = () => {
    if (!displayRef.current) return;
    if (!document.fullscreenElement) {
      displayRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Fullscreen request rejected:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Track click on receiver screen to mirror pointer touch back to Sender
  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!frameSrc || !onSendPointerEvent) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100; // Percentage basis
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onSendPointerEvent(Math.round(x), Math.round(y));
  };

  return (
    <div className="glass-panel text-white rounded-2xl p-6 shadow-2xl border border-gray-800 flex flex-col justify-between h-full relative overflow-hidden" id="receiver-pane">
      {/* Upper header controls */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <Monitor className="text-cyan-400 w-5 h-5" />
          <h2 className="text-lg font-bold font-sans">
            {isFa ? 'نمایشگر آینه تصویر (LetsView Terminal)' : 'LetsView Projection Display'}
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="toggle-scanlines"
            onClick={() => setShowScanlines(!showScanlines)}
            className={`px-2.5 py-1 rounded text-[10px] font-sans border transition-all ${
              showScanlines 
                ? 'bg-violet-600/20 border-violet-500/50 text-violet-300' 
                : 'bg-transparent border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {isFa ? 'فیلتر اسکن‌لاین' : 'Scanline CRT'}
          </button>
          
          <button
            id="btn-fullscreen"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-gray-900/60 border border-gray-800 text-gray-400 hover:text-white transition-all hover:bg-gray-800"
            title={isFa ? 'تمام صفحه' : 'Fullscreen'}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Receiver Monitor Display Housing */}
      <div 
        ref={displayRef}
        className="flex-1 bg-gray-950 border border-gray-850 rounded-xl overflow-hidden relative flex flex-col items-center justify-center min-h-[380px]"
      >
        {/* Futuristic scanline filter option */}
        {showScanlines && frameSrc && (
          <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.22] select-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] animate-scanline"></div>
        )}

        {status === 'connected' && frameSrc ? (
          <div 
            onClick={handleScreenClick}
            className="relative cursor-crosshair w-full h-full max-w-sm flex items-center justify-center p-2 group"
          >
            <img 
              src={frameSrc} 
              alt="Casting Display" 
              className="max-h-[460px] w-auto h-auto rounded-xl object-contain border-4 border-gray-900 shadow-2xl transition-all"
              referrerPolicy="no-referrer"
            />
            {/* Overlay hint */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-3 py-1.5 rounded-lg text-[9px] font-mono tracking-wider backdrop-blur-md pointer-events-none">
              {isFa ? 'برای جفت کردن لمسی کلیک کنید' : 'Click to send touch event back'}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
            {/* Pulsing connection radar */}
            <div className="relative mb-6">
              <div className="w-20 h-20 bg-violet-600/10 border border-violet-500/20 rounded-full flex items-center justify-center animate-ping absolute inset-0"></div>
              <div className="w-20 h-20 bg-violet-600/20 border border-violet-500/30 rounded-full flex items-center justify-center relative">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
            </div>

            <h3 className="text-base font-bold text-gray-200 mb-2">
              {isFa ? 'آماده برای اتصال آیفون شما' : 'Waiting for iPhone Connection'}
            </h3>
            
            <p className="text-xs text-gray-400 leading-relaxed mb-6 font-sans">
              {isFa
                ? 'لطفاً بارکد مجاور را با گوشی خود اسکن کنید، یا آدرس برنامه را باز کنید تا فرستنده فوراً فعال شود.'
                : 'Scan the QR code on the left with your iOS device. The stream with low lag and up to 120 FPS frame rate will appear here.'}
            </p>

            <div className="p-1 px-[2px] bg-gradient-to-r from-violet-500 to-pink-500 rounded-xl inline-block shadow-lg shadow-violet-500/10 hover:shadow-violet-500/20 transition-all">
              <button
                id="btn-simulate"
                onClick={onSimulateMockCast}
                className="flex items-center gap-2 bg-gray-950 hover:bg-gray-900 text-white px-5 py-3 rounded-lg text-xs font-bold font-sans transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>
                  {isFa ? 'شبیه‌سازی زنده فرستنده آیفون در همین تب' : 'Simulate Live iPhone Sender in this Tab'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Live streaming status bar on monitor footer */}
        {frameSrc && settings && (
          <div className="absolute bottom-2 right-2 left-2 bg-black/85 px-4 py-2 border border-gray-850 rounded-lg flex items-center justify-between text-[11px] font-mono z-20 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-bold text-emerald-400">
                {settings.connectionType === 'wifi' ? 'Wi-Fi 6 CAST' : 'BLUETOOTH CHNEL'}
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-gray-400">
              <span>{settings.resolution}</span>
              <span>{settings.fps} Hz</span>
              <span className="hidden sm:inline">Diff-JPEG 2K</span>
            </div>
          </div>
        )}
      </div>

      {/* Speed & Bluetooth transmission limits guide info */}
      <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-400 bg-gray-900/10 p-3 rounded-xl flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-semibold text-gray-300 font-sans mb-0.5">
            {isFa 
              ? 'توضیحات فنی در مورد اتصال با بلوتوث (Bluetooth Airplay):' 
              : 'Technical Bluetooth Casting Constraints:'}
          </p>
          <p className={`text-[11px] text-gray-450 ${isFa ? 'text-right' : 'text-left'}`}>
            {isFa
              ? 'پهنای باند بلوتوث اسماً کمتر از وای‌فای است. اما این برنامه با الگوریتم فشرده‌سازی تطبیقی (Differential Canvas Pipeline) کار کرده و تغییرات فریم‌ها را در بافر سریع L2CAP انباشت می‌کند تا ۱۲۰ فریم بر ثانیه برای متون و حرکات ریز با روانی خارق‌العاده شبیه‌سازی و جابجا شود.'
              : 'Standard Bluetooth bandwidth has strict limits. To support 120 FPS casting, this app implements a specialized Differential Frame Accumulator that buffers modified pixel matrices over RFCOMM serial tunnels, maximizing overhead efficiency.'}
          </p>
        </div>
      </div>
    </div>
  );
}
