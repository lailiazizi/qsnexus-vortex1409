import React, { useState } from 'react';
import { ComponentType, RebarConfig } from '../types';

interface TechnicalDiagramProps {
  type: ComponentType;
  dimensions: { x: number; y: number; z: number };
  rebarConfig?: RebarConfig;
  className?: string;
}

export const TechnicalDiagram: React.FC<TechnicalDiagramProps> = ({
  type,
  dimensions,
  rebarConfig,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const barDia = rebarConfig?.diameterMm || 16;
  const linkSpacing = rebarConfig?.spacingMm || 225;
  const cover = rebarConfig?.coverMm || 40;

  // Render vector technical cross section
  const renderDiagramSvg = (isModal: boolean = false) => {
    const width = isModal ? 520 : 260;
    const height = isModal ? 340 : 170;

    switch (type) {
      case 'stump':
      case 'column': {
        // Column stump elevation / section
        const mainBarCount = 4;
        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
            <defs>
              <pattern id={`concrete-pattern-${isModal ? 'm' : 's'}`} width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="1" fill="#94a3b8" />
                <circle cx="14" cy="12" r="1" fill="#94a3b8" />
                <path d="M 10,2 L 12,6 L 8,6 Z" fill="#cbd5e1" />
                <path d="M 2,14 L 6,15 L 4,18 Z" fill="#cbd5e1" />
              </pattern>
            </defs>

            {/* Background */}
            <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="8" />

            {/* Title watermark */}
            <text x="14" y="22" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace" letterSpacing="1">
              SECTION ELEVATION: {type === 'stump' ? 'COLUMN STUMP' : 'SUPERSTRUCTURE COL'}
            </text>

            {/* Concrete Body */}
            <rect
              x={width * 0.32}
              y={35}
              width={width * 0.36}
              height={height - 65}
              fill={`url(#concrete-pattern-${isModal ? 'm' : 's'})`}
              stroke="#60a5fa"
              strokeWidth="2"
            />

            {/* Rebar Main Bars (vertical lines with hooks) */}
            {/* Left Bar */}
            <path
              d={`M ${width * 0.37} 45 L ${width * 0.37} ${height - 35} L ${width * 0.34} ${height - 35}`}
              stroke="#38bdf8"
              strokeWidth={isModal ? "4" : "3"}
              fill="none"
              strokeLinecap="round"
            />
            {/* Right Bar */}
            <path
              d={`M ${width * 0.63} 45 L ${width * 0.63} ${height - 35} L ${width * 0.66} ${height - 35}`}
              stroke="#38bdf8"
              strokeWidth={isModal ? "4" : "3"}
              fill="none"
              strokeLinecap="round"
            />

            {/* Links / Stirrups (horizontal ties) */}
            {[0.25, 0.45, 0.65, 0.82].map((ratio, i) => {
              const yPos = 35 + (height - 75) * ratio;
              return (
                <g key={i}>
                  <line
                    x1={width * 0.36}
                    y1={yPos}
                    x2={width * 0.64}
                    y2={yPos}
                    stroke="#f59e0b"
                    strokeWidth={isModal ? "2.5" : "2"}
                    strokeDasharray={isModal ? "none" : "none"}
                  />
                  <circle cx={width * 0.37} cy={yPos} r={isModal ? 3 : 2} fill="#ef4444" />
                  <circle cx={width * 0.63} cy={yPos} r={isModal ? 3 : 2} fill="#ef4444" />
                </g>
              );
            })}

            {/* Dimensions Dimension lines */}
            {/* Width X */}
            <line x1={width * 0.32} y1={height - 16} x2={width * 0.68} y2={height - 16} stroke="#94a3b8" strokeWidth="1" />
            <line x1={width * 0.32} y1={height - 22} x2={width * 0.32} y2={height - 10} stroke="#94a3b8" strokeWidth="1" />
            <line x1={width * 0.68} y1={height - 22} x2={width * 0.68} y2={height - 10} stroke="#94a3b8" strokeWidth="1" />
            <text x={width * 0.5} y={height - 8} fill="#e2e8f0" fontSize={isModal ? "11" : "8"} fontFamily="monospace" textAnchor="middle">
              {dimensions.x} mm
            </text>

            {/* Height Z */}
            <line x1={width * 0.22} y1={35} x2={width * 0.22} y2={height - 30} stroke="#94a3b8" strokeWidth="1" />
            <line x1={width * 0.18} y1={35} x2={width * 0.26} y2={35} stroke="#94a3b8" strokeWidth="1" />
            <line x1={width * 0.18} y1={height - 30} x2={width * 0.26} y2={height - 30} stroke="#94a3b8" strokeWidth="1" />
            <text
              x={width * 0.16}
              y={(35 + height - 30) / 2}
              fill="#e2e8f0"
              fontSize={isModal ? "11" : "8"}
              fontFamily="monospace"
              textAnchor="middle"
              transform={`rotate(-90 ${width * 0.16} ${(35 + height - 30) / 2})`}
            >
              {dimensions.z} mm
            </text>

            {/* Rebar labels */}
            <g transform={`translate(${width * 0.72}, 50)`}>
              <text x="0" y="0" fill="#38bdf8" fontSize={isModal ? "10" : "7.5"} fontWeight="bold" fontFamily="monospace">
                • {mainBarCount}T{barDia} MAIN BARS
              </text>
              <text x="0" y={isModal ? "16" : "12"} fill="#f59e0b" fontSize={isModal ? "9.5" : "7"} fontWeight="bold" fontFamily="monospace">
                • R8@{linkSpacing} LINKS
              </text>
              <text x="0" y={isModal ? "32" : "24"} fill="#94a3b8" fontSize={isModal ? "9" : "6.5"} fontFamily="monospace">
                • {cover}mm COVER
              </text>
            </g>
          </svg>
        );
      }

      case 'pad-footing': {
        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
            <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="8" />
            <text x="14" y="22" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace" letterSpacing="1">
              SECTION ELEVATION: ISOLATED PAD FOOTING
            </text>

            {/* Blinding layer */}
            <rect x={width * 0.15} y={height - 40} width={width * 0.7} height={10} fill="#334155" stroke="#64748b" strokeWidth="1" />
            <text x={width * 0.5} y={height - 32} fill="#94a3b8" fontSize="7" fontFamily="monospace" textAnchor="middle">
              50mm LEAN CONCRETE BLINDING (G10)
            </text>

            {/* Footing Concrete Pad */}
            <rect x={width * 0.18} y={height - 95} width={width * 0.64} height={55} fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />

            {/* Starter Bar Stub */}
            <rect x={width * 0.44} y={35} width={width * 0.12} height={height - 95} fill="#0f172a" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Bottom Rebar Mat with Bends */}
            <path
              d={`M ${width * 0.22} ${height - 75} L ${width * 0.22} ${height - 52} L ${width * 0.78} ${height - 52} L ${width * 0.78} ${height - 75}`}
              stroke="#38bdf8"
              strokeWidth={isModal ? "3.5" : "2.5"}
              fill="none"
              strokeLinecap="round"
            />

            {/* Cross mesh dots */}
            {[0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.74].map((r, i) => (
              <circle key={i} cx={width * r} cy={height - 52} r={isModal ? 3 : 2} fill="#f59e0b" />
            ))}

            {/* Starter rebar hooks */}
            <path
              d={`M ${width * 0.47} 35 L ${width * 0.47} ${height - 48} L ${width * 0.38} ${height - 48}`}
              stroke="#ef4444"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${width * 0.53} 35 L ${width * 0.53} ${height - 48} L ${width * 0.62} ${height - 48}`}
              stroke="#ef4444"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />

            {/* Dimension Footer */}
            <text x={width * 0.5} y={height - 10} fill="#e2e8f0" fontSize="9" fontFamily="monospace" textAnchor="middle">
              L = {dimensions.x} mm  ×  W = {dimensions.y} mm  ×  T = {dimensions.z} mm
            </text>
          </svg>
        );
      }

      case 'ground-beam':
      case 'floor-beam': {
        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
            <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="8" />
            <text x="14" y="22" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace" letterSpacing="1">
              CROSS SECTION: {type === 'ground-beam' ? 'GROUND BEAM (RC)' : 'SUSPENDED BEAM'}
            </text>

            {/* Beam outline */}
            <rect x={width * 0.32} y={35} width={width * 0.36} height={height - 65} fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />

            {/* Stirrup closed link */}
            <rect
              x={width * 0.37}
              y={45}
              width={width * 0.26}
              height={height - 85}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={isModal ? "3" : "2"}
              rx="4"
            />

            {/* 2 Top Bars */}
            <circle cx={width * 0.40} cy={52} r={isModal ? 4 : 3} fill="#38bdf8" />
            <circle cx={width * 0.60} cy={52} r={isModal ? 4 : 3} fill="#38bdf8" />

            {/* 3 Bottom Tension Bars */}
            <circle cx={width * 0.40} cy={height - 50} r={isModal ? 4 : 3} fill="#38bdf8" />
            <circle cx={width * 0.50} cy={height - 50} r={isModal ? 4 : 3} fill="#38bdf8" />
            <circle cx={width * 0.60} cy={height - 50} r={isModal ? 4 : 3} fill="#38bdf8" />

            {/* Labels */}
            <g transform={`translate(${width * 0.72}, 48)`}>
              <text x="0" y="0" fill="#38bdf8" fontSize={isModal ? "10" : "7.5"} fontWeight="bold" fontFamily="monospace">
                TOP: 2T12 HANGERS
              </text>
              <text x="0" y={isModal ? "18" : "13"} fill="#38bdf8" fontSize={isModal ? "10" : "7.5"} fontWeight="bold" fontFamily="monospace">
                BTM: 3T{barDia} MAIN
              </text>
              <text x="0" y={isModal ? "36" : "26"} fill="#f59e0b" fontSize={isModal ? "9.5" : "7"} fontWeight="bold" fontFamily="monospace">
                LINKS: R8@{linkSpacing}
              </text>
            </g>

            {/* Dimension b & h */}
            <text x={width * 0.5} y={height - 12} fill="#e2e8f0" fontSize="9" fontFamily="monospace" textAnchor="middle">
              {dimensions.y} × {dimensions.z} mm (Span {dimensions.x} mm)
            </text>
          </svg>
        );
      }

      case 'ground-slab':
      case 'slab':
      default: {
        return (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
            <rect x="0" y="0" width={width} height={height} fill="#0f172a" rx="8" />
            <text x="14" y="22" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace" letterSpacing="1">
              SECTION ELEVATION: RC SLAB &amp; FABRIC MESH
            </text>

            {/* Slab cross section */}
            <rect x={width * 0.15} y={45} width={width * 0.7} height={50} fill="#1e293b" stroke="#3b82f6" strokeWidth="2" />

            {/* Top mesh line */}
            <line x1={width * 0.18} y1={58} x2={width * 0.82} y2={58} stroke="#38bdf8" strokeWidth="2" />
            {/* Bottom mesh line */}
            <line x1={width * 0.18} y1={82} x2={width * 0.82} y2={82} stroke="#f59e0b" strokeWidth="2" />

            {/* Mesh dots */}
            {[0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.78].map((r, i) => (
              <g key={i}>
                <circle cx={width * r} cy={58} r="2.5" fill="#38bdf8" />
                <circle cx={width * r} cy={82} r="2.5" fill="#f59e0b" />
              </g>
            ))}

            <text x={width * 0.5} y={height - 20} fill="#e2e8f0" fontSize="9" fontFamily="monospace" textAnchor="middle">
              THICKNESS = {dimensions.z} mm | BRC A-FABRIC MESH
            </text>
          </svg>
        );
      }
    }
  };

  return (
    <div className={`rounded-2xl p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/30 text-white shadow-lg space-y-3 ${className}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 text-sm">📐</span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">Diagram Preview</span>
            <span className="text-[8px] text-slate-400 font-mono">TECHNICAL DETAIL SECTION</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="text-[9px] font-black uppercase text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/30 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
          title="Expand technical engineering diagram"
        >
          <span>🔍</span> Full Detail
        </button>
      </div>

      {/* Inline vector diagram */}
      <div className="rounded-xl overflow-hidden border border-slate-700/80 shadow-inner bg-slate-950">
        {renderDiagramSvg(false)}
      </div>

      <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono pt-1">
        <span>SMM2 Standard Cross-Section</span>
        <span className="text-amber-400 font-bold">Live Synced</span>
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">Structural Detail Drawing</span>
                <h4 className="text-lg font-black text-white capitalize">{type.replace('-', ' ')} Technical Cross-Section</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="text-slate-400 hover:text-white text-xl font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-2">
              {renderDiagramSvg(true)}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center bg-slate-800/60 p-3 rounded-2xl border border-slate-700/50">
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-bold">Dimensions</span>
                <span className="text-xs font-mono font-bold text-slate-200">{dimensions.x}×{dimensions.y}×{dimensions.z}mm</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-bold">Main Reinforcement</span>
                <span className="text-xs font-mono font-bold text-sky-400">T{barDia} Bars</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase block font-bold">Stirrups / Links</span>
                <span className="text-xs font-mono font-bold text-amber-400">R8 @ {linkSpacing}mm</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider transition-colors"
            >
              Close View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
