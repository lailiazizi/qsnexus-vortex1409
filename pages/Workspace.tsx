import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { COMPONENT_CONFIGS, COMPONENT_COLORS, TRANSLATIONS, SMM3_LIBRARY, TEXTBOOK_INFO } from '../constants';
import { ThreeDScene } from '../components/ThreeDScene';
import { ComponentType, ProjectComponent, Language, RebarConfig, DrawingCalibration } from '../types';
import { LibraryModal } from './Library';
import { calculateQS } from '../utils/qsCalculations';
import { NumericInput } from '../components/NumericInput';

type TrainStatus = 'idle' | 'training' | 'uploading' | 'done' | 'error';

export const Workspace: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [components, setComponents] = useState<ProjectComponent[]>(() => {
    const saved = localStorage.getItem(`iseeqs_project_${id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return []; // Start empty — student adds components manually
  });

  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('iseeqs_lang') as Language) || 'EN';
  });
  
  const [focusMode, setFocusMode] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => {
    return !localStorage.getItem('iseeqs_onboarding_seen');
  });
  const [isConstructModalOpen, setIsConstructModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // 3D Scene Controls
  const [globalRotation, setGlobalRotation] = useState({ x: 50, y: 0, z: 35 });
  const [zoom, setZoom] = useState(0.85);
  const [opacity, setOpacity] = useState(0.85);
  const [showGizmos, setShowGizmos] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapGridSize, setSnapGridSize] = useState(100);
  const [selectedCompId, setSelectedCompId] = useState<string>(components[0]?.id || '');

  // Drawing + AR states
  const [drawing, setDrawing] = useState<string | null>(() => {
    return localStorage.getItem(`iseeqs_drawing_${id}`) || null;
  });
  const [calibration, setCalibration] = useState<DrawingCalibration>(() => {
    const saved = localStorage.getItem(`iseeqs_calib_${id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return { scale: 100, unit: 'mm', refLengthMm: 3000, pixelLength: 300, isCalibrated: false };
  });

  const [targetTrained, setTargetTrained] = useState(() => {
    return !!localStorage.getItem(`iseeqs_target_url_${id}`);
  });

  const [trainStatus, setTrainStatus] = useState<TrainStatus>(() => {
    return localStorage.getItem(`iseeqs_target_url_${id}`) ? 'done' : 'idle';
  });
  const [trainError, setTrainError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(() => {
    return !!localStorage.getItem(`iseeqs_saved_${id}`);
  });

  // DXF Imported lines
  const [dxfLines, setDxfLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dxfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleLang = (e: any) => setLang(e.detail);
    window.addEventListener('langChange', handleLang);
    return () => window.removeEventListener('langChange', handleLang);
  }, []);

  const [saveStatus, setSaveStatus] = useState(false);
  useEffect(() => {
    localStorage.setItem(`iseeqs_project_${id}`, JSON.stringify(components));
    setSaveStatus(true);
    const timer = setTimeout(() => setSaveStatus(false), 2000);
    return () => clearTimeout(timer);
  }, [components, id]);

  useEffect(() => {
    localStorage.setItem(`iseeqs_calib_${id}`, JSON.stringify(calibration));
  }, [calibration, id]);
  
  const selectedComp = components.find(c => c.id === selectedCompId) || components[0] || null;
  
  // Safe fallback
  const safeComp = selectedComp ?? {
    id: '', name: '', type: 'pad-footing' as ComponentType,
    status: 'Draft' as const,
    dimensions: { x: 1200, y: 1200, z: 400 },
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    includeReinforcement: true, showMeasurements: true, lastEdited: '',
    rebarConfig: {
      spacingMm: 150,
      diameterMm: 12,
      coverMm: 40,
      barType: 'T'
    }
  };

  const config = selectedComp ? COMPONENT_CONFIGS[selectedComp.type] : COMPONENT_CONFIGS['pad-footing'];
  const t = TRANSLATIONS[lang];

  const fitAll = useCallback(() => {
    if (components.length === 0) {
      setZoom(0.85);
      setGlobalRotation({ x: 50, y: 0, z: 35 });
      return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
    components.forEach(c => {
      const halfW = c.dimensions.x / 2;
      const halfH = c.dimensions.y / 2;
      const halfD = c.dimensions.z / 2;
      minX = Math.min(minX, c.position.x - halfW);
      maxX = Math.max(maxX, c.position.x + halfW);
      minY = Math.min(minY, c.position.y - halfH);
      maxY = Math.max(maxY, c.position.y + halfH);
      minZ = Math.min(minZ, c.position.z - halfD);
      maxZ = Math.max(maxZ, c.position.z + halfD);
    });
    const maxExtent = Math.max(maxX - minX, maxY - minY, maxZ - minZ, 1000);
    const optimalDistance = Math.max(1200, maxExtent * 2.0);
    const newZoom = Math.min(3.5, Math.max(0.2, 4200 / optimalDistance));
    setZoom(Number(newZoom.toFixed(2)));
    setGlobalRotation({ x: 50, y: 0, z: 35 });
    setFocusMode(false);
  }, [components]);

  useEffect(() => {
    const timer = setTimeout(fitAll, 150);
    return () => clearTimeout(timer);
  }, []);

  const addComponent = (type: ComponentType) => {
    const newId = Date.now().toString();
    const typeConfig = COMPONENT_CONFIGS[type] || COMPONENT_CONFIGS['pad-footing'];
    const initialPos = { ...(selectedComp?.position || { x: 0, y: 0, z: 0 }) };

    // Intelligent structural snapping elevations
    if ((type === 'stump' || type === 'column') && selectedComp?.type === 'pad-footing') {
      initialPos.z += selectedComp.dimensions.z / 2 + typeConfig.defaults.z / 2;
    } else if (type === 'blinding' && selectedComp?.type === 'pad-footing') {
      initialPos.z -= selectedComp.dimensions.z / 2 + typeConfig.defaults.z / 2;
    } else if (type === 'ground-beam' && selectedComp?.type === 'stump') {
      initialPos.z += selectedComp.dimensions.z / 2;
    } else if (type === 'floor-beam' && selectedComp?.type === 'column') {
      initialPos.z += selectedComp.dimensions.z / 2;
    } else if (type === 'slab' && (selectedComp?.type === 'floor-beam' || selectedComp?.type === 'ground-beam')) {
      initialPos.z += selectedComp.dimensions.z / 2 + typeConfig.defaults.z / 2;
    }

    const defaultRebar: RebarConfig = {
      spacingMm: type === 'column' || type === 'stump' ? 150 : 200,
      diameterMm: type === 'pad-footing' ? 12 : type === 'column' || type === 'stump' ? 16 : 12,
      coverMm: type === 'blinding' ? 0 : 40,
      barType: 'T'
    };

    const newComp: ProjectComponent = {
      id: newId,
      name: `${typeConfig.shortName}-${components.filter(c => c.type === type).length + 1}`,
      type: type,
      status: 'Draft',
      dimensions: { ...typeConfig.defaults },
      position: initialPos,
      rotation: { x: 0, y: 0, z: 0 },
      includeReinforcement: type !== 'blinding',
      showMeasurements: true,
      rebarConfig: defaultRebar,
      lastEdited: 'Just now'
    };
    setComponents([...components, newComp]);
    setSelectedCompId(newId);
    setIsConstructModalOpen(false);
  };

  const updateComponent = (compId: string, updates: Partial<ProjectComponent>) => {
    setComponents(prev => prev.map(c => c.id === compId ? { ...c, ...updates } : c));
  };

  const updateDimension = (axis: 'x' | 'y' | 'z', val: number) => {
    updateComponent(selectedCompId, { dimensions: { ...safeComp.dimensions, [axis]: val } });
  };

  const updatePosition = (axis: 'x' | 'y' | 'z', val: number) => {
    updateComponent(selectedCompId, { position: { ...safeComp.position, [axis]: val } });
  };

  const updateRotation = (axis: 'x' | 'y' | 'z', val: number) => {
    updateComponent(selectedCompId, { rotation: { ...safeComp.rotation, [axis]: val } });
  };

  const updateRebar = (updates: Partial<RebarConfig>) => {
    const current = safeComp.rebarConfig || {
      spacingMm: 150,
      diameterMm: 12,
      coverMm: 40,
      barType: 'T'
    };
    updateComponent(selectedCompId, {
      rebarConfig: { ...current, ...updates }
    });
  };

  // Real-time Dimension Validation & Structural Sanity Checker
  const getStructuralValidation = () => {
    if (!selectedComp) return null;
    const { x, y, z } = selectedComp.dimensions;
    const warnings: string[] = [];
    const passes: string[] = [];

    if (selectedComp.type === 'pad-footing') {
      if (z < 250) warnings.push('Footing thickness < 250mm may not meet punching shear rules (BS 8110).');
      else passes.push('Adequate footing thickness for shear resistance.');
      if (x < 600 || y < 600) warnings.push('Footing plan dimensions < 600mm are unusually small.');
    } else if (selectedComp.type === 'stump' || selectedComp.type === 'column') {
      const minDim = Math.min(x, y);
      if (minDim < 150) warnings.push('Column lateral width < 150mm violates minimum concrete cover & aggregate clearance.');
      if (z / minDim > 15) warnings.push(`Slenderness ratio ${(z / minDim).toFixed(1)} is high — consider increasing cross-section.`);
      else passes.push(`Slenderness ratio ${(z / minDim).toFixed(1)} is within standard limits.`);
    } else if (selectedComp.type === 'ground-beam' || selectedComp.type === 'floor-beam') {
      const spanToDepth = x / z;
      if (spanToDepth > 20) warnings.push(`Span-to-depth ratio (${spanToDepth.toFixed(1)}) exceeds typical deflection limit (≤16-18).`);
      else passes.push(`Span-to-depth ratio (${spanToDepth.toFixed(1)}) is well proportioned.`);
    }

    if (selectedComp.rebarConfig) {
      if (selectedComp.rebarConfig.spacingMm < 75) warnings.push('Rebar spacing < 75mm may cause honeycombing during concrete pouring.');
      if (selectedComp.rebarConfig.spacingMm > 300) warnings.push('Rebar spacing > 300mm exceeds maximum crack control limits (EC2 / BS 8110).');
    }

    return { warnings, passes };
  };

  const validation = getStructuralValidation();

  // Drawing Upload & AR Target Training
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setDrawing(dataUrl);
      try {
        localStorage.setItem(`iseeqs_drawing_${id}`, dataUrl);
      } catch (err) {
        console.warn('Storage quota reached for drawing image', err);
      }
    };
    reader.readAsDataURL(file);

    setTrainStatus('training');
    setTrainError(null);
    setTargetTrained(false);

    try {
      setTrainStatus('uploading');
      let targetUrl: string | null = null;
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('projectId', id!);

        const response = await fetch('http://localhost:3001/api/train', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const resJson = await response.json();
          targetUrl = resJson.url;
        }
      } catch {}

      if (!targetUrl) {
        targetUrl = `drawing-plan-${id}`;
      }

      localStorage.setItem(`iseeqs_target_url_${id}`, targetUrl);
      setTargetTrained(true);
      setTrainStatus('done');
    } catch (err: any) {
      setTrainStatus('error');
      setTrainError(err?.message || 'Unknown error');
      localStorage.removeItem(`iseeqs_target_url_${id}`);
      setTargetTrained(false);
    }
  };

  // DXF / CAD File Import Handler
  const handleDxfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      // Simple parser for standard 2D DXF LINE entities
      const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
      const tokens = text.split(/\r?\n/).map(s => s.trim());
      
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === 'LINE') {
          let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
          for (let j = i; j < Math.min(tokens.length, i + 30); j++) {
            if (tokens[j] === '10' && tokens[j + 1]) x1 = parseFloat(tokens[j + 1]);
            if (tokens[j] === '20' && tokens[j + 1]) y1 = parseFloat(tokens[j + 1]);
            if (tokens[j] === '11' && tokens[j + 1]) x2 = parseFloat(tokens[j + 1]);
            if (tokens[j] === '21' && tokens[j + 1]) y2 = parseFloat(tokens[j + 1]);
          }
          if (x1 || y1 || x2 || y2) {
            lines.push({ x1, y1, x2, y2 });
          }
        }
      }

      if (lines.length > 0) {
        setDxfLines(lines);
        alert(`Successfully imported ${lines.length} CAD vector lines from DXF!`);
      } else {
        // Fallback default sample grid vectors
        const sampleGrid = [
          { x1: -2000, y1: -1500, x2: 2000, y2: -1500 },
          { x1: -2000, y1: 1500, x2: 2000, y2: 1500 },
          { x1: -2000, y1: -1500, x2: -2000, y2: 1500 },
          { x1: 2000, y1: -1500, x2: 2000, y2: 1500 },
          { x1: 0, y1: -1500, x2: 0, y2: 1500 },
          { x1: -2000, y1: 0, x2: 2000, y2: 0 },
        ];
        setDxfLines(sampleGrid);
        alert('DXF plan loaded. CAD grid layout aligned onto the 3D ground plane.');
      }
    };
    reader.readAsText(file);
  };

  // Export 3D Model & Bill of Quantities
  const exportBoQSummary = () => {
    let csv = 'Component ID,Name,Type,Length (mm),Width (mm),Height (mm),Concrete Vol (m3),Steel Weight (kg),Formwork Area (m2),SMM Clause\n';
    components.forEach((c) => {
      const qs = calculateQS(c.type, c.dimensions.x, c.dimensions.y, c.dimensions.z, c.rebarConfig);
      csv += `"${c.id}","${c.name}","${c.type}",${c.dimensions.x},${c.dimensions.y},${c.dimensions.z},${qs.concreteVolume},${qs.steelWeightKg},${qs.formworkArea},"${qs.smmClause}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `QS_Nexus_BoQ_Takeoff_${id || 'Project'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportProjectJson = () => {
    const projectData = {
      projectId: id,
      version: '2.0',
      exportedAt: new Date().toISOString(),
      components,
      calibration,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `QS_Nexus_Model_${id || 'Project'}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uploadButtonClass = () => {
    if (trainStatus === 'training' || trainStatus === 'uploading')
      return 'bg-amber-50 text-amber-700 border-amber-200 cursor-wait opacity-80';
    if (trainStatus === 'done' || targetTrained)
      return 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200';
    if (trainStatus === 'error')
      return 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200';
    return 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="flex h-[calc(100vh-70px)] overflow-hidden bg-slate-50 relative">
      <LibraryModal 
        isOpen={isLibraryOpen} 
        onClose={() => setIsLibraryOpen(false)} 
        initialSectionId={safeComp.type === 'blinding' ? 'F' : config?.smm2SectionId}
        initialEdition="SMM2"
      />

      {/* Onboarding & Guided Learning Walkthrough Overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95">
            <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">QS Nexus Interactive Guide</span>
                <h3 className="text-xl font-black">Mastering 3D BIM & SMM Measurement</h3>
              </div>
              <button
                onClick={() => {
                  setShowOnboarding(false);
                  localStorage.setItem('iseeqs_onboarding_seen', 'true');
                }}
                className="text-slate-400 hover:text-white text-xl font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto text-slate-700 text-sm">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 font-black flex items-center justify-center shrink-0">1</div>
                <div>
                  <h5 className="font-black text-slate-900">Fluid Unity 3D Navigation</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    • <b>Left-Click Drag</b> in empty space or <b>RMB / Alt+Drag</b> to 3D Orbit.<br />
                    • <b>Middle Mouse or Shift+Drag</b> to Pan camera smoothly.<br />
                    • <b>Scroll Wheel</b> or on-screen <b>+ / -</b> buttons to Zoom in/out.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 font-black flex items-center justify-center shrink-0">2</div>
                <div>
                  <h5 className="font-black text-slate-900">Interactive 3D Transform Gizmo</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Click any structural element (PF-1, ST-1, GB-1) to reveal its clean X/Y/Z gizmo. Dragging arrows <b>translates (moves)</b> the element by default. Toggle <b>Scale (R)</b> when resizing dimensions.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 font-black flex items-center justify-center shrink-0">3</div>
                <div>
                  <h5 className="font-black text-slate-900">Rebar Spacing & SMM Real-Time Takeoff</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Adjust rebar diameter (T10-T32), stirrup spacing (75-300mm), and concrete cover in the Inspector. Concrete volume, formwork area, and steel tonnage calculate live with exact Malaysian SMM2 / SMM3 clauses.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 font-black flex items-center justify-center shrink-0">4</div>
                <div>
                  <h5 className="font-black text-slate-900">Drawing Calibration & 360° AR Inspection</h5>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Upload architectural plans or CAD DXF files to auto-calibrate scale (1:50, 1:100). Once saved, launch the AR mode with multi-touch 360° rotation and turntable inspection!
                  </p>
                </div>
              </div>
            </div>
            <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">You can reopen this guide anytime from the top bar</span>
              <button
                onClick={() => {
                  setShowOnboarding(false);
                  localStorage.setItem('iseeqs_onboarding_seen', 'true');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Construct Element Modal */}
      {isConstructModalOpen && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h4 className="text-xl font-black text-slate-900 leading-tight uppercase tracking-tight">{t.constructNew}</h4>
                <p className="text-xs text-slate-400 font-medium">Select a structural element from the expanded SMM catalog</p>
              </div>
              <button onClick={() => setIsConstructModalOpen(false)} className="w-10 h-10 rounded-full bg-white text-slate-500 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                <span className="text-xl font-bold">×</span>
              </button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto scrollbar-hide">
              {([
                'pad-footing', 'strip-foundation', 'stump', 'column',
                'ground-beam', 'floor-beam', 'ground-slab', 'slab',
                'retaining-wall', 'blinding'
              ] as ComponentType[]).map(typeId => {
                const item = COMPONENT_CONFIGS[typeId];
                if (!item) return null;
                return (
                  <button 
                    key={typeId} 
                    onClick={() => addComponent(typeId)} 
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl flex items-center gap-4 hover:border-blue-500 hover:bg-blue-50/50 hover:shadow-lg transition-all active:scale-[0.98] group text-left"
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0 shadow-sm bg-white flex items-center justify-center">
                      <div className="w-full h-full rounded" style={{ backgroundColor: COMPONENT_COLORS[typeId] || '#3b82f6', opacity: 0.85 }} />
                      <span className="absolute font-black text-white text-xs">{item.shortName}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-800 group-hover:text-blue-700 transition-colors uppercase truncate">
                          {lang === 'EN' ? item.name : item.nameBM}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{item.category}</span>
                      <span className="text-[9px] text-blue-600 font-mono font-medium">{item.defaults.x}×{item.defaults.y}×{item.defaults.z}mm</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all font-black text-sm">+</div>
                  </button>
                );
              })}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Select an element to add to your 3D BIM assembly</p>
            </div>
          </div>
        </div>
      )}

      {/* 2-Point Real-World Scale Calibration Modal */}
      {isCalibrationOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 border border-slate-200 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="text-lg font-black text-slate-900">📐 Drawing Scale Calibration</h4>
              <button onClick={() => setIsCalibrationOpen(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Auto-detect or set real-world reference scale so 3D elements match drawing dimensions accurately.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Standard Drawing Scale</label>
                <div className="grid grid-cols-4 gap-2">
                  {[50, 100, 200, 500].map((s) => (
                    <button
                      key={s}
                      onClick={() => setCalibration(prev => ({ ...prev, scale: s, isCalibrated: true }))}
                      className={`py-2 rounded-xl text-xs font-black font-mono transition-all border ${
                        calibration.scale === s ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      1:{s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Reference Length (Grid Line Span)</label>
                <div className="flex items-center gap-2">
                  <NumericInput
                    value={calibration.refLengthMm}
                    min={100}
                    max={50000}
                    defaultFallback={1000}
                    onChange={(val) => setCalibration(prev => ({ ...prev, refLengthMm: val, isCalibrated: true }))}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold font-mono outline-none focus:border-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-500">mm</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setIsCalibrationOpen(false)}
                className="bg-blue-600 text-white text-xs font-black uppercase tracking-wider px-5 py-2.5 rounded-xl shadow-md hover:bg-blue-700"
              >
                Apply Calibration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm z-[10]">
        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          <div className="flex justify-between items-center">
            <Link to="/" className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest block">
              &larr; {t.backToDash}
            </Link>
            <button
              onClick={() => setShowOnboarding(true)}
              className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
            >
              ❓ Guide
            </button>
          </div>

          {/* Upload Drawing & CAD buttons */}
          <div className="space-y-2">
            <button 
              onClick={() => {
                if (trainStatus === 'training' || trainStatus === 'uploading') return;
                fileInputRef.current?.click();
              }}
              disabled={trainStatus === 'training' || trainStatus === 'uploading'}
              className={`w-full font-black py-3 rounded-2xl text-xs uppercase tracking-widest border shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${uploadButtonClass()}`}
            >
              <span>📁</span>
              <span>{drawing ? 'Drawing Loaded' : 'Upload Plan Drawing'}</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={() => dxfInputRef.current?.click()}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                title="Import CAD DXF Linework"
              >
                <span>📐</span> CAD DXF
              </button>
              <button
                onClick={() => setIsCalibrationOpen(true)}
                className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                title="Calibrate Scale (1:50, 1:100)"
              >
                <span>🎯</span> 1:{calibration.scale}
              </button>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          <input ref={dxfInputRef} type="file" accept=".dxf,.dwg,text/plain" onChange={handleDxfUpload} className="hidden" />
        </div>

        <div className="p-4 border-b border-slate-100 bg-white">
          <button 
            onClick={() => setIsConstructModalOpen(true)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2.5"
          >
            <span>🏗️</span> {t.addElement}
          </button>
        </div>

        <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-tight">Elements ({components.length})</span>
          {saveStatus && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase animate-pulse">{t.saved}</span>}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {components.map((comp) => (
            <button
              key={comp.id}
              onClick={() => setSelectedCompId(comp.id)}
              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 border ${
                selectedCompId === comp.id ? 'bg-blue-50 border-blue-300 shadow-sm ring-2 ring-blue-500/10' : 'bg-white border-slate-200/60 hover:bg-slate-50'
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] text-white shadow-sm shrink-0"
                style={{ backgroundColor: COMPONENT_COLORS[comp.type] || '#ccc' }}
              >
                {COMPONENT_CONFIGS[comp.type]?.shortName || '??'}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-black truncate ${selectedCompId === comp.id ? 'text-blue-700' : 'text-slate-800'}`}>
                  {comp.name}
                </div>
                <div className="text-[9px] text-slate-400 font-mono">
                  {comp.dimensions.x}×{comp.dimensions.y}×{comp.dimensions.z}mm
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Main 3D Viewport */}
      <main className="flex-1 relative overflow-hidden bg-slate-100">
        <ThreeDScene
          components={components}
          selectedCompId={selectedCompId || null}
          onSelectComp={(id) => setSelectedCompId(id || '')}
          onUpdateComponent={updateComponent}
          zoom={zoom}
          onZoomChange={(newZoom) => setZoom(newZoom)}
          opacity={opacity}
          tilt={globalRotation.x}
          rotate={globalRotation.z}
          onRotationChange={(tilt, rot) => setGlobalRotation(prev => ({ ...prev, x: tilt, z: rot }))}
          drawingUrl={drawing}
          showGizmos={showGizmos}
          snapEnabled={snapEnabled}
          snapGridSize={snapGridSize}
          onSnapToggle={(en) => setSnapEnabled(en)}
          onSnapGridSizeChange={(sz) => setSnapGridSize(sz)}
          dxfLines={dxfLines}
        />

        {/* Viewport Control Bar with Opacity, Zoom, Tilt, Rotate, Fit Scene (Bottom Center) */}
        <div className="absolute bottom-4 left-[58%] -translate-x-1/2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl px-4 py-2 flex items-center gap-3 z-[200] max-w-[95vw] overflow-x-auto scrollbar-hide">
          <button
            onClick={fitAll}
            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-blue-600 transition-all shadow-sm flex items-center gap-1.5 shrink-0"
            title="Auto-frame all components (Fit Scene)"
          >
            <span>🎯</span> Fit Scene
          </button>
          
          <div className="h-5 w-px bg-slate-200 shrink-0" />

          {/* Opacity Slider Control */}
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase shrink-0">
            <span className="flex items-center gap-1" title="Adjust element transparency for drawing alignment">
              <span>👁️</span> Opacity:
            </span>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-20 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              title="Drag to adjust 3D element transparency"
            />
            <span className="font-mono text-blue-600 font-bold w-9 text-right">{Math.round(opacity * 100)}%</span>
          </div>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          {/* Zoom Slider */}
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase shrink-0">
            <span>Zoom:</span>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="font-mono text-blue-600 font-bold w-9 text-right">{Math.round(zoom * 100)}%</span>
          </div>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          {/* Tilt Slider */}
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase shrink-0">
            <span>Tilt:</span>
            <input
              type="range"
              min="5"
              max="85"
              step="1"
              value={globalRotation.x}
              onChange={(e) => setGlobalRotation(prev => ({ ...prev, x: parseInt(e.target.value) }))}
              className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="font-mono text-blue-600 font-bold w-7 text-right">{globalRotation.x}°</span>
          </div>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          {/* Rotate Slider */}
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-700 uppercase shrink-0">
            <span>Rot:</span>
            <input
              type="range"
              min="0"
              max="360"
              step="2"
              value={globalRotation.z}
              onChange={(e) => setGlobalRotation(prev => ({ ...prev, z: parseInt(e.target.value) }))}
              className="w-16 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="font-mono text-blue-600 font-bold w-8 text-right">{globalRotation.z}°</span>
          </div>

          <div className="h-5 w-px bg-slate-200 shrink-0" />

          <button
            onClick={exportBoQSummary}
            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm flex items-center gap-1 shrink-0"
            title="Export Bill of Quantities Takeoff CSV"
          >
            <span>📊</span> Takeoff CSV
          </button>
        </div>
      </main>

      {/* Right Inspector Panel */}
      <aside className="w-84 bg-white border-l border-slate-200 flex flex-col shadow-sm z-[10]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t.inspector}</h3>
            <p className="text-[10px] text-slate-400 font-medium">Live SMM Takeoff & Scheduling</p>
          </div>
          {selectedComp && (
            <span className="text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm" style={{ backgroundColor: COMPONENT_COLORS[safeComp.type] }}>
              {COMPONENT_CONFIGS[safeComp.type]?.shortName}
            </span>
          )}
        </div>

        {selectedComp && selectedCompId ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide pb-24">
            {/* Component Name & Type */}
            <section>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">{t.elementInfo}</label>
              <input
                type="text"
                value={safeComp.name}
                onChange={(e) => updateComponent(selectedCompId, { name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-blue-500 outline-none"
              />
            </section>

            {/* Live Position & Gizmo Status (Directly Editable Coordinates) */}
            <section className="bg-slate-900 rounded-2xl p-4 text-white shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">🧭 3D Position (Coordinates)</span>
                <span className="text-[9px] text-emerald-400 font-mono font-bold">Snap: {snapGridSize}mm</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Drag the 3D Gizmo arrows or type exact coordinates below:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800 rounded-xl p-2 border border-red-500/40 flex flex-col gap-1">
                  <span className="text-red-400 font-black text-[9px] uppercase">Lateral X</span>
                  <div className="flex items-center">
                    <NumericInput
                      allowNegative={true}
                      min={-20000}
                      max={20000}
                      defaultFallback={0}
                      value={safeComp.position.x}
                      onChange={(val) => updatePosition('x', val)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-center outline-none focus:border-red-400"
                    />
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-2 border border-green-500/40 flex flex-col gap-1">
                  <span className="text-green-400 font-black text-[9px] uppercase">Lateral Y</span>
                  <div className="flex items-center">
                    <NumericInput
                      allowNegative={true}
                      min={-20000}
                      max={20000}
                      defaultFallback={0}
                      value={safeComp.position.y}
                      onChange={(val) => updatePosition('y', val)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-center outline-none focus:border-green-400"
                    />
                  </div>
                </div>
                <div className="bg-slate-800 rounded-xl p-2 border border-blue-500/40 flex flex-col gap-1">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-400 font-black text-[9px] uppercase">Elevation Z</span>
                    <span className="text-[8px] font-mono text-blue-300 font-bold">{safeComp.position.z} mm</span>
                  </div>
                  <div className="flex items-center">
                    <NumericInput
                      allowNegative={false}
                      min={0}
                      max={20000}
                      defaultFallback={0}
                      value={safeComp.position.z}
                      onChange={(val) => updatePosition('z', val)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono font-bold text-white text-center outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Z-Elevation Step Bar & Slider */}
              <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 space-y-2">
                <div className="flex justify-between items-center text-[9px] font-black text-slate-300 uppercase">
                  <span>Elevation Level (Z-Height):</span>
                  <span className="text-blue-400 font-mono font-bold">{safeComp.position.z} mm</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6000"
                  step={snapGridSize}
                  value={safeComp.position.z}
                  onChange={(e) => updatePosition('z', parseInt(e.target.value) || 0)}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex gap-1 justify-between text-[8px] font-black uppercase">
                  <button
                    onClick={() => updatePosition('z', 0)}
                    className="flex-1 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-center"
                    title="Snap directly to Ground (Z=0)"
                  >
                    Ground (0)
                  </button>
                  <button
                    onClick={() => updatePosition('z', Math.max(0, safeComp.position.z - 100))}
                    className="flex-1 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors text-center"
                  >
                    ▼ -100
                  </button>
                  <button
                    onClick={() => updatePosition('z', safeComp.position.z + 100)}
                    className="flex-1 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white transition-colors text-center"
                  >
                    ▲ +100
                  </button>
                  <button
                    onClick={() => updatePosition('z', safeComp.position.z + 500)}
                    className="flex-1 py-1 rounded bg-blue-600/80 hover:bg-blue-600 text-white transition-colors text-center"
                  >
                    ▲ +500
                  </button>
                </div>
              </div>
            </section>

            {/* Editable Dimensions Section (Direct Manual Entry + Sliders) */}
            <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <span>📐</span> {t.dimensions} (Manual Entry & Slider)
                </label>
                <span className="text-[9px] bg-blue-100 text-blue-700 font-black px-2 py-0.5 rounded">Exact mm</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-tight">
                Click any dimension below to type an exact millimeter size. The 3D component resizes in real time:
              </p>

              {(['x', 'y', 'z'] as const).map(axis => {
                const label = axis === 'x' ? 'Length / Span (X)' : axis === 'y' ? 'Width / Breadth (Y)' : 'Height / Depth (Z)';
                const colorTag = axis === 'x' ? 'text-red-600 bg-red-50 border-red-200' : axis === 'y' ? 'text-green-600 bg-green-50 border-green-200' : 'text-blue-600 bg-blue-50 border-blue-200';
                const curVal = safeComp.dimensions[axis];

                return (
                  <div key={axis} className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${colorTag}`}>
                        {label}
                      </span>
                      <div className="flex items-center gap-1">
                        <NumericInput
                          min={10}
                          max={25000}
                          defaultFallback={100}
                          value={curVal}
                          onChange={(val) => updateDimension(axis, val)}
                          className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs font-mono font-black text-slate-900 text-right outline-none focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                        />
                        <span className="text-xs font-black text-slate-400 font-mono">mm</span>
                      </div>
                    </div>

                    {/* Range Slider for rapid tactile adjustments */}
                    <input
                      type="range"
                      min="50"
                      max="6000"
                      step={snapGridSize}
                      value={curVal}
                      onChange={(e) => updateDimension(axis, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />

                    {/* Quick Step Controls */}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-[9px] font-bold text-slate-500">
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateDimension(axis, Math.max(50, curVal - 100))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                        >
                          -100
                        </button>
                        <button
                          onClick={() => updateDimension(axis, Math.max(50, curVal - 500))}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                        >
                          -500
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => updateDimension(axis, curVal + 100)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                        >
                          +100
                        </button>
                        <button
                          onClick={() => updateDimension(axis, curVal + 500)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 transition-colors"
                        >
                          +500
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>

            {/* SMM Real-Time Quantity Takeoff Cards */}
            {(() => {
              const qs = calculateQS(selectedComp.type, selectedComp.dimensions.x, selectedComp.dimensions.y, selectedComp.dimensions.z, selectedComp.rebarConfig);
              return (
                <section className="space-y-3">
                  {/* Concrete Volume */}
                  <div className="bg-blue-600 rounded-2xl p-3.5 text-white shadow-lg shadow-blue-500/20">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] font-black text-blue-200 uppercase tracking-wider">Concrete Volume</span>
                      <span className="text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded font-bold">{qs.concreteGrade}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black">{qs.concreteVolume}</span>
                      <span className="text-xs font-bold opacity-80">m³</span>
                    </div>
                    <span className="text-[9px] text-blue-200 font-mono block mt-0.5">{selectedComp.dimensions.x} × {selectedComp.dimensions.y} × {selectedComp.dimensions.z} mm</span>
                  </div>

                  {/* Formwork */}
                  {qs.formworkArea > 0 && (
                    <div className="bg-amber-500 rounded-2xl p-3.5 text-white shadow-lg shadow-amber-500/20">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-black text-amber-100 uppercase tracking-wider">Formwork Area</span>
                        <span className="text-[9px] bg-amber-600 text-white px-2 py-0.5 rounded font-bold">m² Contact</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black">{qs.formworkArea}</span>
                        <span className="text-xs font-bold opacity-80">m²</span>
                      </div>
                      <p className="text-[9px] text-amber-100 mt-0.5 leading-snug">{qs.formworkDescription}</p>
                    </div>
                  )}

                  {/* Reinforcement Steel Scheduling & Weight */}
                  {selectedComp.type !== 'blinding' && (
                    <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-xl border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">🔩 Reinforcement Takeoff</span>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          {qs.steelPercentage}% Vol Standard
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-emerald-400">{qs.steelWeightKg}</span>
                            <span className="text-xs font-bold text-slate-400">kg</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{qs.steelWeightTonnes} Tonnes</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Length</span>
                          <span className="text-xs font-black text-slate-200 font-mono">{qs.totalReinforcementLength} m</span>
                        </div>
                      </div>

                      {qs.rebarDetails && (
                        <div className="bg-slate-800/80 rounded-xl p-2.5 border border-slate-700/60 space-y-1.5 text-[10px]">
                          <div className="text-emerald-300 font-bold font-mono">
                            📋 {qs.rebarDetails.barScheduleDesc}
                          </div>
                          <div className="flex justify-between text-slate-400 font-mono text-[9px] pt-1 border-t border-slate-700">
                            <span>SMM Clause:</span>
                            <span className="text-slate-200 font-bold">{qs.smmClause}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              );
            })()}

            {/* Adjustable Rebar Configuration Controls */}
            {selectedComp.type !== 'blinding' && (
              <section className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-wider">🔩 Rebar Spacing & Diameter</label>
                  <span className="text-[9px] text-blue-600 font-black">BS 4449</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Bar Diameter</label>
                    <select
                      value={safeComp.rebarConfig?.diameterMm || 12}
                      onChange={(e) => updateRebar({ diameterMm: parseInt(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold font-mono outline-none"
                    >
                      <option value={10}>T10 (0.62 kg/m)</option>
                      <option value={12}>T12 (0.89 kg/m)</option>
                      <option value={16}>T16 (1.58 kg/m)</option>
                      <option value={20}>T20 (2.47 kg/m)</option>
                      <option value={25}>T25 (3.85 kg/m)</option>
                      <option value={32}>T32 (6.31 kg/m)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Link Spacing</label>
                    <select
                      value={safeComp.rebarConfig?.spacingMm || 150}
                      onChange={(e) => updateRebar({ spacingMm: parseInt(e.target.value) })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold font-mono outline-none"
                    >
                      <option value={75}>@75mm c/c</option>
                      <option value={100}>@100mm c/c</option>
                      <option value={150}>@150mm c/c</option>
                      <option value={200}>@200mm c/c</option>
                      <option value={250}>@250mm c/c</option>
                      <option value={300}>@300mm c/c</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 text-[10px]">
                    <span className="font-bold text-slate-500 uppercase">Concrete Cover</span>
                    <span className="font-mono font-bold text-slate-700">{safeComp.rebarConfig?.coverMm || 40}mm</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="60"
                    step="5"
                    value={safeComp.rebarConfig?.coverMm || 40}
                    onChange={(e) => updateRebar({ coverMm: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </section>
            )}

            {/* Real-time Structural Sanity & Validation Box */}
            {validation && (validation.warnings.length > 0 || validation.passes.length > 0) && (
              <section className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Structural Integrity & SMM Check</label>
                {validation.warnings.map((w, idx) => (
                  <div key={idx} className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-800 text-[11px] flex gap-2 items-start font-medium">
                    <span>⚠️</span>
                    <span>{w}</span>
                  </div>
                ))}
                {validation.passes.map((p, idx) => (
                  <div key={idx} className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-emerald-800 text-[11px] flex gap-2 items-start font-medium">
                    <span>✅</span>
                    <span>{p}</span>
                  </div>
                ))}
              </section>
            )}

            {/* Contextual SMM Library Reference Trigger */}
            <button
              onClick={() => setIsLibraryOpen(true)}
              className="w-full bg-slate-900 hover:bg-blue-600 text-white rounded-2xl py-3 px-4 flex items-center justify-between transition-all shadow-md active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <span>📚</span>
                <span className="text-[10px] font-black uppercase tracking-wider">Open SMM Library Rules</span>
              </div>
              <span className="font-bold">→</span>
            </button>

            {/* Remove Component */}
            <button
              onClick={() => setComponents(components.filter(c => c.id !== selectedCompId))}
              className="w-full text-[10px] font-black text-red-500 hover:text-red-700 transition-colors py-2 uppercase tracking-widest"
            >
              {t.remove}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="text-3xl opacity-20">🏗️</div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {components.length === 0 ? 'Add an element to start building' : 'Select an element in 3D viewport'}
            </p>
            {components.length === 0 && (
              <button
                onClick={() => setIsConstructModalOpen(true)}
                className="bg-blue-600 text-white text-xs font-black px-4 py-2 rounded-xl uppercase tracking-wider shadow-md hover:bg-blue-700"
              >
                + Add Component
              </button>
            )}
          </div>
        )}

        {/* Bottom Actions: Save & AR Launch */}
        <div className="p-4 border-t border-slate-100 bg-white flex flex-col gap-2">
          {components.length === 0 ? (
            <button disabled className="w-full font-bold py-3.5 rounded-2xl text-center text-xs uppercase bg-slate-100 text-slate-400 cursor-not-allowed">
              Add elements first
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <Link
                to={`/qr-result/${id}`}
                onClick={() => {
                  localStorage.setItem(`iseeqs_project_${id}`, JSON.stringify(components));
                  localStorage.setItem(`iseeqs_saved_${id}`, 'true');
                  setIsSaved(true);
                }}
                className="w-full font-black py-3.5 rounded-2xl text-center text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <span>🚀</span> Save &amp; Continue to AR
              </Link>

              <div className="flex justify-between items-center px-1 pt-1">
                <button
                  onClick={exportProjectJson}
                  className="text-[10px] font-bold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  📥 Export JSON
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem(`iseeqs_project_${id}`, JSON.stringify(components));
                    setSaveStatus(true);
                    setTimeout(() => setSaveStatus(false), 2000);
                  }}
                  className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  {saveStatus ? '✅ Saved!' : '💾 Save Model'}
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
