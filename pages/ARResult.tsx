import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LZString from 'lz-string';
import { 
  QrCode, 
  Smartphone, 
  Printer, 
  Maximize2, 
  Download, 
  Check, 
  Copy, 
  Layers, 
  ExternalLink, 
  Box, 
  ArrowLeft,
  Upload,
  Eye
} from 'lucide-react';
import { exportComponentsToGLB } from '../utils/gltfExport';
import { ProjectComponent } from '../types';

export const ARResult: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [isFullscreenTracker, setIsFullscreenTracker] = useState(false);
  const [arPlatform, setArPlatform] = useState<'webar' | 'zapworks'>('webar');
  const [zapworksUrl, setZapworksUrl] = useState(() => {
    return localStorage.getItem(`iseeqs_zapworks_url_${id}`) || '';
  });
  const [isExportingGlb, setIsExportingGlb] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Load drawing uploaded by student in Workspace
  const [drawing, setDrawing] = useState<string | null>(() => {
    return id ? localStorage.getItem(`iseeqs_drawing_${id}`) : null;
  });

  // Load components saved by student
  const components: ProjectComponent[] = (() => {
    if (!id) return [];
    try {
      const raw = localStorage.getItem(`iseeqs_project_${id}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  const getArUrl = () => {
    if (arPlatform === 'zapworks' && zapworksUrl.trim()) {
      return zapworksUrl.trim();
    }
    // Strip trailing slashes and hash for clean base
    const base = window.location.href.split('#')[0].split('?')[0].replace(/\/+$/, '');
    const projectData = localStorage.getItem(`iseeqs_project_${id}`);
    const targetUrl = localStorage.getItem(`iseeqs_target_url_${id}`);

    const encodedProject = projectData
      ? LZString.compressToEncodedURIComponent(projectData)
      : '';

    const encodedTargetUrl = targetUrl
      ? encodeURIComponent(targetUrl)
      : '';

    return `${base}/#/ar/${id}?data=${encodedProject}&targetUrl=${encodedTargetUrl}`;
  };

  const arUrl = getArUrl();
  const qrBaseUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&ecc=L&data=${encodeURIComponent(arUrl)}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(arUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCustomDrawingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      if (res) {
        setDrawing(res);
        try {
          localStorage.setItem(`iseeqs_drawing_${id}`, res);
        } catch (err) {
          console.warn('Storage quota limit for drawing', err);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadGlb = async () => {
    if (components.length === 0) return;
    setIsExportingGlb(true);
    try {
      const blob = await exportComponentsToGLB(components, `Project_${id?.slice(0, 6)}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QS_BIM_Model_${id?.slice(0, 8)}.glb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export GLB', err);
    } finally {
      setIsExportingGlb(false);
    }
  };

  const handleSaveZapworksUrl = (val: string) => {
    setZapworksUrl(val);
    if (id) {
      localStorage.setItem(`iseeqs_zapworks_url_${id}`, val);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-in fade-in duration-300">
      {/* Top Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to={`/workspace/${id}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Workspace</span>
        </Link>
        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
          Project ID: {id?.slice(0, 10)}
        </span>
      </div>

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 md:p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-3">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>AR Image Tracking &amp; Mobile Launchpad</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black mb-2">
            Ready to Scan AR onto Image Tracker!
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Follow the 2-step workflow: Scan the QR code on your mobile phone, then point your camera at the drawing tracker sheet below to anchor the 3D concrete elements and steel rebar cage.
          </p>
        </div>
      </div>

      {/* 2-Column Workflow Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        {/* Left Column: Image Tracker Sheet (Drawing) */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-black text-xs">
                  1
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Image Tracker Target</h3>
                  <p className="text-xs text-slate-500">Student CAD Drawing / Architectural Plan Sheet</p>
                </div>
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {drawing ? '✓ Drawing Loaded' : 'Sample Plan'}
              </span>
            </div>

            {/* Drawing Preview Frame with CAD Corner Brackets */}
            <div className="relative flex-1 min-h-[320px] bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center p-3 border-2 border-slate-200 group">
              {drawing ? (
                <img
                  src={drawing}
                  alt="Student Drawing Plan Tracker"
                  className="max-h-[300px] w-auto object-contain rounded-lg shadow-2xl transition-transform group-hover:scale-[1.02]"
                />
              ) : (
                <div className="text-center p-6 text-slate-400">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-300 text-2xl">
                    📐
                  </div>
                  <p className="text-xs font-bold text-slate-300 mb-1">No Custom Drawing Uploaded Yet</p>
                  <p className="text-[11px] text-slate-400 mb-4 max-w-xs mx-auto">
                    Upload an architectural CAD plan, foundation layout, or sketch to use as the image tracking target.
                  </p>
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-500/30">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Drawing Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCustomDrawingUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Corner Tracking Crosshair Graphic Elements */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

              {drawing && (
                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl text-white text-xs">
                  <span className="font-mono text-[10px] text-cyan-300">Target Resolution: Ready for AR</span>
                  <button
                    onClick={() => setIsFullscreenTracker(true)}
                    className="flex items-center gap-1 font-bold text-cyan-400 hover:text-cyan-300"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Expand</span>
                  </button>
                </div>
              )}
            </div>

            {/* Tracker Action Buttons */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button
                onClick={() => setIsFullscreenTracker(true)}
                disabled={!drawing}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-all active:scale-95 shadow-sm"
                title="Display full screen on laptop so you can scan directly off your screen"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="truncate">Screen Scan</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 border border-slate-200"
                title="Print this sheet on paper to place on student desk"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate">Print Sheet</span>
              </button>

              <label className="cursor-pointer flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 border border-slate-200">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span className="truncate">{drawing ? 'Replace' : 'Upload'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomDrawingUpload}
                  className="hidden"
                />
              </label>
            </div>

            <p className="text-[11px] text-slate-500 mt-3 text-center leading-normal">
              💡 <strong>Tip:</strong> Students can place a printed sheet on their desk or keep this drawing open full screen on a laptop to test scanning immediately!
            </p>
          </div>
        </div>

        {/* Right Column: QR Code & Mobile Launch */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl flex-1 flex flex-col items-center text-center">
            <div className="w-full flex items-center justify-between mb-4 text-left">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black text-xs">
                  2
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Mobile AR QR Code</h3>
                  <p className="text-xs text-slate-500">Instant scan with any smartphone camera</p>
                </div>
              </div>

              {/* Platform Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold">
                <button
                  onClick={() => setArPlatform('webar')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    arPlatform === 'webar'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Instant WebAR
                </button>
                <button
                  onClick={() => setArPlatform('zapworks')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    arPlatform === 'zapworks'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Zapworks URL
                </button>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="p-4 bg-white rounded-3xl border-2 border-slate-100 mb-4 shadow-inner relative group">
              <img
                src={qrBaseUrl}
                alt="AR QR Code"
                className="w-52 h-52 block rounded-2xl mx-auto shadow-sm"
              />
              <div className="absolute inset-4 border-2 border-blue-500/20 rounded-2xl pointer-events-none group-hover:border-blue-500 transition-colors" />
            </div>

            {/* 4-Step Student Scanning Instructions */}
            <div className="w-full bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 mb-4 text-left">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                <span>How to View in Augmented Reality:</span>
              </h4>
              <ol className="text-xs text-slate-600 space-y-1.5 font-medium list-decimal list-inside">
                <li>Open your smartphone camera &amp; scan the QR code above.</li>
                <li>Tap the link to open the WebAR viewer in Safari / Chrome.</li>
                <li>Allow camera permissions when prompted.</li>
                <li>
                  Aim your camera at the <strong>drawing tracker</strong> (on your desk or screen). The 3D BIM model &amp; steel rebar lock onto the drawing!
                </li>
              </ol>
            </div>

            {/* Direct Link & Copy */}
            <div className="w-full bg-slate-100/70 rounded-2xl p-3 border border-slate-200 mb-4 text-left">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Direct AR URL</span>
                <button
                  onClick={copyToClipboard}
                  className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-700 font-mono break-all select-all leading-relaxed bg-white p-2 rounded-lg border border-slate-200">
                {arUrl}
              </p>
            </div>

            {/* Quick Test Links */}
            <div className="w-full flex gap-2">
              <Link
                to={`/ar/${id}`}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>Test AR on this Device</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Zappar / Zapworks Integration Hub */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xl mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Box className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Zappar &amp; Zapworks Platform Integration
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              For Taylor's University / Vortex XR Lab official Zapworks Studio &amp; WebAR pipelines.
            </p>
          </div>

          <button
            onClick={handleDownloadGlb}
            disabled={isExportingGlb || components.length === 0}
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>{isExportingGlb ? 'Generating 3D GLB...' : exportSuccess ? '✓ Model Downloaded!' : 'Export 3D Model (.GLB) for Zapworks'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>How Zapworks Image Tracking Works</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Official Zappar WebAR projects compile image trackers into <code>.zpt</code> files and host experiences at <code>web.zappar.com</code>.
            </p>
            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
              <li><strong>Step 1:</strong> Download the 3D model above (<code>.glb</code> with pad footings, columns &amp; rebar).</li>
              <li><strong>Step 2:</strong> Import the GLB model and drawing sheet into Zapworks Studio or Zapworks Designer.</li>
              <li><strong>Step 3:</strong> Publish to your Zapworks WebAR code!</li>
            </ul>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-600" />
              <span>Connect Lab Zapworks WebAR Link</span>
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed mb-2">
              Have a pre-published Zapworks experience for this exercise? Enter your URL below to update the mobile QR code:
            </p>
            <input
              type="url"
              placeholder="https://web.zappar.com/?code=your-code-here"
              value={zapworksUrl}
              onChange={(e) => handleSaveZapworksUrl(e.target.value)}
              className="w-full text-xs font-mono p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <p className="text-[10px] text-slate-400">
              When entered, the QR code on this page will route directly to your university's Zapworks portal.
            </p>
          </div>
        </div>
      </div>

      {/* Fullscreen Tracker Modal for Screen Scanning */}
      {isFullscreenTracker && drawing && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 animate-in fade-in duration-200 select-none">
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-white z-10">
            <div className="bg-slate-900/90 border border-cyan-400/40 px-4 py-2 rounded-2xl backdrop-blur-md flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
                Laptop Screen AR Tracking Display
              </span>
            </div>

            <button
              onClick={() => setIsFullscreenTracker(false)}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold border border-white/20 transition-all shadow-xl"
            >
              Close Fullscreen (✕)
            </button>
          </div>

          <div className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center p-4">
            <img
              src={drawing}
              alt="Fullscreen AR Tracker"
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-[0_0_50px_rgba(56,189,248,0.3)] border border-cyan-500/40"
            />

            {/* High-visibility Corner Calibrators for Camera AR Acquisition */}
            <div className="absolute top-6 left-6 w-12 h-12 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-6 right-6 w-12 h-12 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg pointer-events-none" />
            <div className="absolute bottom-6 left-6 w-12 h-12 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg pointer-events-none" />
            <div className="absolute bottom-6 right-6 w-12 h-12 border-b-4 border-r-4 border-cyan-400 rounded-br-lg pointer-events-none" />
          </div>

          <div className="absolute bottom-6 bg-slate-900/90 border border-white/20 text-slate-200 px-6 py-3 rounded-2xl text-xs font-medium backdrop-blur-md shadow-2xl text-center">
            Point your mobile phone camera directly at this drawing on your screen to track in AR!
          </div>
        </div>
      )}
    </div>
  );
};
