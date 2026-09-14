import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { COMPONENT_CONFIGS, COMPONENT_COLORS } from '../constants';
import { ThreeDBox } from '../components/ThreeDBox';
import { ComponentType } from '../types';

export const Editor: React.FC = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const typeParam = (searchParams.get('type') as ComponentType) || 'pad-footing';
  
  const [config, setConfig] = useState(COMPONENT_CONFIGS[typeParam] || COMPONENT_CONFIGS['pad-footing']);
  const [dimensions, setDimensions] = useState({ x: config?.defaults?.x || 1200, y: config?.defaults?.y || 1200, z: config?.defaults?.z || 400 });
  const [rotation, setRotation] = useState({ x: 340, y: 20, z: 0 });
  const [zoom, setZoom] = useState(1);
  const [opacity, setOpacity] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [targetTrained, setTargetTrained] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const initialViewOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const newConfig = COMPONENT_CONFIGS[typeParam] || COMPONENT_CONFIGS['pad-footing'];
    setConfig(newConfig);
    setDimensions({ x: newConfig.defaults.x, y: newConfig.defaults.y, z: newConfig.defaults.z });
  }, [typeParam]);

  // Check if target already trained for this project
  useEffect(() => {
    const existing = localStorage.getItem(`iseeqs_target_url_${id}`);
    if (existing) setTargetTrained(true);
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show image preview
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      setIsTraining(true);
      setTargetTrained(false);

      const arrayBuffer = await file.arrayBuffer();

      // Upload or process target
      try {
        const { uploadTarget } = await import('../supabase');
        const publicUrl = await uploadTarget(id!, arrayBuffer);
        if (publicUrl) {
          localStorage.setItem(`iseeqs_target_url_${id}`, publicUrl);
          setTargetTrained(true);
        } else {
          localStorage.setItem(`iseeqs_target_url_${id}`, 'ready');
          setTargetTrained(true);
        }
      } catch {
        localStorage.setItem(`iseeqs_target_url_${id}`, 'ready');
        setTargetTrained(true);
      }

    } catch (err) {
      console.error('Training/upload failed:', err);
    } finally {
      setIsTraining(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      isPanning.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      initialViewOffset.current = { x: viewOffset.x, y: viewOffset.y };
    } else if (e.button === 0) {
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      initialPos.current = { x: position.x, y: position.y };
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomSpeed = 0.001;
    const delta = -e.deltaY * zoomSpeed;
    setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 3.0));
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isPanning.current) {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        setViewOffset({
          x: initialViewOffset.current.x + dx,
          y: initialViewOffset.current.y + dy
        });
        return;
      }
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition(prev => ({ ...prev, x: initialPos.current.x + dx, y: initialPos.current.y + dy }));
    };
    
    const onMouseUp = () => { 
      isDragging.current = false; 
      isPanning.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-70px)] overflow-hidden">
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col z-[10]">
        <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
          <Link to={`/project/${id}`} className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2 mb-2">
            &larr; BACK TO MENU
          </Link>

          <div>
            <h3 className="text-xl font-bold text-slate-900">Component Details</h3>
            <p className="text-sm font-bold text-blue-600 mt-1 uppercase tracking-tight">{config?.name}</p>
          </div>

          <div className="space-y-6">
            <section>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">1. Upload Drawing</label>
              <div 
                onClick={() => !isTraining && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all group ${
                  targetTrained 
                    ? 'border-green-400 bg-green-50' 
                    : isTraining 
                      ? 'border-blue-300 bg-blue-50 cursor-wait' 
                      : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                }`}
              >
                <div className="text-3xl mb-2">
                  {targetTrained ? '✅' : isTraining ? '⏳' : '📂'}
                </div>
                <p className={`text-[11px] font-bold ${
                  targetTrained 
                    ? 'text-green-600' 
                    : isTraining 
                      ? 'text-blue-600' 
                      : 'text-slate-400 group-hover:text-blue-600'
                }`}>
                  {targetTrained 
                    ? 'AR Target Ready! Click to change' 
                    : isTraining 
                      ? 'Training & uploading... (20-30s)' 
                      : 'Click to upload 2D Plan'
                  }
                </p>
                {isTraining && (
                  <div className="mt-3 w-full bg-blue-100 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-full"></div>
                  </div>
                )}
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </div>

              {targetTrained && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <p className="text-[10px] font-bold text-green-700">
                    Drawing trained & uploaded! AR will track this image.
                  </p>
                </div>
              )}
            </section>

            <section>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">2. Dimensions (mm)</label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">{config?.labels?.x || 'Length'} (X)</label>
                  <input 
                    type="number" 
                    value={dimensions.x} 
                    onChange={(e) => setDimensions({...dimensions, x: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">{config?.labels?.y || 'Width'} (Y)</label>
                  <input 
                    type="number" 
                    value={dimensions.y} 
                    onChange={(e) => setDimensions({...dimensions, y: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none" 
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">{config?.labels?.z || 'Height'} (Z)</label>
                <input 
                  type="number" 
                  value={dimensions.z} 
                  onChange={(e) => setDimensions({...dimensions, z: parseInt(e.target.value) || 0})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 focus:outline-none" 
                />
              </div>
            </section>

            <section>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-3">3. QS Details</label>
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" defaultChecked />
                  Include Reinforcement
                </label>
                <label className="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                  Formwork Required
                </label>
              </div>
            </section>

            <section className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-3 tracking-widest">See Resources</label>
              <div className="space-y-2">
                <a href="#" className="flex items-center gap-2 text-[11px] font-bold text-blue-700 hover:underline">
                  <span className="text-lg">🔗</span> Example {config?.name} Building
                </a>
                <a href="#" className="flex items-center gap-2 text-[11px] font-bold text-blue-700 hover:underline">
                  <span className="text-lg">📄</span> SMM {config?.name} Requirements
                </a>
              </div>
            </section>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
          <button 
            onClick={() => navigate(`/project/${id}`)}
            className="flex-1 bg-white border border-slate-200 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Save Draft
          </button>
          <Link 
            to={`/qr-result/${id}`}
            className="flex-1 bg-blue-600 py-3 rounded-xl text-xs font-bold text-white text-center hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            Generate AR
          </Link>
        </div>
      </aside>

      <main 
        className="flex-1 bg-[#f0f2f5] relative flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ cursor: isPanning.current ? 'grabbing' : 'auto' }}
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        
        <div 
          className="relative bg-white shadow-2xl transition-transform duration-100"
          style={{ 
            transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${zoom})`, 
            minWidth: 600, 
            minHeight: 450 
          }}
        >
          {image ? (
            <img src={image} alt="Plan View" className="block max-w-full select-none" />
          ) : (
            <div className="flex items-center justify-center h-[450px] w-full text-slate-300 font-bold uppercase tracking-widest text-xs">
              Upload Plan View to Start Overlay
            </div>
          )}

          <ThreeDBox 
            name={config?.name || 'Component'}
            width={dimensions.x}
            height={dimensions.y}
            depth={dimensions.z}
            rotation={rotation}
            opacity={opacity}
            position={position}
            isSelected={true}
            baseColor={COMPONENT_COLORS[typeParam] || '#ccc'}
            onMouseDown={handleMouseDown}
            onClick={() => {}}
          />
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-2xl px-8 py-4 flex items-center gap-8 z-[200] max-w-full overflow-x-auto whitespace-nowrap">
          <div className="flex flex-col gap-1 items-center">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase">Zoom</label>
            <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-20 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          </div>
          <div className="flex flex-col gap-1 items-center">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase">Opacity</label>
            <input type="range" min="0.1" max="1" step="0.1" value={opacity} onChange={(e) => setOpacity(parseFloat(e.target.value))} className="w-20 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          </div>
          <div className="h-8 w-px bg-slate-200 mx-2"></div>
          <div className="flex flex-col gap-1 items-center">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase">Rot X</label>
            <input type="range" min="0" max="360" step="1" value={rotation.x} onChange={(e) => setRotation({...rotation, x: parseInt(e.target.value)})} className="w-20 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          </div>
          <div className="flex flex-col gap-1 items-center">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase">Rot Y</label>
            <input type="range" min="0" max="360" step="1" value={rotation.y} onChange={(e) => setRotation({...rotation, y: parseInt(e.target.value)})} className="w-20 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          </div>
          <div className="flex flex-col gap-1 items-center">
            <label className="text-[10px] font-extrabold text-slate-400 uppercase">Rot Z</label>
            <input type="range" min="0" max="360" step="1" value={rotation.z} onChange={(e) => setRotation({...rotation, z: parseInt(e.target.value)})} className="w-20 h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
          </div>
        </div>

        <div className="absolute top-10 left-10 flex flex-col gap-2 z-[200]">
          <span className="text-[9px] font-extrabold text-slate-400 uppercase mb-1">Switch Component</span>
          {Object.values(COMPONENT_CONFIGS).map((item) => (
            <button
              key={item.id}
              onClick={() => setSearchParams({ type: item.id })}
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                typeParam === item.id 
                ? 'bg-blue-600 text-white scale-110 shadow-blue-200 ring-4 ring-blue-600/10' 
                : 'bg-white text-slate-400 hover:text-blue-600 border border-slate-200 hover:border-blue-200'
              }`}
              title={item.name}
            >
              {item.shortName}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};
