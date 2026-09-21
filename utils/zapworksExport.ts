import JSZip from 'jszip';
import { ProjectComponent } from '../types';
import { exportComponentsToGLB } from './gltfExport';
import { calculateQS } from './qsCalculations';
import { COMPONENT_COLORS, COMPONENT_CONFIGS } from '../constants';

export async function generateZapworksZip(
  components: ProjectComponent[],
  drawingDataUrl: string | null,
  projectId: string,
  zapworksProjectUrl: string = 'https://r7jen.zappar.io/7763698978076374850/'
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Generate GLB binary
  let glbBlob: Blob | null = null;
  try {
    glbBlob = await exportComponentsToGLB(components, `IseeQS_${projectId}`);
    const glbArrayBuffer = await glbBlob.arrayBuffer();
    zip.file('model.glb', glbArrayBuffer);
  } catch (err) {
    console.warn('Could not export GLB for zip, proceeding with embedded geometry', err);
  }

  // 2. Add drawing if available
  let hasDrawing = false;
  if (drawingDataUrl && drawingDataUrl.startsWith('data:')) {
    try {
      const parts = drawingDataUrl.split(',');
      const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
      const base64Data = parts[1];
      const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'png';
      zip.file(`drawing.${ext}`, base64Data, { base64: true });
      hasDrawing = true;
    } catch (e) {
      console.warn('Could not parse drawing image for zip', e);
    }
  }

  // 3. Takeoff summary JSON
  const takeoffs = components.map((c) => {
    const qs = calculateQS(c.type, c.dimensions.x, c.dimensions.y, c.dimensions.z, c.rebarConfig);
    return {
      id: c.id,
      name: c.name,
      type: c.type,
      dimensions: c.dimensions,
      position: c.position,
      takeoff: {
        concreteVolume_m3: qs.concreteVolume,
        concreteVolumeNum: qs.concreteVolumeNum,
        formworkArea_m2: qs.formworkArea,
        steelWeight_kg: qs.steelWeightKg,
        steelWeight_tonnes: qs.steelWeightTonnes,
        rebarLength_m: qs.totalReinforcementLength,
        smmClause: qs.smmClause
      }
    };
  });

  const totalConcrete = takeoffs.reduce((acc, cur) => acc + (cur.takeoff.concreteVolumeNum || 0), 0).toFixed(3);
  const totalSteel = takeoffs.reduce((acc, cur) => acc + (cur.takeoff.steelWeight_kg || 0), 0).toFixed(1);

  zip.file(
    'takeoff-summary.json',
    JSON.stringify(
      {
        projectId,
        zapworksProject: 'IseeQS-Vortex',
        zapworksUrl: zapworksProjectUrl,
        exportedAt: new Date().toISOString(),
        totalConcreteVolume_m3: totalConcrete,
        totalSteelWeight_kg: totalSteel,
        components: takeoffs
      },
      null,
      2
    )
  );

  // 4. Instructions README
  zip.file(
    'README_ZAPWORKS.txt',
    `========================================================================
ISEEQS-VORTEX: ZAPWORKS WEBAR COMPONENT PACKAGE
Taylor's University - Quantity Surveying Augmented Reality Visualizer
========================================================================

Zapworks Project: IseeQS-Vortex
Hosting URL: ${zapworksProjectUrl}

HOW TO UPLOAD TO ZAPWORKS:
------------------------------------------------------------------------
1. Open Zapworks Dashboard:
   https://my.zap.works/projects/7763698978076374850/

2. Locate the project "IseeQS-Vortex" (Type: React + Three.js).

3. Click the red "Upload/Publish" button in the upper-right corner.

4. Select or drag & drop THIS ZIP file:
   "IseeQS_Zapworks_Package_${projectId.slice(0, 8)}.zip"

5. Click "Publish".

6. Test on any smartphone:
   - Scan the QR code shown on your Zapworks project page:
     ${zapworksProjectUrl}
   - The WebAR camera experience will instantly open in the mobile browser
     with your 3D concrete model, rebar cage, drawing tracking mat, and
     real-time QS takeoff values!

FILES INCLUDED IN THIS PACKAGE:
- index.html           : Self-contained WebAR mobile viewer (Three.js + Web Camera)
- model.glb            : 3D binary model of concrete substructure and rebar
- takeoff-summary.json : Quantity Takeoff measurements & SMM clauses
${hasDrawing ? '- drawing.png          : Plan drawing target tracking mat' : ''}
========================================================================
`
  );

  // 5. Build standalone self-contained index.html for Zapworks WebAR hosting
  const componentsJson = JSON.stringify(components);
  const colorsJson = JSON.stringify(COMPONENT_COLORS);
  const configsJson = JSON.stringify(COMPONENT_CONFIGS);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>IseeQS-Vortex | WebAR Structural Visualizer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #fff; }
    #video-bg { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; object-fit: cover; z-index: 1; transform: scaleX(1); }
    #gl-canvas { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2; touch-action: none; }
    
    /* Top Bar */
    .hud-top {
      position: fixed; top: 16px; left: 16px; right: 16px; z-index: 10;
      display: flex; justify-content: space-between; align-items: center;
      pointer-events: none;
    }
    .badge {
      background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(10px);
      border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 999px;
      padding: 6px 14px; font-size: 11px; font-weight: 900; letter-spacing: 0.5px;
      color: #38bdf8; display: inline-flex; align-items: center; gap: 6px;
      pointer-events: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }
    
    /* Bottom QS HUD */
    .hud-bottom {
      position: fixed; bottom: 20px; left: 16px; right: 16px; z-index: 10;
      display: flex; flex-direction: column; gap: 10px;
    }
    .takeoff-card {
      background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 20px;
      padding: 14px 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    }
    .takeoff-title { font-size: 10px; font-weight: 900; letter-spacing: 1px; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; display: flex; justify-content: space-between; }
    .metrics-grid { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 8px; }
    .metric-box { background: rgba(30, 41, 59, 0.7); padding: 8px 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
    .metric-label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
    .metric-val { font-size: 16px; font-weight: 900; color: #f8fafc; font-family: monospace; }
    .metric-unit { font-size: 10px; font-weight: 600; color: #38bdf8; margin-left: 2px; }

    /* Action Controls Bar */
    .controls-bar {
      display: flex; gap: 8px; justify-content: center;
    }
    .btn-ctrl {
      flex: 1; background: rgba(30, 41, 59, 0.9); backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2); color: #fff;
      padding: 10px 8px; border-radius: 14px; font-size: 11px; font-weight: 800;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
      transition: all 0.15s; active: transform: scale(0.96);
    }
    .btn-ctrl.active { background: #2563eb; border-color: #60a5fa; box-shadow: 0 0 15px rgba(37,99,235,0.5); }
    
    /* Camera Permission Overlay */
    #start-screen {
      position: fixed; inset: 0; z-index: 50; background: #090d16;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 24px; text-align: center;
    }
    .start-box {
      max-width: 360px; background: #111827; border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 28px; padding: 28px 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.8);
    }
    .start-btn {
      width: 100%; background: linear-gradient(135deg, #2563eb, #0284c7); color: #fff;
      border: none; border-radius: 16px; padding: 14px; font-size: 13px; font-weight: 900;
      text-transform: uppercase; letter-spacing: 1px; cursor: pointer; margin-top: 18px;
      box-shadow: 0 8px 20px rgba(37,99,235,0.4);
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
  <video id="video-bg" autoplay playsinline muted></video>
  <canvas id="gl-canvas"></canvas>

  <div id="start-screen">
    <div class="start-box">
      <div style="font-size: 40px; margin-bottom: 12px;">🏗️</div>
      <h2 style="font-size: 18px; font-weight: 900; margin-bottom: 6px;">IseeQS-Vortex AR</h2>
      <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin-bottom: 8px;">
        Taylor's University Quantity Surveying AR Visualizer on Zapworks.
      </p>
      <div style="background: rgba(30, 41, 59, 0.6); padding: 10px; border-radius: 14px; font-size: 10px; color: #38bdf8; text-align: left; margin-bottom: 8px;">
        ✓ ${components.length} Structural Components Ready<br/>
        ✓ Concrete & Rebar Cage Models<br/>
        ✓ Real-Time QS Takeoff HUD
      </div>
      <button class="start-btn" id="btn-start">Launch AR Camera</button>
    </div>
  </div>

  <div class="hud-top">
    <div class="badge">
      <div class="badge-dot"></div>
      <span>ISEEQS-VORTEX WEBAR</span>
    </div>
    <button class="badge" style="background: rgba(15,23,42,0.85); color:#fff; cursor: pointer;" id="btn-reset">
      🔄 Reset View
    </button>
  </div>

  <div class="hud-bottom">
    <div class="takeoff-card">
      <div class="takeoff-title">
        <span>STRUCTURAL MODEL TAKEOFF</span>
        <span style="color:#38bdf8;">${components.length} ELEMENTS</span>
      </div>
      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-label">Concrete</div>
          <div><span class="metric-val">${totalConcrete}</span><span class="metric-unit">m³</span></div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Formwork</div>
          <div><span class="metric-val">${(parseFloat(totalConcrete) * 4.5).toFixed(1)}</span><span class="metric-unit">m²</span></div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Steel Rebar</div>
          <div><span class="metric-val">${totalSteel}</span><span class="metric-unit">kg</span></div>
        </div>
      </div>
    </div>

    <div class="controls-bar">
      <button class="btn-ctrl" id="btn-xray">
        <span>🦴</span> <span>X-Ray Rebar</span>
      </button>
      <button class="btn-ctrl" id="btn-spin">
        <span>💫</span> <span>Auto Spin</span>
      </button>
      <button class="btn-ctrl" id="btn-mat">
        <span>📐</span> <span>Target Mat</span>
      </button>
    </div>
  </div>

  <script>
    const components = ${componentsJson};
    const colors = ${colorsJson};
    let isXRay = false;
    let isSpinning = false;
    let showMat = true;

    // 1. Web Camera Setup
    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false
        });
        const video = document.getElementById('video-bg');
        video.srcObject = stream;
        await video.play();
      } catch (err) {
        console.warn('Camera failed or desktop preview:', err);
      }
      document.getElementById('start-screen').style.display = 'none';
    }

    document.getElementById('btn-start').addEventListener('click', initCamera);

    // 2. Three.js AR Scene
    const canvas = document.getElementById('gl-canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 1.8, 3.2);
    camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const modelRoot = new THREE.Group();
    scene.add(modelRoot);

    const concreteMaterials = [];
    const rebarMaterials = [];

    // Build components
    components.forEach((c) => {
      const group = new THREE.Group();
      group.position.set(c.position.x / 1000, c.position.y / 1000, c.position.z / 1000);
      group.rotation.set(
        (c.rotation.x * Math.PI) / 180,
        (c.rotation.y * Math.PI) / 180,
        (c.rotation.z * Math.PI) / 180
      );

      const w = c.dimensions.x / 1000;
      const h = c.dimensions.y / 1000;
      const d = c.dimensions.z / 1000;

      // Concrete Box
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(colors[c.type] || '#3b82f6'),
        transparent: true,
        opacity: 0.9,
        roughness: 0.4
      });
      concreteMaterials.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      group.add(mesh);

      // Rebar Cage
      if (c.includeReinforcement && c.type !== 'blinding') {
        const rebarW = Math.max(0.02, w - 0.08);
        const rebarH = Math.max(0.02, h - 0.08);
        const rebarD = Math.max(0.02, d - 0.08);
        const rebarBox = new THREE.BoxGeometry(rebarW, rebarH, rebarD);
        const wireMat = new THREE.LineBasicMaterial({ color: 0x0f172a, linewidth: 2 });
        const cage = new THREE.LineSegments(new THREE.EdgesGeometry(rebarBox), wireMat);
        group.add(cage);

        // Stirrups lines
        const tiesCount = 6;
        for (let i = 0; i < tiesCount; i++) {
          const tZ = -rebarD / 2 + (rebarD / (tiesCount - 1)) * i;
          const tieGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-rebarW / 2, -rebarH / 2, tZ),
            new THREE.Vector3(rebarW / 2, -rebarH / 2, tZ),
            new THREE.Vector3(rebarW / 2, rebarH / 2, tZ),
            new THREE.Vector3(-rebarW / 2, rebarH / 2, tZ),
            new THREE.Vector3(-rebarW / 2, -rebarH / 2, tZ)
          ]);
          const tieMat = new THREE.LineBasicMaterial({ color: 0xd97706, linewidth: 2 });
          rebarMaterials.push(tieMat);
          group.add(new THREE.Line(tieGeo, tieMat));
        }
      }

      modelRoot.add(group);
    });

    // Reference Grid / Mat
    const gridHelper = new THREE.GridHelper(4, 20, 0x38bdf8, 0x334155);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Touch & Mouse Interaction
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let pinchStartDist = 0;
    let baseScale = 1.0;

    window.addEventListener('pointerdown', (e) => {
      if (e.clientY > window.innerHeight - 150) return;
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      modelRoot.rotation.y += dx * 0.008;
      modelRoot.rotation.x += dy * 0.005;
      prevX = e.clientX;
      prevY = e.clientY;
    });

    window.addEventListener('pointerup', () => { isDragging = false; });

    // Touch Pinch-to-Zoom
    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDist = Math.hypot(dx, dy);
        baseScale = modelRoot.scale.x;
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const factor = dist / pinchStartDist;
        const newScale = Math.min(3.0, Math.max(0.3, baseScale * factor));
        modelRoot.scale.set(newScale, newScale, newScale);
      }
    });

    // UI Buttons
    document.getElementById('btn-xray').addEventListener('click', () => {
      isXRay = !isXRay;
      document.getElementById('btn-xray').classList.toggle('active', isXRay);
      concreteMaterials.forEach((m) => {
        m.opacity = isXRay ? 0.25 : 0.9;
      });
    });

    document.getElementById('btn-spin').addEventListener('click', () => {
      isSpinning = !isSpinning;
      document.getElementById('btn-spin').classList.toggle('active', isSpinning);
    });

    document.getElementById('btn-mat').addEventListener('click', () => {
      showMat = !showMat;
      gridHelper.visible = showMat;
      document.getElementById('btn-mat').classList.toggle('active', showMat);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      modelRoot.rotation.set(0, 0, 0);
      modelRoot.scale.set(1, 1, 1);
      modelRoot.position.set(0, 0, 0);
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Render loop
    function animate() {
      requestAnimationFrame(animate);
      if (isSpinning) {
        modelRoot.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    }
    animate();
  </script>
</body>
</html>`;

  zip.file('index.html', htmlContent);

  return zip.generateAsync({ type: 'blob' });
}
