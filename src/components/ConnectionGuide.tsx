import React from 'react';
import { Wifi, Bluetooth, QrCode, Smartphone, Info, RefreshCw, Layers, Tv, HelpCircle, AlertCircle } from 'lucide-react';

interface ConnectionGuideProps {
  sessionId: string;
  joinUrl: string;
  connectionType: 'wifi' | 'bluetooth' | 'airplay';
  setConnectionType: (type: 'wifi' | 'bluetooth' | 'airplay') => void;
  lang: 'fa' | 'en';
}

export default function ConnectionGuide({
  sessionId,
  joinUrl,
  connectionType,
  setConnectionType,
  lang,
}: ConnectionGuideProps) {
  const isFa = lang === 'fa';

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&color=ffffff&bgcolor=111827`;

  return (
    <div className="glass-panel rounded-2xl p-6 text-white h-full flex flex-col justify-between shadow-2xl relative overflow-hidden" id="connection-guide">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-sans flex items-center gap-2">
            <Smartphone className="text-violet-400 w-5 h-5" />
            {isFa ? 'اتصال آیفون به کامپیوتر' : 'Connect iPhone to Computer'}
          </h2>
          <span className="text-xs text-gray-400 bg-gray-800/80 px-2 py-1 rounded font-mono">
            LetsView Pro v2.5
          </span>
        </div>

        {/* Channel Selection Tab */}
        <div className="grid grid-cols-3 gap-1 bg-gray-900/80 p-1 rounded-xl mb-6 border border-gray-800">
          <button
            id="tab-wifi"
            onClick={() => setConnectionType('wifi')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
              connectionType === 'wifi'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Wifi className="w-3.5 h-3.5" />
            <span>{isFa ? 'وای‌فای (Web)' : 'Wi-Fi'}</span>
          </button>
          
          <button
            id="tab-bluetooth"
            onClick={() => setConnectionType('bluetooth')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
              connectionType === 'bluetooth'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Bluetooth className="w-3.5 h-3.5" />
            <span>{isFa ? 'بلوتوث' : 'Bluetooth'}</span>
          </button>

          <button
            id="tab-airplay"
            onClick={() => setConnectionType('airplay')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-2.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
              connectionType === 'airplay'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/20 border border-pink-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{isFa ? 'اسکرین میرور' : 'Screen Mirror'}</span>
          </button>
        </div>

        {/* Dynamic Display based on connection type */}
        {connectionType !== 'airplay' ? (
          <div>
            {/* QR Code and Pin Section */}
            <div className="flex flex-col md:flex-row items-center gap-6 bg-gray-900/40 p-4 rounded-xl border border-gray-800/50 mb-6 font-sans">
              <div className="relative group p-2 bg-gray-950 rounded-lg border border-gray-800">
                <img
                  src={qrImageUrl}
                  alt="Scan QR to Cast"
                  className="w-32 h-32 rounded-md opacity-90 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 border border-violet-500/0 group-hover:border-violet-500/30 rounded-lg pointer-events-none transition-all"></div>
              </div>

              <div className="flex-1 text-center md:text-right">
                <p className="text-xs text-gray-400 mb-1 font-sans">
                  {isFa ? 'اسکن بارکد با دوربین آیفون:' : 'Scan barcode with iPhone camera:'}
                </p>
                <p className="text-xs font-mono text-violet-300 break-all mb-3 select-all bg-gray-950/60 p-2 rounded border border-gray-850">
                  {joinUrl}
                </p>

                <div className="inline-block bg-gray-950/80 px-4 py-2.5 rounded-lg border border-gray-850">
                  <span className="block text-[10px] text-gray-400 font-sans uppercase tracking-wider">
                    {isFa ? 'کد پین اختصاصی' : 'Dedicated Connection PIN'}
                  </span>
                  <span className="text-2xl font-mono font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-pink-400">
                    {sessionId}
                  </span>
                </div>
              </div>
            </div>

            {/* Instructions list */}
            <div className="space-y-4 font-sans">
              <h3 className="text-sm font-semibold text-gray-300">
                {isFa ? 'مراحل اتصال آسان کست پیشرفته:' : 'High-Performance Web Cast Steps:'}
              </h3>

              {connectionType === 'wifi' ? (
                <div className="space-y-3 text-xs md:text-sm text-gray-300">
                  <div className="flex gap-3 items-start">
                    <span className="flex items-center justify-center w-5 h-5 bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-full text-[10px] font-bold mt-0.5 shrink-0">۱</span>
                    <p>
                      {isFa 
                        ? 'گوشی آیفون و کامپیوتر خود را به یک مودم یا هات‌اسپات (شبکه Wi-Fi مشترک) متصل کنید.'
                        : 'Connect your iPhone and computer to the same Wi-Fi network or hotspot.'}
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex items-center justify-center w-5 h-5 bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-full text-[10px] font-bold mt-0.5 shrink-0">۲</span>
                    <p>
                      {isFa
                        ? 'بارکد بالا را با دوربین آیفون اسکن کنید تا پنل فرستنده پیشرفته در مرورگر آیفون باز شود.'
                        : 'Scan the QR code above with your iPhone to open the client broadcaster pages.'}
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex items-center justify-center w-5 h-5 bg-violet-600/30 text-violet-300 border border-violet-500/30 rounded-full text-[10px] font-bold mt-0.5 shrink-0">۳</span>
                    <p>
                      {isFa
                        ? 'روی دکمه "به اشتراک‌گذاری اسکرین آیفون" در گوشی کلیک کنید تا تمام صفحه با کیفیت و روانی خارق‌العاده ۱۲۰ هرتزی فوراً به کامپیوتر کست شود.'
                        : 'Tap "iOS Screen Share" or Start Airplay on your phone to feed the screen smoothly up to 120 FPS.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs md:text-sm text-gray-300">
                  <div className="flex gap-3 items-start">
                    <span className="flex items-center justify-center w-5 h-5 bg-pink-600/30 text-pink-300 border border-pink-500/30 rounded-full text-[10px] font-bold mt-0.5 shrink-0">۱</span>
                    <p>
                      {isFa
                        ? 'بلوتوث کامپیوتر و آیفون را روشن کرده و دو دستگاه را باهم جفت (Pair) کنید.'
                        : 'Enable Bluetooth on both computer and iPhone, then pair them in device lists.'}
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex items-center justify-center w-5 h-5 bg-pink-600/30 text-pink-300 border border-pink-500/30 rounded-full text-[10px] font-bold mt-0.5 shrink-0">۲</span>
                    <p>
                      {isFa
                        ? 'اسکنر بالا را باز کنید تا فشرده‌ساز محلی L2CAP فعال شود.'
                        : 'Establish active Bluetooth serial channels via local device bridges.'}
                    </p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="flex items-center justify-center w-5 h-5 bg-pink-600/30 text-pink-300 border border-pink-500/30 rounded-full text-[10px] font-bold mt-0.5 shrink-0">۳</span>
                    <p>
                      {isFa
                        ? 'بافر داده پیشرفته تنها تفاوت پیکسل‌ها را رد و بدل می‌کند تا محدودیت پهنای باند بلوتوث رفع شود و تصویر روان بماند!'
                        : 'Differential frame buffers optimize bandwidth dynamically to overcome traditional Bluetooth constraints.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* NEW AIRPLAY SCREEN MIRRORING TAB */
          <div className="space-y-5 animate-fade-in font-sans">
            <div className="bg-gradient-to-r from-pink-900/40 to-violet-900/30 p-4 rounded-xl border border-pink-500/20">
              <div className="flex gap-2.5 items-center mb-2">
                <Tv className="w-5 h-5 text-pink-400" />
                <h3 className="text-sm font-bold text-pink-300">
                  {isFa ? 'راهنمای گام‌به‌گام اتصال با Screen Mirroring سیستم‌عامل iOS' : 'Native iOS Screen Mirroring (AirPlay) Setup'}
                </h3>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                {isFa
                  ? 'برنامه LetsView به شما اجازه می‌دهد تا علاوه بر آینه‌سازی تحت وب ۱۲۰ هرتزی ما، آیفون خود را مستقیماً از طریق دکمه Screen Mirroring کنترل‌سنتر به کامپیوتر متصل کنید!'
                  : 'LetsView offers natively compatible setups to display iOS screens using the AirPlay standard protocol directly from Control Center.'}
              </p>
            </div>

            <div className="space-y-3.5 text-xs md:text-sm text-gray-300">
              <div className="flex gap-3 items-start bg-gray-900/30 p-2.5 rounded border border-gray-850">
                <span className="flex items-center justify-center w-5 h-5 bg-pink-600/30 text-pink-300 border border-pink-500/30 rounded-full text-[10px] font-bold shrink-0">۱</span>
                <div>
                  <p className="font-bold text-white mb-0.5">{isFa ? 'یکسان‌سازی اتصال شبکه:' : 'Same Network Connection:'}</p>
                  <p className="text-gray-400 text-xs text-right leading-relaxed">
                    {isFa
                      ? 'هم آیفون و هم کامپیوتر باید دقیقاً به یک وای‌فای (Wi-Fi) یا هات‌اسپات متصل باشند تا سرویس Bonjour دستگاه ما را پیدا کند.'
                      : 'Ensure both iPhone and receiving device are on the exact same local Wi-Fi router / access point.'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-gray-900/30 p-2.5 rounded border border-gray-850">
                <span className="flex items-center justify-center w-5 h-5 bg-pink-600/30 text-pink-300 border border-pink-500/30 rounded-full text-[10px] font-bold shrink-0">۲</span>
                <div>
                  <p className="font-bold text-white mb-0.5">{isFa ? 'باز کردن کنترل‌سنتر آیفون:' : 'Open iOS Control Center:'}</p>
                  <p className="text-gray-400 text-xs text-right leading-relaxed">
                    {isFa
                      ? 'انگشت خود را از گوشه بالا سمت راست صفحه آیفون به پایین بکشید (سپس روی آیکون دو مستطیل متداخل یعنی Screen Mirroring ضربه بزنید).'
                      : 'Swipe down from the top-right of your iPhone screen and tap the Screen Mirroring icon (two overlapping rectangles).'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-gray-900/30 p-2.5 rounded border border-gray-850">
                <span className="flex items-center justify-center w-5 h-5 bg-pink-600/30 text-pink-300 border border-pink-500/30 rounded-full text-[10px] font-bold shrink-0">۳</span>
                <div>
                  <p className="font-bold text-white mb-0.5">{isFa ? 'انتخاب دستگاه گیرنده LetsView:' : 'Select LetsView Hub:'}</p>
                  <p className="text-gray-400 text-xs text-right leading-relaxed">
                    {isFa
                      ? `نام گیرنده شما با شناسه دستگاه "${sessionId}" در لیست ظاهر خواهد شد. روی آن ضربه بزنید تا آینه‌سازی آغاز شود!`
                      : `Your receiver identity under session "${sessionId}" appears in the list. Tap to start projecting.`}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start bg-gray-900/30 p-2.5 rounded border border-gray-850">
                <span className="flex items-center justify-center w-5 h-5 bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold shrink-0">۴</span>
                <div>
                  <p className="font-bold text-white mb-0.5">{isFa ? 'روش جایگزین آسان (بدون تنظیمات شبکه):' : 'Easy Alternative (No Complex Settings):'}</p>
                  <p className="text-gray-400 text-xs text-right leading-relaxed">
                    {isFa
                      ? 'اگر به دلیل محدودیت فایروال یا آی‌پی مودم، نام دستگاه در Screen Mirroring کنترل‌سنتر نشان داده نشد، با زدن لبه Wi-Fi و اسکن بارکد در ۳ ثانیه تصویر را مستقیم به مانیتور وصل کنید!'
                      : 'If firewall blocks mDNS discovery, toggle the Wi-Fi tab on the left and scan the QR block with Safari. It links instantly in 3 seconds.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800 flex gap-3 items-start text-xs text-gray-400 bg-gray-900/20 p-3 rounded-lg font-sans">
        <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-right">
          {isFa
            ? ' LetsView کاملاً تحت وب و با آخرین استانداردهای کست (HTML5 WebRTC & WebSockets) طراحی شده تا به هیچ نصبی از App Store نیاز نداشته باشید!'
            : 'No App Store installation required! LetsView Web utilizes high-speed WebSocket and canvas streaming with multi-threading to render fluid frame streams.'}
        </p>
      </div>
    </div>
  );
}
