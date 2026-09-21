import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';

const DEFAULT_ZAPPAR_URL = 'https://r7jen.zappar.io/7763698978076374850/';

export const ARResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);

  // Zappar custom URL if set, otherwise default Zappar project URL
  const [zapparUrl] = useState(() => {
    return localStorage.getItem(`iseeqs_zapworks_url_${id}`) || DEFAULT_ZAPPAR_URL;
  });

  // Destination URL: Directly to Zappar AR Site
  const getZapparUrl = () => {
    const trimmed = zapparUrl.trim();
    if (!trimmed) return DEFAULT_ZAPPAR_URL;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://web.zappar.com/?code=${encodeURIComponent(trimmed)}`;
  };

  const activeUrl = getZapparUrl();
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=480x480&ecc=H&data=${encodeURIComponent(activeUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(activeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in duration-300">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to={`/workspace/${id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Workspace</span>
        </Link>
        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">
          ID: {id?.slice(0, 10)}
        </span>
      </div>

      {/* Main Single Centered QR Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center">
        {/* Header Badge & Title */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider mb-4">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>Zappar WebAR Experience</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
          Scan QR Code to Launch Zappar AR
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-6">
          Scan with any smartphone camera to open the Zappar AR experience directly and view your 3D structural model live in your physical environment.
        </p>

        {/* Crisp QR Code Container */}
        <div className="relative inline-block p-4 sm:p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-inner mb-6 group">
          <img
            src={qrCodeImageUrl}
            alt="Zappar AR QR Code"
            className="w-64 h-64 sm:w-72 sm:h-72 block rounded-2xl mx-auto shadow-sm"
          />
          <div className="absolute inset-4 sm:inset-5 border-2 border-blue-500/20 rounded-2xl pointer-events-none group-hover:border-blue-500 transition-colors" />
        </div>

        {/* Quick Link Controls (Copy & Open Zappar in Browser) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-6">
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Direct Link'}</span>
          </button>

          <a
            href={activeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <span>Launch Zappar AR Directly</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Simple 3-Step Student Instructions */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-md mx-auto text-left">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
            <span>📱</span> Student Quick Instructions:
          </p>
          <ol className="space-y-2 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Open the native <strong>Camera app</strong> on your mobile phone or tablet.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Point your camera at this QR code and tap the notification link to launch Zappar WebAR.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Allow camera access in your browser and point at your physical image marker to view your 3D structural model in <strong>Augmented Reality</strong>!</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
