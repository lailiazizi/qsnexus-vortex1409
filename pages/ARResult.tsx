import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LZString from 'lz-string';

export const ARResult: React.FC = () => {
  const { id } = useParams();
  const [copied, setCopied] = useState(false);

  const getArUrl = () => {
    // Strip trailing slashes and hash
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
  
  // High quality QR Code API
  const qrBaseUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=L&data=${encodeURIComponent(arUrl)}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(arUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 text-center animate-in zoom-in duration-500">
      <Link to={`/workspace/${id}`} className="inline-block text-sm text-slate-400 hover:text-blue-600 transition-colors mb-8">
        &larr; Return to Workspace
      </Link>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-2xl shadow-slate-200">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 border border-emerald-100 shadow-sm">
          ✓
        </div>

        <h2 className="text-3xl font-black text-slate-900 mb-2">Ready to Scan AR to Zappar!</h2>
        <p className="text-slate-500 mb-8 text-sm">
          Scan the QR code with your mobile device to open the Zappar AR structural model in real space.
        </p>

        {/* QR Code container */}
        <div className="inline-block p-6 bg-white rounded-3xl border-4 border-slate-100 mb-8 shadow-inner group">
          <div className="relative">
            <img
              src={qrBaseUrl}
              alt="Scan for Zappar AR"
              className="w-56 h-56 block rounded-xl mx-auto"
            />
            <div className="absolute inset-0 border-2 border-blue-500/20 rounded-xl pointer-events-none group-hover:border-blue-500 transition-colors"></div>
          </div>
          <p className="text-[11px] font-black uppercase text-slate-500 tracking-wider mt-4">
            📷 Scan with Mobile Camera
          </p>
        </div>

        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6 leading-relaxed font-medium">
          Point your smartphone camera at this code. Once scanned, allow camera permissions to launch the
          <strong className="text-blue-600"> Zappar AR 3D BIM Overlay</strong>.
        </p>

        {/* Direct link & Copy Button */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-8 border border-slate-200/80 max-w-md mx-auto text-left">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AR Deep Link URL</span>
            <button
              onClick={copyToClipboard}
              className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-slate-200 hover:bg-blue-600 hover:text-white transition-colors"
            >
              {copied ? '✅ Copied!' : '📋 Copy Link'}
            </button>
          </div>
          <p className="text-[10px] text-slate-600 break-all font-mono select-all leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
            {arUrl}
          </p>
        </div>

        {/* Student Drawing Image Tracker Guide */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 mb-8 max-w-md mx-auto text-left shadow-sm">
          <div className="flex items-center gap-2 mb-2 text-blue-900 font-black text-xs uppercase tracking-wider">
            <span>🎯</span>
            <span>Student Drawing Image Tracker Mode</span>
          </div>
          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            Students can use their <strong>physical paper sketch or CAD drawing</strong> on their desk as the live image tracker:
          </p>
          <ol className="text-xs text-slate-700 space-y-1.5 list-decimal list-inside font-medium">
            <li>Open the AR camera on mobile.</li>
            <li>Point camera at the physical paper drawing on desk.</li>
            <li>Tap <strong className="text-blue-700">"📸 Snap &amp; Anchor"</strong> in the viewfinder.</li>
            <li>The 3D model &amp; steel rebar cage locks directly onto the student's drawing!</li>
          </ol>
        </div>

        <div className="border-t border-slate-100 pt-8 flex flex-col items-center">
          <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 w-full max-w-md mb-6 text-left">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-lg shadow-blue-200 shrink-0">
              AR
            </div>
            <div className="min-w-0 flex-1">
              <h5 className="font-bold text-slate-900 text-sm truncate">3D Quantity Surveying Model</h5>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                ID: {id?.slice(0, 10)}...
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full justify-center">
            <Link
              to={`/ar/${id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-2xl transition-all text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
            >
              <span>🚀</span> Test AR Now
            </Link>
            <button onClick={() => window.print()} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-5 py-3 rounded-2xl transition-all text-xs uppercase tracking-widest shadow-sm">
              🖨️ Print Poster
            </button>
            <Link to={`/workspace/${id}`} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-3 rounded-2xl transition-all text-xs uppercase tracking-widest shadow-sm">
              Back to Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
