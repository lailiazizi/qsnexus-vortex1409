import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  ArrowLeft,
  QrCode,
  ExternalLink,
  Copy,
  Check,
  Smartphone,
  Camera,
  Sparkles
} from 'lucide-react';
import LZString from 'lz-string';
import { ProjectComponent } from '../types';
import { getDrawingFromDb, getProjectFromDb } from '../utils/drawingDatabase';

const DEFAULT_ZAPPAR_URL = 'https://r7jen.zappar.io/7763698978076374850/';

export const ARResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [arTargetMode, setArTargetMode] = useState<'arpov' | 'zappar'>('arpov');

  // Load components saved by student
  const [components, setComponents] = useState<ProjectComponent[]>(() => {
    if (!id) return [];
    try {
      const raw = localStorage.getItem(`iseeqs_project_${id}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Load drawing uploaded by student in Workspace
  const [drawing, setDrawing] = useState<string | null>(() => {
    return id ? localStorage.getItem(`iseeqs_drawing_${id}`) : null;
  });

  // Zappar custom URL if set
  const [zapparUrl] = useState(() => {
    return localStorage.getItem(`iseeqs_zapworks_url_${id}`) || DEFAULT_ZAPPAR_URL;
  });

  // Asynchronously retrieve from IndexedDB for durability
  useEffect(() => {
    if (!id) return;
    getDrawingFromDb(id).then((savedDrawing) => {
      if (savedDrawing) {
        setDrawing(savedDrawing);
      }
    });

    getProjectFromDb(id).then((savedProject) => {
      if (savedProject && savedProject.components && savedProject.components.length > 0) {
        setComponents((prev) => (prev.length === 0 ? savedProject.components : prev));
      }
    });
  }, [id]);

  // Generate Direct AR POV URL (WebAR camera mode) or Zappar URL
  const getDestinationUrl = () => {
    if (arTargetMode === 'zappar') {
      const trimmed = zapparUrl.trim();
      if (!trimmed) return 'https://web.zappar.com';
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
      return `https://web.zappar.com/?code=${encodeURIComponent(trimmed)}`;
    }

    // Default: Mobile AR POV Route
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    let url = `${origin}${pathname}#/ar/${id || 'project'}`;

    if (components && components.length > 0) {
      try {
        const minifiedData = components.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          dimensions: c.dimensions,
          position: c.position,
          rotation: c.rotation,
          includeReinforcement: c.includeReinforcement,
          showMeasurements: c.showMeasurements,
          status: c.status,
        }));
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(minifiedData));
        if (compressed && compressed.length < 800) {
          url += `?data=${compressed}`;
        }
      } catch (e) {
        console.warn('Could not compress components for QR:', e);
      }
    }
    return url;
  };

  const activeUrl = getDestinationUrl();
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
          <Camera className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
          <span>AR Point-of-View (POV)</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
          Scan QR Code to Launch AR POV
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-6">
          Scan with any smartphone camera to open the Augmented Reality Point-of-View (AR POV) and interact with your 3D structural model live in your physical environment.
        </p>

        {/* AR Mode Selector Pills */}
        <div className="inline-flex bg-slate-100 p-1 rounded-2xl border border-slate-200 mb-6">
          <button
            onClick={() => setArTargetMode('arpov')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              arTargetMode === 'arpov'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>AR POV Camera (Instant)</span>
          </button>
          <button
            onClick={() => setArTargetMode('zappar')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              arTargetMode === 'zappar'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Zappar WebAR</span>
          </button>
        </div>

        {/* Crisp QR Code Container */}
        <div className="relative inline-block p-4 sm:p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-inner mb-6 group">
          <img
            src={qrCodeImageUrl}
            alt="AR POV QR Code"
            className="w-64 h-64 sm:w-72 sm:h-72 block rounded-2xl mx-auto shadow-sm"
          />
          <div className="absolute inset-4 sm:inset-5 border-2 border-blue-500/20 rounded-2xl pointer-events-none group-hover:border-blue-500 transition-colors" />
        </div>

        {/* Quick Link Controls (Copy & Open in Browser) */}
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
            <span>Open AR POV Directly</span>
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
              <span>Point your camera at this QR code and tap the notification link.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Allow camera access to view the 3D model, rebar, and live SMM takeoff directly in <strong>AR POV</strong>!</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
