import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ProjectComponent } from '../types';
import { COMPONENT_COLORS, COMPONENT_CONFIGS } from '../constants';

interface ZapparARViewProps {
  components: ProjectComponent[];
  onClose: () => void;
  drawingUrl?: string | null;
  projectId?: string;
}

export const ZapparARView: React.FC<ZapparARViewProps> = ({
  components,
  onClose,
  drawingUrl,
  projectId,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // Model Transform State
  const [modelScale, setModelScale] = useState(0.001); // 1mm = 0.001m
  const [elevation, setElevation] = useState(0);
  const [modelPan, setModelPan] = useState({ x: 0, y: 0 });
  const [rotationYaw, setRotationYaw] = useState(0); // Z-axis degrees (0-360)
  const [rotationPitch, setRotationPitch] = useState(0); // X-axis degrees (-90 to 90)
  const [rotationRoll, setRotationRoll] = useState(0); // Y-axis degrees (-180 to 180)
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  
  const [selectedComponent, setSelectedComponent] = useState<ProjectComponent | null>(null);
  const [showXRay, setShowXRay] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'rotate' | 'pan' | 'scale'>('rotate');

  // --- Student Drawing Tracker State ---
  const [trackedDrawing, setTrackedDrawing] = useState<string | null>(() => {
    if (drawingUrl) return drawingUrl;
    if (projectId) {
      return localStorage.getItem(`iseeqs_drawing_${projectId}`) || null;
    }
    return null;
  });
  const [isAligning, setIsAligning] = useState<boolean>(false);
  const [drawingMatVisible, setDrawingMatVisible] = useState<boolean>(true);
  const [drawingMatOpacity, setDrawingMatOpacity] = useState<number>(0.85);
  const [sheetScale, setSheetScale] = useState<number>(1.0);
  const [snapFeedback, setSnapFeedback] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [showDrawingDrawer, setShowDrawingDrawer] = useState<boolean>(false);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const drawingGroupRef = useRef<THREE.Group | null>(null);

  // Gesture tracking refs
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartDistRef = useRef<number>(0);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  // Synthesized Camera Shutter Sound (Web Audio API)
  const playShutterSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {}
  };

  // 1. Initialize Web Camera
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported on this browser');
        }

        // Try environment camera first
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback to basic video constraint
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('autoplay', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play().catch(() => {});
          setCameraActive(true);
        }
      } catch (err: any) {
        console.warn('Camera access warning:', err);
        setCameraError('Camera preview inactive or blocked. Active in 3D AR Studio Simulation mode.');
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // 2. Initialize Three.js WebGL overlay
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, -2.5, 1.8);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0.4);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.3);
    sunLight.position.set(3, -4, 5);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x90caf9, 0.6);
    fillLight.position.set(-3, 3, 2);
    scene.add(fillLight);

    // Ground Plane AR Shadow Receiver
    const planeGeo = new THREE.PlaneGeometry(12, 12);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const shadowPlane = new THREE.Mesh(planeGeo, planeMat);
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Drawing Mat Group (holds student's tracked paper drawing)
    const drawingGroup = new THREE.Group();
    scene.add(drawingGroup);
    drawingGroupRef.current = drawingGroup;

    // Reticle / AR Marker Circular Target Ring
    const ringGeo = new THREE.RingGeometry(0.8, 0.85, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, opacity: 0.7, transparent: true });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.z = 0.001;
    scene.add(ringMesh);

    // Grid
    const grid = new THREE.GridHelper(5, 25, 0x38bdf8, 0x475569);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.001;
    scene.add(grid);

    // Model Group
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    let animId: number;
    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);
      
      if (isAutoSpinning) {
        setRotationYaw(prev => (prev + 0.5) % 360);
      }

      const rotPitchRad = (rotationPitch * Math.PI) / 180;
      const rotRollRad = (rotationRoll * Math.PI) / 180;
      const rotYawRad = (rotationYaw * Math.PI) / 180;

      if (modelGroupRef.current) {
        // Full 3D rotation: Pitch (X), Roll (Y), Yaw (Z)
        modelGroupRef.current.rotation.set(rotPitchRad, rotRollRad, rotYawRad);
        modelGroupRef.current.position.set(modelPan.x, modelPan.y, elevation);
        const s = modelScale;
        modelGroupRef.current.scale.set(s, s, s);
      }

      if (drawingGroupRef.current) {
        // Keep drawing mat anchored in sync with model orientation and position
        drawingGroupRef.current.rotation.set(rotPitchRad, rotRollRad, rotYawRad);
        drawingGroupRef.current.position.set(modelPan.x, modelPan.y, elevation);
        const s = modelScale * sheetScale;
        drawingGroupRef.current.scale.set(s, s, s);
      }

      renderer.render(scene, camera);
    };
    renderLoop();

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [rotationYaw, rotationPitch, rotationRoll, elevation, modelScale, modelPan, isAutoSpinning, sheetScale]);

  // --- 3. Build Drawing Mat (Student's Physical Plan Sheet in 3D Scene) ---
  useEffect(() => {
    if (!drawingGroupRef.current) return;
    const group = drawingGroupRef.current;

    // Clear previous children
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    if (!trackedDrawing || !drawingMatVisible) return;

    // Compute bounding dimensions of components to frame the drawing sheet
    const maxSpanX = Math.max(
      ...components.map(c => Math.abs(c.position.x) + c.dimensions.x / 2),
      700
    );
    const maxSpanY = Math.max(
      ...components.map(c => Math.abs(c.position.y) + c.dimensions.y / 2),
      700
    );
    const baseDim = Math.max(maxSpanX, maxSpanY) * 2 + 500; // in mm

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(trackedDrawing, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      const aspect = texture.image ? texture.image.width / texture.image.height : 1.414; // Default A4/A3
      
      const widthMm = baseDim;
      const heightMm = baseDim / aspect;

      // 1. Drawing Sheet Mesh
      const planeGeo = new THREE.PlaneGeometry(widthMm, heightMm);
      const planeMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: drawingMatOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const planeMesh = new THREE.Mesh(planeGeo, planeMat);
      // Place sheet right at z = -2mm (flush just beneath 3D concrete elements)
      planeMesh.position.set(0, 0, -2);
      group.add(planeMesh);

      // 2. Cyan Glowing Sheet Boundary Lines
      const borderGeo = new THREE.EdgesGeometry(planeGeo);
      const borderMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        linewidth: 2,
        transparent: true,
        opacity: 0.85,
      });
      const borderLines = new THREE.LineSegments(borderGeo, borderMat);
      borderLines.position.set(0, 0, -1);
      group.add(borderLines);

      // 3. Technical CAD Corner Brackets
      const bracketLen = Math.min(120, widthMm * 0.12);
      const halfW = widthMm / 2;
      const halfH = heightMm / 2;
      const bracketMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 3 });

      const corners = [
        [[-halfW, -halfH + bracketLen], [-halfW, -halfH], [-halfW + bracketLen, -halfH]], // BL
        [[halfW - bracketLen, -halfH], [halfW, -halfH], [halfW, -halfH + bracketLen]],     // BR
        [[halfW, halfH - bracketLen], [halfW, halfH], [halfW - bracketLen, halfH]],         // TR
        [[-halfW + bracketLen, halfH], [-halfW, halfH], [-halfW, halfH - bracketLen]],     // TL
      ];

      corners.forEach((cornerPts) => {
        const pts = cornerPts.map(([px, py]) => new THREE.Vector3(px, py, 0));
        group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), bracketMat));
      });
    });
  }, [trackedDrawing, drawingMatVisible, drawingMatOpacity, components]);

  // --- 4. Snap Camera Frame to create Instant Student Drawing Tracker ---
  const handleSnapDrawing = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setNotificationMessage('Camera preview warming up... please try in 1 second.');
      setTimeout(() => setNotificationMessage(null), 3000);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    setTrackedDrawing(dataUrl);
    setDrawingMatVisible(true);
    setIsAligning(false);
    setSnapFeedback(true);
    setTimeout(() => setSnapFeedback(false), 300);

    // Audio and haptics
    playShutterSound();
    if (navigator.vibrate) {
      navigator.vibrate([40, 30, 40]);
    }

    if (projectId) {
      try {
        localStorage.setItem(`iseeqs_drawing_${projectId}`, dataUrl);
      } catch (err) {
        console.warn('Storage quota for drawing:', err);
      }
    }

    setNotificationMessage('✅ Student Drawing Anchored! 3D Model locked onto your physical paper.');
    setTimeout(() => setNotificationMessage(null), 4000);
  };

  // --- 5. Upload Drawing Image File (Auto-CAD, PDF export, or Gallery photo) ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result as string;
      if (res) {
        setTrackedDrawing(res);
        setDrawingMatVisible(true);
        setIsAligning(false);
        if (projectId) {
          try {
            localStorage.setItem(`iseeqs_drawing_${projectId}`, res);
          } catch {}
        }
        setNotificationMessage('✅ Drawing Plan Loaded as AR Tracker Mat!');
        setTimeout(() => setNotificationMessage(null), 4000);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Update Components in Model Group
  useEffect(() => {
    if (!modelGroupRef.current) return;
    const group = modelGroupRef.current;

    // Clear previous children
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    components.forEach((comp) => {
      const compGroup = new THREE.Group();
      compGroup.name = comp.id;

      const { x: w, y: h, z: d } = comp.dimensions;
      const baseHex = COMPONENT_COLORS[comp.type] || '#3b82f6';
      const isSelected = selectedComponent?.id === comp.id;

      const boxGeo = new THREE.BoxGeometry(w, h, d);
      const boxMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseHex),
        roughness: 0.3,
        metalness: 0.15,
        transparent: showXRay,
        opacity: showXRay ? 0.45 : 0.95,
      });

      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      compGroup.add(boxMesh);

      // Edges
      const edgesGeo = new THREE.EdgesGeometry(boxGeo);
      const edgeMat = new THREE.LineBasicMaterial({
        color: isSelected ? 0x38bdf8 : 0x0f172a,
        linewidth: isSelected ? 3 : 1,
      });
      compGroup.add(new THREE.LineSegments(edgesGeo, edgeMat));

      // Internal Rebar Wireframe
      if (comp.includeReinforcement && comp.type !== 'blinding') {
        const rebarGroup = new THREE.Group();
        const rebarMat = new THREE.LineBasicMaterial({ color: 0x0f172a });
        const step = comp.rebarConfig?.spacingMm || 150;
        const rebarW = Math.max(10, w - 80);
        const rebarH = Math.max(10, h - 80);

        // Bottom mat
        for (let ix = -rebarW / 2; ix <= rebarW / 2; ix += step) {
          const points = [
            new THREE.Vector3(ix, -rebarH / 2, -d / 2 + 35),
            new THREE.Vector3(ix, rebarH / 2, -d / 2 + 35),
          ];
          rebarGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), rebarMat));
        }
        for (let iy = -rebarH / 2; iy <= rebarH / 2; iy += step) {
          const points = [
            new THREE.Vector3(-rebarW / 2, iy, -d / 2 + 45),
            new THREE.Vector3(rebarW / 2, iy, -d / 2 + 45),
          ];
          rebarGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), rebarMat));
        }

        // Top mat for suspended slab or thick elements
        if ((comp.type === 'slab' || d >= 130) && d > 90) {
          for (let ix = -rebarW / 2; ix <= rebarW / 2; ix += step) {
            const points = [
              new THREE.Vector3(ix, -rebarH / 2, d / 2 - 45),
              new THREE.Vector3(ix, rebarH / 2, d / 2 - 45),
            ];
            rebarGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), rebarMat));
          }
          for (let iy = -rebarH / 2; iy <= rebarH / 2; iy += step) {
            const points = [
              new THREE.Vector3(-rebarW / 2, iy, d / 2 - 35),
              new THREE.Vector3(rebarW / 2, iy, d / 2 - 35),
            ];
            rebarGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), rebarMat));
          }
        }
        compGroup.add(rebarGroup);
      }

      // Positioning
      compGroup.position.set(comp.position.x, comp.position.y, comp.position.z + d / 2);
      compGroup.rotation.x = (comp.rotation.x * Math.PI) / 180;
      compGroup.rotation.y = (comp.rotation.y * Math.PI) / 180;
      compGroup.rotation.z = (comp.rotation.z * Math.PI) / 180;

      group.add(compGroup);
    });
  }, [components, selectedComponent, showXRay]);

  // ==========================================
  // MULTI-TOUCH 3D ROTATION, PINCH ZOOM & PAN
  // ==========================================

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      touchStartRef.current = { x: e.clientX, y: e.clientY };
    } else if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values()) as Array<{ x: number; y: number }>;
      touchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 2-Finger Gestures: Pinch to Scale + 2-Finger Pan
    if (activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values()) as Array<{ x: number; y: number }>;
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      
      if (touchStartDistRef.current > 0) {
        const ratio = currentDist / touchStartDistRef.current;
        setModelScale(prev => Math.min(0.005, Math.max(0.0002, prev * ratio)));
        touchStartDistRef.current = currentDist;
      }
      return;
    }

    // 1-Finger Gesture: 3D Orbit / Rotate model
    if (activePointers.current.size === 1) {
      const dx = e.clientX - touchStartRef.current.x;
      const dy = e.clientY - touchStartRef.current.y;
      touchStartRef.current = { x: e.clientX, y: e.clientY };

      if (interactionMode === 'rotate') {
        // Orbit Yaw (around Z) and Pitch (around X)
        setRotationYaw(prev => {
          let next = (prev + dx * 0.45) % 360;
          return next < 0 ? next + 360 : next;
        });
        setRotationPitch(prev => Math.max(-80, Math.min(80, prev - dy * 0.35)));
      } else if (interactionMode === 'pan') {
        setModelPan(prev => ({
          x: prev.x + dx * 0.002,
          y: prev.y - dy * 0.002
        }));
      } else if (interactionMode === 'scale') {
        setModelScale(prev => Math.min(0.005, Math.max(0.0002, prev * (1 - dy * 0.005))));
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);

    // If it was a quick tap without drag, check raycast for component selection
    const distMoved = Math.hypot(e.clientX - touchStartRef.current.x, e.clientY - touchStartRef.current.y);
    if (distMoved < 5 && canvasRef.current && cameraRef.current && modelGroupRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const intersects = raycaster.intersectObjects(modelGroupRef.current.children, true);
      if (intersects.length > 0) {
        let cur: THREE.Object3D | null = intersects[0].object;
        while (cur && cur.parent && cur.parent !== modelGroupRef.current) {
          cur = cur.parent;
        }
        if (cur && cur.name) {
          const found = components.find((c) => c.id === cur?.name);
          setSelectedComponent(found || null);
        }
      } else {
        setSelectedComponent(null);
      }
    }
  };

  // Quick 90-degree step rotation
  const rotateStep = (angleDelta: number) => {
    setRotationYaw(prev => {
      let next = (prev + angleDelta) % 360;
      return next < 0 ? next + 360 : next;
    });
  };

  const resetAllTransforms = () => {
    setRotationYaw(0);
    setRotationPitch(0);
    setRotationRoll(0);
    setModelScale(0.001);
    setElevation(0);
    setModelPan({ x: 0, y: 0 });
    setIsAutoSpinning(false);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      {/* Background Live Camera Video */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className={`absolute inset-0 w-full h-full object-cover ${
          cameraActive ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Fallback Simulation Background if no camera */}
      {!cameraActive && (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center pointer-events-none">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                'radial-gradient(circle at 50% 50%, #38bdf8 1px, transparent 1px)',
              backgroundSize: '30px 30px',
            }}
          />
        </div>
      )}

      {/* 3D WebGL Canvas Layer with Touch Gestures */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 w-full h-full z-10 cursor-grab active:cursor-grabbing"
      />

      {/* Shutter Flash Feedback */}
      <div
        className={`absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-300 ${
          snapFeedback ? 'opacity-90' : 'opacity-0'
        }`}
      />

      {/* Hidden file input for picking drawing from mobile storage */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Floating Notification Toast */}
      {notificationMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-white border border-cyan-400/50 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-bold animate-in slide-in-from-top-4">
          <span className="text-base">🎯</span>
          <span>{notificationMessage}</span>
        </div>
      )}

      {/* Alignment Reticle Viewfinder Overlay (HUD) */}
      {isAligning && (
        <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-[2px] flex flex-col items-center justify-between p-6 pointer-events-auto select-none">
          {/* Top Instruction Banner */}
          <div className="bg-slate-900/90 border border-cyan-400/60 px-5 py-3 rounded-2xl text-center shadow-2xl max-w-md w-full animate-in slide-in-from-top-4">
            <div className="flex items-center justify-center gap-2 text-cyan-400 font-black text-xs uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Student Drawing Alignment Viewfinder</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              Aim your camera directly at the paper drawing on your desk. Hold steady and tap <strong className="text-cyan-300">"Snap &amp; Anchor"</strong> to lock the 3D BIM model!
            </p>
          </div>

          {/* Central Alignment Frame with Corner Brackets */}
          <div className="relative w-[85vw] max-w-[460px] aspect-[1.35/1] flex items-center justify-center">
            {/* 4 Corner L-Brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg shadow-[0_0_15px_rgba(56,189,248,0.5)]" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg shadow-[0_0_15px_rgba(56,189,248,0.5)]" />

            {/* Central Precision Crosshairs */}
            <div className="w-8 h-0.5 bg-cyan-400/60" />
            <div className="h-8 w-0.5 bg-cyan-400/60 absolute" />
            <div className="w-3 h-3 rounded-full border border-cyan-300/80 absolute" />

            {/* Subdued Scanning Sweep Line */}
            <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

            {/* Guide Label */}
            <span className="absolute bottom-3 bg-slate-900/80 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-cyan-300 border border-cyan-500/30">
              📐 Frame Student Drawing Sheet Here
            </span>
          </div>

          {/* Bottom Viewfinder Action Controls */}
          <div className="flex items-center gap-4 max-w-sm w-full justify-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-900/80 hover:bg-slate-900 text-white px-4 py-3 rounded-2xl border border-white/20 text-xs font-bold flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xl"
              title="Upload photo from phone gallery or file"
            >
              <span className="text-lg">📁</span>
              <span className="text-[9px] uppercase tracking-wider">Upload Plan</span>
            </button>

            <button
              onClick={handleSnapDrawing}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-4 px-6 rounded-3xl font-black text-sm uppercase tracking-wider shadow-2xl shadow-cyan-500/40 flex items-center justify-center gap-3 active:scale-95 transition-all border border-cyan-300/40"
            >
              <span className="text-xl">📸</span>
              <span>Snap &amp; Anchor</span>
            </button>

            <button
              onClick={() => setIsAligning(false)}
              className="bg-slate-900/80 hover:bg-slate-900 text-white p-3 rounded-2xl border border-white/20 text-xs font-bold active:scale-95 transition-all shadow-xl"
              title="Close Viewfinder"
            >
              <span className="text-base">✕</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Floating Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-auto">
        <button
          onClick={onClose}
          className="bg-slate-900/80 hover:bg-slate-900 text-white px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all"
        >
          <span>&larr;</span> Exit AR
        </button>

        {/* Center Tracker Status Badge */}
        <div className="flex items-center gap-2">
          {trackedDrawing ? (
            <button
              onClick={() => setShowDrawingDrawer(prev => !prev)}
              className="bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-400/50 backdrop-blur-md px-3.5 py-1.5 rounded-2xl flex items-center gap-2.5 text-white shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
              title="Click to adjust Drawing Mat opacity & scale"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200">
                Anchored to Drawing
              </span>
              <span className="text-[9px] bg-emerald-800/80 px-1.5 py-0.5 rounded font-mono">
                ⚙️ Mat
              </span>
            </button>
          ) : (
            <button
              onClick={() => setIsAligning(true)}
              className="bg-blue-600/90 hover:bg-blue-600 border border-blue-400/50 backdrop-blur-md px-3.5 py-1.5 rounded-2xl flex items-center gap-2 text-white shadow-xl shadow-blue-500/30 animate-pulse active:scale-95 transition-all"
              title="Snap camera view to track student drawing"
            >
              <span>📸</span>
              <span className="text-[11px] font-black uppercase tracking-wider">
                Snap Drawing Tracker
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAligning(true)}
            className="px-3 py-2 rounded-2xl backdrop-blur-md border border-white/20 bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
            title="Snap drawing paper tracker"
          >
            <span>🎯</span>
            <span className="hidden sm:inline">Align</span>
          </button>

          <button
            onClick={() => setShowXRay(!showXRay)}
            className={`px-3.5 py-2 rounded-2xl backdrop-blur-md border text-[11px] font-black uppercase tracking-widest transition-all ${
              showXRay
                ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30'
                : 'bg-slate-900/80 border-white/20 text-white hover:bg-slate-900'
            }`}
          >
            {showXRay ? '⚡ Rebar X-Ray ON' : '🔍 X-Ray'}
          </button>
        </div>
      </div>

      {/* On-Screen Touch Gesture Mode Pill */}
      <div className="absolute top-20 right-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <div className="bg-slate-950/80 backdrop-blur-md border border-white/20 rounded-2xl p-1.5 flex flex-col gap-1.5 shadow-xl">
          <button
            onClick={() => setInteractionMode('rotate')}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              interactionMode === 'rotate' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/10'
            }`}
            title="1-Finger Drag rotates model in 3D"
          >
            <span>🔄 3D Rotate</span>
          </button>
          <button
            onClick={() => setInteractionMode('pan')}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              interactionMode === 'pan' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-white/10'
            }`}
            title="1-Finger Drag moves model horizontally"
          >
            <span>✋ Pan</span>
          </button>
          <button
            onClick={() => setIsAutoSpinning(!isAutoSpinning)}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
              isAutoSpinning ? 'bg-amber-500 text-white animate-pulse' : 'text-slate-300 hover:bg-white/10'
            }`}
            title="360 Turntable rotation"
          >
            <span>🎡 360° Spin</span>
          </button>
        </div>

        {/* Quick 90-degree Rotation buttons */}
        <div className="bg-slate-950/80 backdrop-blur-md border border-white/20 rounded-2xl p-1.5 flex flex-col gap-1 shadow-xl">
          <button
            onClick={() => rotateStep(90)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black text-slate-200 hover:bg-white/10 uppercase"
            title="Rotate +90 degrees"
          >
            +90° ↻
          </button>
          <button
            onClick={() => rotateStep(-90)}
            className="px-2.5 py-1.5 rounded-lg text-[10px] font-black text-slate-200 hover:bg-white/10 uppercase"
            title="Rotate -90 degrees"
          >
            -90° ↺
          </button>
          <button
            onClick={resetAllTransforms}
            className="px-2.5 py-1.5 rounded-lg text-[9px] font-black text-red-400 hover:bg-red-500/20 uppercase"
            title="Reset model position and orientation"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Selected Element Floating Card */}
      {selectedComponent && (
        <div className="absolute top-20 left-4 md:left-1/2 md:-translate-x-1/2 md:w-96 z-20 bg-slate-900/90 text-white backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-2xl animate-in slide-in-from-top-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span
                className="text-[9px] font-black uppercase px-2 py-0.5 rounded mr-2"
                style={{ backgroundColor: COMPONENT_COLORS[selectedComponent.type] }}
              >
                {selectedComponent.type}
              </span>
              <h4 className="text-base font-black inline">{selectedComponent.name}</h4>
            </div>
            <button
              onClick={() => setSelectedComponent(null)}
              className="text-slate-400 hover:text-white font-bold text-sm"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center mt-3 bg-white/5 p-2 rounded-xl border border-white/10">
            <div>
              <span className="text-[9px] text-slate-400 uppercase block font-bold">Length</span>
              <span className="text-xs font-black">{selectedComponent.dimensions.x}mm</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase block font-bold">Width</span>
              <span className="text-xs font-black">{selectedComponent.dimensions.y}mm</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 uppercase block font-bold">Depth</span>
              <span className="text-xs font-black">{selectedComponent.dimensions.z}mm</span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom AR Calibration & Drawing Tracker Dock */}
      <div className="absolute bottom-6 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[560px] z-20 bg-slate-950/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 md:p-5 text-white shadow-2xl flex flex-col gap-3">
        {/* Dock Header with Tabs */}
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
            <button
              onClick={() => setShowDrawingDrawer(false)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                !showDrawingDrawer ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              📐 3D Calibration
            </button>
            <button
              onClick={() => setShowDrawingDrawer(true)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                showDrawingDrawer ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>📄 Drawing Mat</span>
              {trackedDrawing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>}
            </button>
          </div>

          <span className="text-blue-400 text-[10px] font-mono">
            {components.length} Elements • {cameraActive ? 'Camera ON' : 'Sim Mode'}
          </span>
        </div>

        {/* Tab 1: 3D Calibration */}
        {!showDrawingDrawer && (
          <div className="grid grid-cols-3 gap-4">
            {/* 3D Rotation (Yaw & Pitch) */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex justify-between w-full text-[10px] font-black text-slate-400 uppercase">
                <span>Rotation</span>
                <span className="text-blue-400 font-mono">{Math.round(rotationYaw)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={rotationYaw}
                onChange={(e) => setRotationYaw(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between w-full text-[8px] text-slate-500 font-bold">
                <span>0°</span>
                <span>180°</span>
                <span>360°</span>
              </div>
            </div>

            {/* Scale */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex justify-between w-full text-[10px] font-black text-slate-400 uppercase">
                <span>Scale</span>
                <span className="text-blue-400 font-mono">{(modelScale * 1000).toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min="0.0003"
                max="0.003"
                step="0.0001"
                value={modelScale}
                onChange={(e) => setModelScale(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between w-full text-[8px] text-slate-500 font-bold">
                <span>Mini</span>
                <span>1:1</span>
              </div>
            </div>

            {/* Elevation */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex justify-between w-full text-[10px] font-black text-slate-400 uppercase">
                <span>Elevation</span>
                <span className="text-blue-400 font-mono">{elevation > 0 ? `+${elevation.toFixed(2)}m` : `${elevation.toFixed(2)}m`}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="2"
                step="0.05"
                value={elevation}
                onChange={(e) => setElevation(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between w-full text-[8px] text-slate-500 font-bold">
                <span>-1m</span>
                <span>0m</span>
                <span>+2m</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Drawing Tracker Mat Controls */}
        {showDrawingDrawer && (
          <div className="flex flex-col gap-3">
            {trackedDrawing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                {/* Left: Thumbnail & Status */}
                <div className="flex items-center gap-3 bg-white/5 p-2.5 rounded-2xl border border-white/10">
                  <img
                    src={trackedDrawing}
                    alt="Tracked Drawing"
                    className="w-14 h-14 object-cover rounded-xl border border-cyan-400/50 shadow-md bg-black/40"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">
                        Active Tracker
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-300 truncate">Student Paper Plan</p>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => setIsAligning(true)}
                        className="text-[9px] font-bold text-cyan-300 hover:text-cyan-200 underline"
                      >
                        📸 Snap Again
                      </button>
                      <button
                        onClick={() => {
                          setTrackedDrawing(null);
                          if (projectId) localStorage.removeItem(`iseeqs_drawing_${projectId}`);
                        }}
                        className="text-[9px] font-bold text-red-400 hover:text-red-300 underline"
                      >
                        Detach
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Sliders (Opacity & Visibility) */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-300 uppercase">
                    <span>Drawing Mat Opacity</span>
                    <span className="text-cyan-400 font-mono">{Math.round(drawingMatOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={drawingMatOpacity}
                    onChange={(e) => setDrawingMatOpacity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />

                  <div className="flex items-center justify-between gap-2 mt-1">
                    <button
                      onClick={() => setDrawingMatVisible(!drawingMatVisible)}
                      className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border transition-all ${
                        drawingMatVisible
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                          : 'bg-white/5 text-slate-400 border-white/10'
                      }`}
                    >
                      {drawingMatVisible ? '👁️ Mat Visible' : '🚫 Mat Hidden'}
                    </button>

                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">Sheet:</span>
                      {[0.8, 1.0, 1.4].map((scaleVal) => (
                        <button
                          key={scaleVal}
                          onClick={() => setSheetScale(scaleVal)}
                          className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                            sheetScale === scaleVal
                              ? 'bg-blue-600 text-white font-black'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {scaleVal}×
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* No Drawing Anchored Prompt */
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white/5 p-3 rounded-2xl border border-white/10">
                <div className="text-left">
                  <p className="text-xs font-black text-slate-200">No Student Drawing Anchored Yet</p>
                  <p className="text-[10px] text-slate-400">
                    Snap your physical paper drawing on desk or upload an architectural plan.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsAligning(true)}
                    className="flex-1 sm:flex-initial bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-[11px] uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>📸</span>
                    <span>Snap Drawing</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/10 hover:bg-white/20 text-white font-black text-[11px] uppercase tracking-wider px-3 py-2.5 rounded-xl transition-all"
                  >
                    📁 Upload
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
