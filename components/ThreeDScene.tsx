import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { ProjectComponent } from '../types';
import { COMPONENT_COLORS } from '../constants';

interface ThreeDSceneProps {
  components: ProjectComponent[];
  selectedCompId: string | null;
  onSelectComp: (id: string | null) => void;
  onUpdateComponent?: (id: string, updates: Partial<ProjectComponent>) => void;
  zoom: number;
  onZoomChange?: (newZoom: number) => void;
  opacity: number;
  tilt: number;
  rotate: number;
  onRotationChange?: (tilt: number, rotate: number) => void;
  drawingUrl?: string | null;
  showGizmos?: boolean;
  snapEnabled?: boolean;
  snapGridSize?: number;
  onSnapToggle?: (enabled: boolean) => void;
  onSnapGridSizeChange?: (size: number) => void;
  dxfLines?: Array<{ x1: number; y1: number; x2: number; y2: number; layer?: string; color?: string }>;
}

type DragAxis = 'x' | 'y' | 'z' | null;

// Helper: Create a canvas sprite text badge (for X, Y, Z labels)
function createAxisLabelSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(32, 32, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 33);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(130, 130, 1);
  return sprite;
}

/**
 * Builds a single, interactive Unity-style 3D Transform Gizmo:
 * - Red Arrow = X Axis (Lateral X)
 * - Green Arrow = Y Axis (Lateral Y)
 * - Blue Arrow = Z Axis (Elevation Z)
 */
function createInteractiveTransformGizmo(
  w: number,
  h: number,
  d: number,
  hoveredAxis: DragAxis,
  activeAxis: DragAxis
): THREE.Group {
  const gizmoGroup = new THREE.Group();
  gizmoGroup.name = 'transform-gizmo';

  const baseScale = Math.max(240, Math.min(Math.max(w, h, d) * 0.45, 480));
  const armLen = baseScale * 1.25;
  const stemRadius = 14;
  const coneRadius = 32;
  const coneHeight = 70;
  const hitRadius = 60; // Generous hit-testing volume for effortless grabbing

  // Unity Colors: X=Red, Y=Green, Z=Blue (with highlight on hover/active)
  const colorX = activeAxis === 'x' ? 0xfef08a : hoveredAxis === 'x' ? 0xfca5a5 : 0xef4444;
  const colorY = activeAxis === 'y' ? 0xfef08a : hoveredAxis === 'y' ? 0x86efac : 0x22c55e;
  const colorZ = activeAxis === 'z' ? 0xfef08a : hoveredAxis === 'z' ? 0x93c5fd : 0x3b82f6;

  const makeMat = (color: number) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.25,
      metalness: 0.2,
      depthTest: false,
    });

  // Invisible material for hit-testing cylinders (must be visible: true with 0 opacity so Raycaster detects it)
  const hitMat = new THREE.MeshBasicMaterial({
    visible: true,
    transparent: true,
    opacity: 0.001,
    depthTest: false,
    depthWrite: false,
  });
  hitMat.userData = { isHitMat: true };

  // 1. Center Pivot Sphere
  const centerGeo = new THREE.SphereGeometry(stemRadius * 1.9, 16, 16);
  const centerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.2,
    metalness: 0.5,
    depthTest: false,
  });
  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  centerMesh.name = 'gizmo-center';
  gizmoGroup.add(centerMesh);

  // 2. X Axis (RED) - points along +X
  const xArm = new THREE.Group();
  xArm.name = 'gizmo-axis-x';
  const xStemGeo = new THREE.CylinderGeometry(stemRadius, stemRadius, armLen, 16);
  const xStemMesh = new THREE.Mesh(xStemGeo, makeMat(colorX));
  xStemMesh.position.y = armLen / 2;
  xStemMesh.name = 'gizmo-axis-x';
  xArm.add(xStemMesh);

  const xConeGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 16);
  const xConeMesh = new THREE.Mesh(xConeGeo, makeMat(colorX));
  xConeMesh.position.y = armLen + coneHeight / 2;
  xConeMesh.name = 'gizmo-axis-x';
  xArm.add(xConeMesh);

  const xHitGeo = new THREE.CylinderGeometry(hitRadius, hitRadius, armLen + coneHeight + 60, 8);
  const xHitMesh = new THREE.Mesh(xHitGeo, hitMat);
  xHitMesh.position.y = (armLen + coneHeight) / 2;
  xHitMesh.name = 'gizmo-axis-x';
  xArm.add(xHitMesh);

  const xLabel = createAxisLabelSprite('X', '#ef4444');
  xLabel.position.y = armLen + coneHeight + 60;
  xLabel.name = 'gizmo-axis-x';
  xArm.add(xLabel);

  // Align to +X
  xArm.rotation.z = -Math.PI / 2;
  gizmoGroup.add(xArm);

  // 3. Y Axis (GREEN) - points along +Y
  const yArm = new THREE.Group();
  yArm.name = 'gizmo-axis-y';
  const yStemGeo = new THREE.CylinderGeometry(stemRadius, stemRadius, armLen, 16);
  const yStemMesh = new THREE.Mesh(yStemGeo, makeMat(colorY));
  yStemMesh.position.y = armLen / 2;
  yStemMesh.name = 'gizmo-axis-y';
  yArm.add(yStemMesh);

  const yConeGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 16);
  const yConeMesh = new THREE.Mesh(yConeGeo, makeMat(colorY));
  yConeMesh.position.y = armLen + coneHeight / 2;
  yConeMesh.name = 'gizmo-axis-y';
  yArm.add(yConeMesh);

  const yHitGeo = new THREE.CylinderGeometry(hitRadius, hitRadius, armLen + coneHeight + 60, 8);
  const yHitMesh = new THREE.Mesh(yHitGeo, hitMat);
  yHitMesh.position.y = (armLen + coneHeight) / 2;
  yHitMesh.name = 'gizmo-axis-y';
  yArm.add(yHitMesh);

  const yLabel = createAxisLabelSprite('Y', '#22c55e');
  yLabel.position.y = armLen + coneHeight + 60;
  yLabel.name = 'gizmo-axis-y';
  yArm.add(yLabel);

  // Align to +Y
  yArm.rotation.set(0, 0, 0);
  gizmoGroup.add(yArm);

  // 4. Z Axis (BLUE) - points along +Z (Elevation Up)
  const zArm = new THREE.Group();
  zArm.name = 'gizmo-axis-z';
  const zStemGeo = new THREE.CylinderGeometry(stemRadius * 1.25, stemRadius * 1.25, armLen * 1.15, 16);
  const zStemMesh = new THREE.Mesh(zStemGeo, makeMat(colorZ));
  zStemMesh.position.y = (armLen * 1.15) / 2;
  zStemMesh.name = 'gizmo-axis-z';
  zArm.add(zStemMesh);

  const zConeGeo = new THREE.ConeGeometry(coneRadius * 1.25, coneHeight * 1.25, 16);
  const zConeMesh = new THREE.Mesh(zConeGeo, makeMat(colorZ));
  zConeMesh.position.y = (armLen * 1.15) + (coneHeight * 1.25) / 2;
  zConeMesh.name = 'gizmo-axis-z';
  zArm.add(zConeMesh);

  // Extra-generous 3D hit cylinder for effortless grabbing on Z
  const zHitGeo = new THREE.CylinderGeometry(hitRadius * 2.2, hitRadius * 2.2, armLen * 1.25 + coneHeight * 1.5 + 160, 12);
  const zHitMesh = new THREE.Mesh(zHitGeo, hitMat);
  zHitMesh.position.y = (armLen * 1.15 + coneHeight) / 2;
  zHitMesh.name = 'gizmo-axis-z';
  zArm.add(zHitMesh);

  const zLabel = createAxisLabelSprite('Z ▲', '#2563eb');
  zLabel.position.y = (armLen * 1.15) + coneHeight * 1.25 + 75;
  zLabel.name = 'gizmo-axis-z';
  zArm.add(zLabel);

  // Align to +Z (Vertical Elevation)
  zArm.rotation.set(Math.PI / 2, 0, 0);
  gizmoGroup.add(zArm);

  return gizmoGroup;
}

const BASE_CAMERA_DISTANCE = 4200;

export const ThreeDScene: React.FC<ThreeDSceneProps> = ({
  components,
  selectedCompId,
  onSelectComp,
  onUpdateComponent,
  zoom,
  onZoomChange,
  opacity,
  tilt,
  rotate,
  onRotationChange,
  drawingUrl,
  showGizmos = true,
  snapEnabled = true,
  snapGridSize = 100,
  onSnapToggle,
  onSnapGridSizeChange,
  dxfLines = []
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const worldGroupRef = useRef<THREE.Group | null>(null);
  const drawingMeshRef = useRef<THREE.Mesh | null>(null);
  const dxfGroupRef = useRef<THREE.Group | null>(null);
  const meshesMapRef = useRef<Map<string, THREE.Group>>(new Map());

  // Camera Orbit & Pan State
  const targetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 200));
  const distanceRef = useRef<number>(BASE_CAMERA_DISTANCE / Math.max(0.05, zoom));
  const sphericalRef = useRef<{ theta: number; phi: number }>({
    theta: (rotate * Math.PI) / 180,
    phi: ((90 - Math.min(88, Math.max(2, tilt))) * Math.PI) / 180,
  });

  // Active Tool state: 'select' (default), 'orbit', 'pan'
  const [activeTool, setActiveTool] = useState<'select' | 'orbit' | 'pan'>('select');

  // Interaction States
  const activePointerAction = useRef<'none' | 'orbit' | 'pan' | 'select' | 'gizmo-drag' | 'component-drag'>('none');
  const prevPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDownTarget = useRef<'background' | 'gizmo' | 'component'>('background');
  const dragTargetCompId = useRef<string | null>(null);
  const dragStartPlaneHit = useRef<THREE.Vector3 | null>(null);

  // Gizmo dragging state
  const activeDragAxis = useRef<DragAxis>(null);
  const [hoveredGizmoAxis, setHoveredGizmoAxis] = useState<DragAxis>(null);
  const [activeGizmoAxisState, setActiveGizmoAxisState] = useState<DragAxis>(null);
  const [dragLiveInfo, setDragLiveInfo] = useState<{ axis: string; val: number; delta: number; snapped: boolean } | null>(null);

  const dragStartDimensions = useRef<{ x: number; y: number; z: number }>({ x: 1000, y: 1000, z: 400 });
  const dragStartPosition = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [gizmoMode, setGizmoMode] = useState<'move' | 'scale'>('move');

  // Local Snapping state
  const [localSnap, setLocalSnap] = useState(snapEnabled);
  const [localGridSize, setLocalGridSize] = useState(snapGridSize);

  useEffect(() => {
    setLocalSnap(snapEnabled);
  }, [snapEnabled]);

  useEffect(() => {
    setLocalGridSize(snapGridSize);
  }, [snapGridSize]);

  // Sync zoom prop to camera distance
  useEffect(() => {
    const desiredDistance = BASE_CAMERA_DISTANCE / Math.max(0.05, zoom);
    if (Math.abs(distanceRef.current - desiredDistance) > 10) {
      distanceRef.current = desiredDistance;
      updateCameraTransform();
    }
  }, [zoom]);

  // Sync tilt and rotate props from toolbar sliders
  useEffect(() => {
    const desiredTheta = (rotate * Math.PI) / 180;
    const clampedTilt = Math.min(88, Math.max(2, tilt));
    const desiredPhi = ((90 - clampedTilt) * Math.PI) / 180;

    sphericalRef.current.theta = desiredTheta;
    sphericalRef.current.phi = desiredPhi;
    updateCameraTransform();
  }, [tilt, rotate]);

  // Update Opacity in real time on existing mesh materials without tearing down scene
  useEffect(() => {
    meshesMapRef.current.forEach((compGroup, compId) => {
      const isSelected = selectedCompId === compId;
      const targetOpacity = isSelected ? Math.min(1.0, opacity + 0.15) : opacity;

      compGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && child.name.startsWith('mesh-')) {
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.transparent = true;
            child.material.opacity = targetOpacity;
            child.material.depthWrite = targetOpacity > 0.85;
            child.material.needsUpdate = true;
          }
        }
      });
    });
  }, [opacity, selectedCompId]);

  // Helper: Update camera position and orientation from target, distance, spherical angles
  const updateCameraTransform = useCallback(() => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const target = targetRef.current;
    const distance = distanceRef.current;
    const { theta, phi } = sphericalRef.current;

    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    camera.position.set(
      target.x + distance * sinPhi * sinTheta,
      target.y - distance * sinPhi * cosTheta,
      target.z + distance * cosPhi
    );
    camera.up.set(0, 0, 1);
    camera.lookAt(target);
  }, []);

  // Initial Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 10, 80000);
    camera.up.set(0, 0, 1);
    cameraRef.current = camera;
    updateCameraTransform();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 0.5);
    hemiLight.position.set(0, 0, 5000);
    scene.add(hemiLight);

    const mainSun = new THREE.DirectionalLight(0xffffff, 1.0);
    mainSun.position.set(3000, -3500, 5000);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 2048;
    mainSun.shadow.mapSize.height = 2048;
    mainSun.shadow.camera.near = 500;
    mainSun.shadow.camera.far = 15000;
    mainSun.shadow.camera.left = -4000;
    mainSun.shadow.camera.right = 4000;
    mainSun.shadow.camera.top = 4000;
    mainSun.shadow.camera.bottom = -4000;
    mainSun.shadow.bias = -0.0005;
    scene.add(mainSun);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.35);
    fillLight.position.set(-3000, 3500, 3000);
    scene.add(fillLight);

    // 5. Grid Helper (XY Ground Plane)
    const gridHelper = new THREE.GridHelper(12000, 60, 0x64748b, 0xcfd8dc);
    gridHelper.rotation.x = Math.PI / 2;
    gridHelper.position.z = 0;
    scene.add(gridHelper);

    // Minor ground plane with shadow receiver
    const groundGeo = new THREE.PlaneGeometry(16000, 16000);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    groundMesh.position.z = -1;
    scene.add(groundMesh);

    // 6. World Group for Components
    const worldGroup = new THREE.Group();
    scene.add(worldGroup);
    worldGroupRef.current = worldGroup;

    // DXF Lines Group
    const dxfGroup = new THREE.Group();
    scene.add(dxfGroup);
    dxfGroupRef.current = dxfGroup;

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      updateCameraTransform();
      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [updateCameraTransform]);

  // Update Drawing Texture Plane
  useEffect(() => {
    if (!worldGroupRef.current) return;
    const group = worldGroupRef.current;

    if (drawingMeshRef.current) {
      group.remove(drawingMeshRef.current);
      drawingMeshRef.current.geometry.dispose();
      drawingMeshRef.current = null;
    }

    if (drawingUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(
        drawingUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          const planeGeo = new THREE.PlaneGeometry(4000, 3000);
          const planeMat = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            opacity: 0.88,
            side: THREE.DoubleSide,
            roughness: 0.8,
          });
          const mesh = new THREE.Mesh(planeGeo, planeMat);
          mesh.position.set(0, 0, 1);
          mesh.receiveShadow = true;
          group.add(mesh);
          drawingMeshRef.current = mesh;
        },
        undefined,
        (err) => console.error('Failed to load drawing texture', err)
      );
    }
  }, [drawingUrl]);

  // Render DXF Vector Linework on Ground Plane
  useEffect(() => {
    if (!dxfGroupRef.current) return;
    const dxfGrp = dxfGroupRef.current;

    // Clear old lines
    while (dxfGrp.children.length > 0) {
      const obj = dxfGrp.children[0];
      dxfGrp.remove(obj);
      if (obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
      }
    }

    if (dxfLines && dxfLines.length > 0) {
      const lineMat = new THREE.LineBasicMaterial({ color: 0x2563eb, linewidth: 2 });
      const points: THREE.Vector3[] = [];
      dxfLines.forEach((l) => {
        points.push(new THREE.Vector3(l.x1, l.y1, 2));
        points.push(new THREE.Vector3(l.x2, l.y2, 2));
      });
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const segs = new THREE.LineSegments(geo, lineMat);
      dxfGrp.add(segs);
    }
  }, [dxfLines]);

  // Update 3D Component Meshes & Transform Gizmo
  useEffect(() => {
    if (!worldGroupRef.current) return;
    const group = worldGroupRef.current;

    // Clean existing component meshes
    meshesMapRef.current.forEach((compGroup) => {
      group.remove(compGroup);
      compGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material?.dispose();
        }
      });
    });
    meshesMapRef.current.clear();

    components.forEach((comp) => {
      const compGroup = new THREE.Group();
      compGroup.name = comp.id;

      const { x: w, y: h, z: d } = comp.dimensions;
      const baseHex = COMPONENT_COLORS[comp.type] || '#3b82f6';
      const isSelected = !!selectedCompId && comp.id === selectedCompId;
      const targetOpacity = isSelected ? Math.min(1.0, opacity + 0.15) : opacity;

      // 1. Solid Box Geometry
      const boxGeo = new THREE.BoxGeometry(w, h, d);
      const boxMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseHex),
        roughness: 0.35,
        metalness: 0.15,
        transparent: true,
        opacity: targetOpacity,
        depthWrite: targetOpacity > 0.85,
      });

      const boxMesh = new THREE.Mesh(boxGeo, boxMat);
      boxMesh.castShadow = true;
      boxMesh.receiveShadow = true;
      boxMesh.name = `mesh-${comp.id}`;
      compGroup.add(boxMesh);

      // 2. Edges / Wireframe Outlines
      const edgesGeo = new THREE.EdgesGeometry(boxGeo);
      const edgeColor = isSelected ? 0xffffff : 0x0f172a;
      const edgeMat = new THREE.LineBasicMaterial({
        color: edgeColor,
        linewidth: isSelected ? 2.5 : 1,
      });
      const edgesMesh = new THREE.LineSegments(edgesGeo, edgeMat);
      compGroup.add(edgesMesh);

      // 3. Selection Highlight Frame
      if (isSelected) {
        const selGeo = new THREE.BoxGeometry(w + 20, h + 20, d + 20);
        const selEdges = new THREE.EdgesGeometry(selGeo);
        const selLine = new THREE.LineSegments(
          selEdges,
          new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 2 })
        );
        compGroup.add(selLine);

        // 4. ONLY ATTACH GIZMO TO SELECTED COMPONENT
        if (showGizmos) {
          const gizmo = createInteractiveTransformGizmo(
            w,
            h,
            d,
            hoveredGizmoAxis,
            activeGizmoAxisState
          );
          compGroup.add(gizmo);
        }
      }

      // 5. Reinforcement cage: longitudinal bars + ties/stirrups, matches QS bar schedule rules
      if (comp.includeReinforcement && comp.type !== 'blinding') {
        const rebarGroup = new THREE.Group();
        const dia = comp.rebarConfig?.diameterMm || 12;
        const cover = comp.rebarConfig?.coverMm || 40;
        const spacing = comp.rebarConfig?.spacingMm || 150;
        const barR = Math.max(1.5, dia / 2);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x9099a6, metalness: 0.6, roughness: 0.35 });
        const tieMat = new THREE.LineBasicMaterial({ color: 0x5b6270 });

        const addBar = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => {
          const a = new THREE.Vector3(x1, y1, z1);
          const b = new THREE.Vector3(x2, y2, z2);
          const len = a.distanceTo(b);
          if (len < 1) return;
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, len, 6), barMat);
          bar.position.copy(a).lerp(b, 0.5);
          bar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
          rebarGroup.add(bar);
        };

        const addTie = (pts: THREE.Vector3[], mat: THREE.LineBasicMaterial = tieMat) => {
          rebarGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
        };

        const ew = Math.max(20, w - 2 * cover);
        const eh = Math.max(20, h - 2 * cover);
        const ed = Math.max(20, d - 2 * cover);
        if (comp.type === 'stump' || comp.type === 'column') {
          const barCount = (w >= 400 || h >= 400) ? 8 : 4;
          let corners: [number, number][] = [
            [-ew / 2, -eh / 2],
            [ew / 2, -eh / 2],
            [ew / 2, eh / 2],
            [-ew / 2, eh / 2],
          ];
          if (barCount === 8) {
            corners = corners.concat([
              [0, -eh / 2],
              [0, eh / 2],
              [-ew / 2, 0],
              [ew / 2, 0],
            ]);
          }
          corners.forEach(([cx, cy]) => addBar(cx, cy, -ed / 2 + 20, cx, cy, ed / 2 - 20));

          const critZoneLen = Math.min(ed / 3, Math.max(w, h, 450));
          const tightSp = Math.max(50, spacing / 2);
          const zones: { from: number; to: number; sp: number; color: number }[] = [
            { from: -ed / 2, to: -ed / 2 + critZoneLen, sp: tightSp, color: 0xf4c542 },
            { from: -ed / 2 + critZoneLen, to: ed / 2 - critZoneLen, sp: spacing, color: 0x58d68d },
            { from: ed / 2 - critZoneLen, to: ed / 2, sp: tightSp, color: 0xf4c542 },
          ];

          zones.forEach((zone) => {
            const zoneMat = new THREE.LineBasicMaterial({ color: zone.color });
            const zLen = Math.max(1, zone.to - zone.from);
            const n = Math.max(1, Math.floor(zLen / zone.sp));
            for (let i = 0; i <= n; i++) {
              const z = zone.from + (zLen / n) * i;
              addTie([
                new THREE.Vector3(-ew / 2, -eh / 2, z),
                new THREE.Vector3(ew / 2, -eh / 2, z),
                new THREE.Vector3(ew / 2, eh / 2, z),
                new THREE.Vector3(-ew / 2, eh / 2, z),
                new THREE.Vector3(-ew / 2, -eh / 2, z),
              ], zoneMat);
            }
          });
        } else if (comp.type === 'ground-beam' || comp.type === 'floor-beam') {
          [-ed / 2, ed / 2].forEach((cz) => {
            addBar(-w / 2 + 20, -eh / 2, cz, w / 2 - 20, -eh / 2, cz);
            addBar(-w / 2 + 20, eh / 2, cz, w / 2 - 20, eh / 2, cz);
          });
          const stirrupCount = Math.max(2, Math.floor(ew / spacing));
          for (let i = 0; i <= stirrupCount; i++) {
            const x = -ew / 2 + (ew / stirrupCount) * i;
            addTie([
              new THREE.Vector3(x, -eh / 2, -ed / 2),
              new THREE.Vector3(x, eh / 2, -ed / 2),
              new THREE.Vector3(x, eh / 2, ed / 2),
              new THREE.Vector3(x, -eh / 2, ed / 2),
              new THREE.Vector3(x, -eh / 2, -ed / 2),
            ]);
          }
        } else if (comp.type === 'slab' || comp.type === 'ground-slab') {
          // --- REALISTIC SLAB REINFORCEMENT (Matches actual site practice & bar schedules) ---
          // Two-way orthogonal rebar mesh spanning horizontally in X and Y
          const stepX = Math.max(100, spacing);
          const stepY = Math.max(100, spacing);
          const runsX = Math.max(2, Math.floor(ew / stepX));
          const runsY = Math.max(2, Math.floor(eh / stepY));

          // 1. BOTTOM MAT (B1 & B2)
          // B1: Bottom layer running in X (spanning across supports)
          const zB1 = -d / 2 + cover + barR;
          // B2: Perpendicular layer running in Y, resting on top of B1
          const zB2 = zB1 + dia;

          // Add B1 bars (running in X from -ew/2 to ew/2 at each Y position)
          for (let i = 0; i <= runsY; i++) {
            const y = -eh / 2 + (eh / runsY) * i;
            addBar(-ew / 2, y, zB1, ew / 2, y, zB1);
          }

          // Add B2 bars (running in Y from -eh/2 to eh/2 at each X position)
          for (let i = 0; i <= runsX; i++) {
            const x = -ew / 2 + (ew / runsX) * i;
            addBar(x, -eh / 2, zB2, x, eh / 2, zB2);
          }

          // 2. TOP MAT (T1 & T2) for suspended slabs or slabs with thickness >= 130mm
          const isSuspendedOrThick = comp.type === 'slab' || d >= 130;
          const zT1 = d / 2 - cover - barR; // Top-most layer running in X
          const zT2 = zT1 - dia;             // Layer just below T1 running in Y

          if (isSuspendedOrThick && zT2 > zB2 + 20) {
            // T2 bars (running in Y at each X position)
            for (let i = 0; i <= runsX; i++) {
              const x = -ew / 2 + (ew / runsX) * i;
              addBar(x, -eh / 2, zT2, x, eh / 2, zT2);
            }

            // T1 bars (running in X at each Y position)
            for (let i = 0; i <= runsY; i++) {
              const y = -eh / 2 + (eh / runsY) * i;
              addBar(-ew / 2, y, zT1, ew / 2, y, zT1);
            }

            // 3. REBAR CHAIRS / SPACER STOOLS (Holding top mat above bottom mat)
            // As shown in actual construction: wire spacer chairs distributed across slab
            const chairSpacing = 900;
            const chairCols = Math.max(1, Math.floor(ew / chairSpacing));
            const chairRows = Math.max(1, Math.floor(eh / chairSpacing));
            const chairMat = new THREE.LineBasicMaterial({ color: 0x94a3b8 });

            for (let r = 1; r <= chairRows; r++) {
              const cy = -eh / 2 + (eh / (chairRows + 1)) * r;
              for (let c = 1; c <= chairCols; c++) {
                const cx = -ew / 2 + (ew / (chairCols + 1)) * c;
                // Form a 3D rebar chair stool: base feet, riser legs, top cradle
                const chairPts = [
                  new THREE.Vector3(cx - 35, cy - 25, zB1),
                  new THREE.Vector3(cx - 20, cy, zB1),
                  new THREE.Vector3(cx - 12, cy, zT2),
                  new THREE.Vector3(cx + 12, cy, zT2),
                  new THREE.Vector3(cx + 20, cy, zB1),
                  new THREE.Vector3(cx + 35, cy + 25, zB1),
                ];
                rebarGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(chairPts), chairMat));
              }
            }

            // 4. PERIMETER U-BARS / EDGE HAIRPIN TIES (Trimming open slab boundaries)
            const uBarMat = new THREE.LineBasicMaterial({ color: 0x64748b });
            const uStep = Math.max(stepX, 300);
            const uCountX = Math.max(2, Math.floor(ew / uStep));
            const uCountY = Math.max(2, Math.floor(eh / uStep));

            // Along X edges (front and back)
            for (let i = 0; i <= uCountX; i++) {
              const x = -ew / 2 + (ew / uCountX) * i;
              // Front edge U-bar
              rebarGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, -eh / 2 + 100, zT1),
                new THREE.Vector3(x, -eh / 2, zT1),
                new THREE.Vector3(x, -eh / 2, zB1),
                new THREE.Vector3(x, -eh / 2 + 100, zB1),
              ]), uBarMat));
              // Back edge U-bar
              rebarGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, eh / 2 - 100, zT1),
                new THREE.Vector3(x, eh / 2, zT1),
                new THREE.Vector3(x, eh / 2, zB1),
                new THREE.Vector3(x, eh / 2 - 100, zB1),
              ]), uBarMat));
            }

            // Along Y edges (left and right)
            for (let j = 0; j <= uCountY; j++) {
              const y = -eh / 2 + (eh / uCountY) * j;
              // Left edge U-bar
              rebarGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-ew / 2 + 100, y, zT2),
                new THREE.Vector3(-ew / 2, y, zT2),
                new THREE.Vector3(-ew / 2, y, zB2),
                new THREE.Vector3(-ew / 2 + 100, y, zB2),
              ]), uBarMat));
              // Right edge U-bar
              rebarGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(ew / 2 - 100, y, zT2),
                new THREE.Vector3(ew / 2, y, zT2),
                new THREE.Vector3(ew / 2, y, zB2),
                new THREE.Vector3(ew / 2 - 100, y, zB2),
              ]), uBarMat));
            }
          }
        } else if (comp.type === 'pad-footing') {
          // --- PAD FOOTING REINFORCEMENT ---
          // Bottom two-way orthogonal mesh with upward end hooks (90 deg) + Column starter dowels
          const stepX = Math.max(100, spacing);
          const stepY = Math.max(100, spacing);
          const runsX = Math.max(2, Math.floor(ew / stepX));
          const runsY = Math.max(2, Math.floor(eh / stepY));
          const hookH = Math.min(180, Math.max(60, ed * 0.45));
          const zB1 = -d / 2 + cover + barR;
          const zB2 = zB1 + dia;

          // B1 Bars with upward end hooks
          for (let i = 0; i <= runsY; i++) {
            const y = -eh / 2 + (eh / runsY) * i;
            addBar(-ew / 2, y, zB1, ew / 2, y, zB1);
            addBar(-ew / 2, y, zB1, -ew / 2, y, zB1 + hookH);
            addBar(ew / 2, y, zB1, ew / 2, y, zB1 + hookH);
          }

          // B2 Bars with upward end hooks
          for (let i = 0; i <= runsX; i++) {
            const x = -ew / 2 + (ew / runsX) * i;
            addBar(x, -eh / 2, zB2, x, eh / 2, zB2);
            addBar(x, -eh / 2, zB2, x, -eh / 2, zB2 + hookH);
            addBar(x, eh / 2, zB2, x, eh / 2, zB2 + hookH);
          }

          // Column starter bars (lap dowels) shooting up from bottom mesh through top of footing
          const dowelSpread = Math.min(180, Math.max(80, ew * 0.25));
          const dowelCorners: [number, number][] = [
            [-dowelSpread, -dowelSpread],
            [dowelSpread, -dowelSpread],
            [dowelSpread, dowelSpread],
            [-dowelSpread, dowelSpread],
          ];
          const dowelTopZ = d / 2 + 300; // Projects 300mm above footing for column lap
          dowelCorners.forEach(([dx, dy]) => {
            // Vertical starter bar
            addBar(dx, dy, zB1, dx, dy, dowelTopZ);
            // Footing bend hook at bottom
            addBar(dx, dy, zB1, dx + (dx > 0 ? 80 : -80), dy, zB1);
          });
          // Starter tie holding the 4 dowel bars
          addTie([
            new THREE.Vector3(-dowelSpread, -dowelSpread, d / 2 + 100),
            new THREE.Vector3(dowelSpread, -dowelSpread, d / 2 + 100),
            new THREE.Vector3(dowelSpread, dowelSpread, d / 2 + 100),
            new THREE.Vector3(-dowelSpread, dowelSpread, d / 2 + 100),
            new THREE.Vector3(-dowelSpread, -dowelSpread, d / 2 + 100),
          ]);
        } else {
          // --- RETAINING WALL / STRIP FOUNDATION ---
          const stepA = Math.max(100, spacing);
          const runsZ = Math.max(2, Math.floor(ed / stepA));
          const runsX = Math.max(2, Math.floor(ew / stepA));
          const yOffset = eh / 2 - 20;

          // Double curtain of rebar (front and back faces)
          [-yOffset, yOffset].forEach((yPos) => {
            for (let i = 0; i <= runsZ; i++) {
              const z = -ed / 2 + (ed / runsZ) * i;
              addBar(-ew / 2, yPos, z, ew / 2, yPos, z);
            }
            for (let i = 0; i <= runsX; i++) {
              const x = -ew / 2 + (ew / runsX) * i;
              addBar(x, yPos, -ed / 2, x, yPos, ed / 2);
            }
          });
        }
        compGroup.add(rebarGroup);
      }

      // 6. Live Transform (Position & Rotation)
      compGroup.position.set(comp.position.x, comp.position.y, comp.position.z + d / 2);
      compGroup.rotation.x = (comp.rotation.x * Math.PI) / 180;
      compGroup.rotation.y = (comp.rotation.y * Math.PI) / 180;
      compGroup.rotation.z = (comp.rotation.z * Math.PI) / 180;

      group.add(compGroup);
      meshesMapRef.current.set(comp.id, compGroup);
    });
  }, [components, selectedCompId, showGizmos]);

  // Lightweight in-place color update for gizmo handles on hover/active (no mesh teardown)
  useEffect(() => {
    if (!selectedCompId || !showGizmos) return;
    const compGroup = meshesMapRef.current.get(selectedCompId);
    if (!compGroup) return;
    const gizmo = compGroup.getObjectByName('transform-gizmo');
    if (!gizmo) return;

    const colorX = activeGizmoAxisState === 'x' ? 0xfef08a : hoveredGizmoAxis === 'x' ? 0xfca5a5 : 0xef4444;
    const colorY = activeGizmoAxisState === 'y' ? 0xfef08a : hoveredGizmoAxis === 'y' ? 0x86efac : 0x22c55e;
    const colorZ = activeGizmoAxisState === 'z' ? 0xfef08a : hoveredGizmoAxis === 'z' ? 0x93c5fd : 0x3b82f6;

    gizmo.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material && !child.userData?.isHitMat) {
        if (child.name === 'gizmo-axis-x' && 'color' in child.material) {
          (child.material as THREE.MeshStandardMaterial).color.setHex(colorX);
        } else if (child.name === 'gizmo-axis-y' && 'color' in child.material) {
          (child.material as THREE.MeshStandardMaterial).color.setHex(colorY);
        } else if (child.name === 'gizmo-axis-z' && 'color' in child.material) {
          (child.material as THREE.MeshStandardMaterial).color.setHex(colorZ);
        }
      }
    });
  }, [hoveredGizmoAxis, activeGizmoAxisState, selectedCompId, showGizmos]);

  // Raycast and screen-space proximity helper to find gizmo axis under cursor
  const checkGizmoAxisRaycast = (clientX: number, clientY: number): DragAxis => {
    if (!mountRef.current || !cameraRef.current || !worldGroupRef.current || !selectedCompId) return null;
    const rect = mountRef.current.getBoundingClientRect();
    const camera = cameraRef.current;
    const selComp = components.find((c) => c.id === selectedCompId);
    if (!selComp) return null;

    const curD = selComp.dimensions.z;
    const origin3D = new THREE.Vector3(
      selComp.position.x,
      selComp.position.y,
      selComp.position.z + curD / 2
    );

    const baseScale = Math.max(240, Math.min(Math.max(selComp.dimensions.x, selComp.dimensions.y, curD) * 0.45, 480));
    const armLen = baseScale * 1.25;

    const zTip3D = origin3D.clone().add(new THREE.Vector3(0, 0, armLen * 1.15 + 160));
    const xTip3D = origin3D.clone().add(new THREE.Vector3(armLen + 120, 0, 0));
    const yTip3D = origin3D.clone().add(new THREE.Vector3(0, armLen + 120, 0));

    const toScreen = (v3: THREE.Vector3) => {
      const p = v3.clone().project(camera);
      return {
        x: ((p.x + 1) * rect.width) / 2,
        y: ((-p.y + 1) * rect.height) / 2,
        visible: p.z < 1,
      };
    };

    const sOrigin = toScreen(origin3D);
    const sZ = toScreen(zTip3D);
    const sX = toScreen(xTip3D);
    const sY = toScreen(yTip3D);

    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const distToSeg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
      const l2 = (bx - ax) * (bx - ax) + (by - ay) * (by - ay);
      if (l2 < 0.001) return Math.hypot(px - ax, py - ay);
      let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
    };

    // 1. High-precision Screen-Space Proximity Picking (finds closest axis arrow/segment within generous radius)
    let bestAxis: DragAxis = null;
    let bestDist = 56; // Generous 56px radius for easy cursor grabbing

    if (sZ.visible) {
      const distZTip = Math.hypot(mx - sZ.x, my - sZ.y);
      const distZSeg = distToSeg(mx, my, sOrigin.x, sOrigin.y, sZ.x, sZ.y);
      const dZ = Math.min(distZTip, distZSeg);
      // Give Z axis a slightly higher priority if cursor is near it
      if (dZ < bestDist + 10) {
        bestDist = dZ;
        bestAxis = 'z';
      }
    }

    if (sX.visible) {
      const distXTip = Math.hypot(mx - sX.x, my - sX.y);
      const distXSeg = distToSeg(mx, my, sOrigin.x, sOrigin.y, sX.x, sX.y);
      const dX = Math.min(distXTip, distXSeg);
      if (dX < bestDist) {
        bestDist = dX;
        bestAxis = 'x';
      }
    }

    if (sY.visible) {
      const distYTip = Math.hypot(mx - sY.x, my - sY.y);
      const distYSeg = distToSeg(mx, my, sOrigin.x, sOrigin.y, sY.x, sY.y);
      const dY = Math.min(distYTip, distYSeg);
      if (dY < bestDist) {
        bestDist = dY;
        bestAxis = 'y';
      }
    }

    if (bestAxis) return bestAxis;

    // 2. Fallback: Direct 3D Raycasting against gizmo meshes
    const ndcX = (mx / rect.width) * 2 - 1;
    const ndcY = -(my / rect.height) * 2 + 1;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
    const intersects = raycaster.intersectObjects(worldGroupRef.current.children, true);
    for (const hit of intersects) {
      if (hit.object.name === 'gizmo-axis-z') return 'z';
      if (hit.object.name === 'gizmo-axis-x') return 'x';
      if (hit.object.name === 'gizmo-axis-y') return 'y';
    }

    return null;
  };

  // Check if pointer is directly over any component mesh
  const checkComponentRaycast = (clientX: number, clientY: number): string | null => {
    if (!mountRef.current || !cameraRef.current || !worldGroupRef.current) return null;
    const rect = mountRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const intersects = raycaster.intersectObjects(worldGroupRef.current.children, true);
    for (const hit of intersects) {
      if (hit.object.name.startsWith('gizmo-') || hit.object.type === 'Sprite') continue;

      let cur: THREE.Object3D | null = hit.object;
      while (cur && cur.parent && cur.parent !== worldGroupRef.current) {
        cur = cur.parent;
      }
      if (cur && cur.name && !cur.name.startsWith('gizmo-')) {
        return cur.name;
      }
    }
    return null;
  };

  // Helper: Raycast to horizontal plane at given elevation Z
  const getPlaneIntersection = (clientX: number, clientY: number, planeZ: number): THREE.Vector3 | null => {
    if (!mountRef.current || !cameraRef.current) return null;
    const rect = mountRef.current.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);

    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -planeZ);
    const target = new THREE.Vector3();
    const hit = raycaster.ray.intersectPlane(plane, target);
    return hit ? target : null;
  };

  // ==========================================
  // NAVIGATION & COMPONENT DRAGGING ENGINE
  // Left Drag = Move Component (XY plane or XYZ Gizmo)
  // Right Drag = Rotate / Orbit 3D Scene
  // ==========================================

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    prevPointer.current = { x: e.clientX, y: e.clientY };
    pointerStart.current = { x: e.clientX, y: e.clientY };

    // --- 1. RIGHT MOUSE CLICK OR ORBIT TOOL: ROTATION ONLY ---
    if (e.button === 2 || (e.button === 0 && e.altKey) || (e.button === 0 && activeTool === 'orbit')) {
      activePointerAction.current = 'orbit';
      return;
    }

    // --- 2. MIDDLE MOUSE CLICK OR PAN TOOL: PAN ---
    if (e.button === 1 || (e.button === 0 && activeTool === 'pan')) {
      activePointerAction.current = 'pan';
      return;
    }

    // --- 3. LEFT MOUSE CLICK: DRAG COMPONENT (XYZ AXES) ONLY ---
    if (e.button === 0) {
      // 3A. Check if user clicked on a Transform Gizmo Arrow (X=Red, Y=Green, Z=Blue)
      if (selectedCompId && showGizmos) {
        const hitAxis = checkGizmoAxisRaycast(e.clientX, e.clientY);
        if (hitAxis) {
          pointerDownTarget.current = 'gizmo';
          activePointerAction.current = 'gizmo-drag';
          activeDragAxis.current = hitAxis;
          setActiveGizmoAxisState(hitAxis);

          const selComp = components.find((c) => c.id === selectedCompId);
          if (selComp) {
            dragStartDimensions.current = { ...selComp.dimensions };
            dragStartPosition.current = { ...selComp.position };

            const curD = selComp.dimensions.z;
            const origin3D = new THREE.Vector3(
              selComp.position.x,
              selComp.position.y,
              selComp.position.z + curD / 2
            );

            if (cameraRef.current && mountRef.current) {
              const camera = cameraRef.current;
              const rect = mountRef.current.getBoundingClientRect();
              const camDir = new THREE.Vector3().subVectors(camera.position, origin3D);
              const axisVector = new THREE.Vector3(
                hitAxis === 'x' ? 1 : 0,
                hitAxis === 'y' ? 1 : 0,
                hitAxis === 'z' ? 1 : 0
              );
              const side = new THREE.Vector3().crossVectors(camDir, axisVector);
              let planeNormal = new THREE.Vector3().crossVectors(axisVector, side).normalize();
              if (planeNormal.lengthSq() < 0.001) {
                planeNormal = hitAxis === 'z' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
              }
              const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, origin3D);
              const raycaster = new THREE.Raycaster();
              const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
              const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
              raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
              const hitPt = new THREE.Vector3();
              if (raycaster.ray.intersectPlane(plane, hitPt)) {
                dragStartPlaneHit.current = hitPt.clone();
              } else {
                dragStartPlaneHit.current = origin3D.clone();
              }
            }
          }
          return;
        }
      }

      // 3B. Check if user clicked on a Component directly
      const hitCompId = checkComponentRaycast(e.clientX, e.clientY);
      if (hitCompId) {
        const targetComp = components.find((c) => c.id === hitCompId);
        if (targetComp) {
          if (selectedCompId !== hitCompId) {
            onSelectComp(hitCompId);
          }
          pointerDownTarget.current = 'component';
          dragTargetCompId.current = hitCompId;
          dragStartPosition.current = { ...targetComp.position };
          dragStartDimensions.current = { ...targetComp.dimensions };

          const curZ = targetComp.position.z + targetComp.dimensions.z / 2;
          const hitPt = getPlaneIntersection(e.clientX, e.clientY, curZ);
          if (hitPt) {
            dragStartPlaneHit.current = hitPt.clone();
          }
          activePointerAction.current = 'component-drag';
          return;
        }
      }

      // 3C. Clicked on empty space: do NOT orbit (left drag is reserved for components)
      pointerDownTarget.current = 'background';
      activePointerAction.current = 'none';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Hover feedback for gizmo arrows when not actively dragging
    if (activePointerAction.current === 'none') {
      if (selectedCompId && showGizmos) {
        const hitAxis = checkGizmoAxisRaycast(e.clientX, e.clientY);
        if (hitAxis !== hoveredGizmoAxis) {
          setHoveredGizmoAxis(hitAxis);
        }
      } else if (hoveredGizmoAxis !== null) {
        setHoveredGizmoAxis(null);
      }
      return;
    }

    const dx = e.clientX - prevPointer.current.x;
    const dy = e.clientY - prevPointer.current.y;
    prevPointer.current = { x: e.clientX, y: e.clientY };

    // --- CASE A: GIZMO ARROW DRAGGING (Move / Scale along chosen X, Y, or Z axis) ---
    if (activePointerAction.current === 'gizmo-drag' && activeDragAxis.current && selectedCompId) {
      const axis = activeDragAxis.current;
      const compGroup = meshesMapRef.current.get(selectedCompId);
      const camera = cameraRef.current;
      const container = mountRef.current;

      if (compGroup && camera && container) {
        const selComp = components.find((c) => c.id === selectedCompId);
        const curD = selComp ? selComp.dimensions.z : 400;

        const origin3D = new THREE.Vector3(
          dragStartPosition.current.x,
          dragStartPosition.current.y,
          dragStartPosition.current.z + curD / 2
        );

        let deltaMm = 0;

        // Camera-facing plane calculation
        const camDir = new THREE.Vector3().subVectors(camera.position, origin3D);
        const axisVector = new THREE.Vector3(
          axis === 'x' ? 1 : 0,
          axis === 'y' ? 1 : 0,
          axis === 'z' ? 1 : 0
        );
        const side = new THREE.Vector3().crossVectors(camDir, axisVector);
        let planeNormal = new THREE.Vector3().crossVectors(axisVector, side).normalize();
        if (planeNormal.lengthSq() < 0.001) {
          planeNormal = axis === 'z' ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
        }

        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, origin3D);
        const rect = container.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
        const currentHit = new THREE.Vector3();

        const totalMouseDx = e.clientX - pointerStart.current.x;
        const totalMouseDy = e.clientY - pointerStart.current.y;
        const mmPerPixel = (distanceRef.current * 0.0016) / Math.max(0.1, zoom);

        let planeIntersected = false;
        if (axis === 'z') {
          // For vertical Z elevation, screen-space mouse delta (up = elevate, down = lower)
          // is vastly superior and immune to grazing angle singularities at high tilts!
          deltaMm = Math.round(-totalMouseDy * mmPerPixel);
          planeIntersected = true;
        } else if (dragStartPlaneHit.current && raycaster.ray.intersectPlane(plane, currentHit)) {
          const rawDelta = currentHit[axis] - dragStartPlaneHit.current[axis];
          if (Math.abs(rawDelta) < 60000) {
            deltaMm = Math.round(rawDelta);
            planeIntersected = true;
          }
        }

        if (!planeIntersected) {
          // Robust screen-space fallback
          const axisPoint3D = origin3D.clone().add(axisVector.clone().multiplyScalar(1000));
          const p0 = origin3D.clone().project(camera);
          const p1 = axisPoint3D.clone().project(camera);
          const s0x = ((p0.x + 1) * rect.width) / 2;
          const s0y = ((-p0.y + 1) * rect.height) / 2;
          const s1x = ((p1.x + 1) * rect.width) / 2;
          const s1y = ((-p1.y + 1) * rect.height) / 2;
          const dirX = s1x - s0x;
          const dirY = s1y - s0y;
          const len = Math.hypot(dirX, dirY);
          if (len > 0.01) {
            const uX = dirX / len;
            const uY = dirY / len;
            const projectedPixels = totalMouseDx * uX + totalMouseDy * uY;
            deltaMm = Math.round(projectedPixels * (1000 / len));
          }
        }

        if (gizmoMode === 'move') {
          let newPos: number;
          if (axis === 'z') {
            // Allows elevation from underground foundations (-10,000 mm) up to multi-storey (+20,000 mm)
            newPos = Math.max(-10000, Math.min(20000, dragStartPosition.current.z + deltaMm));
            if (localSnap && localGridSize > 0) {
              newPos = Math.max(-10000, Math.min(20000, Math.round(newPos / localGridSize) * localGridSize));
              deltaMm = newPos - dragStartPosition.current.z;
            }
            compGroup.position.z = newPos + curD / 2;
          } else {
            const basePos = dragStartPosition.current[axis];
            newPos = basePos + deltaMm;
            if (localSnap && localGridSize > 0) {
              newPos = Math.round(newPos / localGridSize) * localGridSize;
              deltaMm = newPos - basePos;
            }
            compGroup.position[axis] = newPos;
          }

          setDragLiveInfo({
            axis: axis === 'z' ? 'Z (Elevation)' : axis.toUpperCase(),
            val: newPos,
            delta: deltaMm,
            snapped: localSnap,
          });

          onUpdateComponent?.(selectedCompId, {
            position: {
              ...dragStartPosition.current,
              [axis]: newPos,
            },
          });
        } else {
          // Scale / Resize mode along chosen axis
          const baseDim = dragStartDimensions.current[axis];
          let newDim = Math.max(20, Math.min(20000, Math.round(baseDim + deltaMm)));
          if (localSnap && localGridSize > 0) {
            newDim = Math.max(20, Math.round(newDim / localGridSize) * localGridSize);
            deltaMm = newDim - baseDim;
          }

          setDragLiveInfo({
            axis: axis === 'z' ? 'HEIGHT (Z)' : axis.toUpperCase(),
            val: newDim,
            delta: deltaMm,
            snapped: localSnap,
          });

          onUpdateComponent?.(selectedCompId, {
            dimensions: {
              ...dragStartDimensions.current,
              [axis]: newDim,
            },
          });
        }
      }
      return;
    }

    // --- CASE B: DIRECT COMPONENT DRAGGING (Shift+Drag for Z Elevation | Drag for XY Ground translation) ---
    if (activePointerAction.current === 'component-drag' && dragTargetCompId.current) {
      const compId = dragTargetCompId.current;
      const comp = components.find((c) => c.id === compId);
      const compGroup = meshesMapRef.current.get(compId);

      if (comp && compGroup) {
        if (e.shiftKey) {
          // Shift + Left Drag = Elevate along Z axis!
          const totalMouseDy = e.clientY - pointerStart.current.y;
          const pixelsUp = -totalMouseDy;
          const mmPerPixel = (distanceRef.current * 0.0016) / Math.max(0.1, zoom);
          let newZ = Math.round(dragStartPosition.current.z + pixelsUp * mmPerPixel);

          if (localSnap && localGridSize > 0) {
            newZ = Math.round(newZ / localGridSize) * localGridSize;
          }

          compGroup.position.z = newZ + comp.dimensions.z / 2;

          setDragLiveInfo({
            axis: 'Z (Elevation)',
            val: newZ,
            delta: newZ - dragStartPosition.current.z,
            snapped: localSnap,
          });

          onUpdateComponent?.(compId, {
            position: {
              ...dragStartPosition.current,
              z: newZ,
            },
          });
          return;
        }

        // Standard Left Drag = XY Ground Plane Translation
        if (dragStartPlaneHit.current) {
          const curZ = comp.position.z + comp.dimensions.z / 2;
          const hitPt = getPlaneIntersection(e.clientX, e.clientY, curZ);

          if (hitPt) {
            const deltaX = hitPt.x - dragStartPlaneHit.current.x;
            const deltaY = hitPt.y - dragStartPlaneHit.current.y;

            let newX = Math.round(dragStartPosition.current.x + deltaX);
            let newY = Math.round(dragStartPosition.current.y + deltaY);
            const newZ = dragStartPosition.current.z;

            if (localSnap && localGridSize > 0) {
              newX = Math.round(newX / localGridSize) * localGridSize;
              newY = Math.round(newY / localGridSize) * localGridSize;
            }

            compGroup.position.x = newX;
            compGroup.position.y = newY;
            compGroup.position.z = newZ + comp.dimensions.z / 2;

            setDragLiveInfo({
              axis: 'XY Ground',
              val: newX,
              delta: Math.round(Math.hypot(newX - dragStartPosition.current.x, newY - dragStartPosition.current.y)),
              snapped: localSnap,
            });

            onUpdateComponent?.(compId, {
              position: {
                x: newX,
                y: newY,
                z: newZ,
              },
            });
          }
        }
      }
      return;
    }

    // --- CASE C: RIGHT DRAG -> ROTATION / ORBIT 3D SCENE ---
    if (activePointerAction.current === 'orbit') {
      const orbitSpeed = 0.007;
      sphericalRef.current.theta -= dx * orbitSpeed;

      const newPhi = sphericalRef.current.phi - dy * orbitSpeed;
      sphericalRef.current.phi = Math.max(0.03, Math.min(Math.PI / 2 - 0.02, newPhi));

      const tiltDeg = Math.round(90 - (sphericalRef.current.phi * 180) / Math.PI);
      let rotateDeg = Math.round((sphericalRef.current.theta * 180) / Math.PI) % 360;
      if (rotateDeg < 0) rotateDeg += 360;

      onRotationChange?.(tiltDeg, rotateDeg);
      updateCameraTransform();
      return;
    }

    // --- CASE D: MIDDLE CLICK / PAN TOOL -> CAMERA PAN ---
    if (activePointerAction.current === 'pan') {
      if (!cameraRef.current) return;
      const camera = cameraRef.current;

      const panSpeed = (distanceRef.current / 1200) * 1.6;

      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());

      const panDelta = new THREE.Vector3()
        .addScaledVector(right, -dx * panSpeed)
        .addScaledVector(up, dy * panSpeed);

      targetRef.current.add(panDelta);
      updateCameraTransform();
      return;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }

    const distMoved = Math.hypot(
      e.clientX - pointerStart.current.x,
      e.clientY - pointerStart.current.y
    );

    // If it was a quick click without dragging (< 6px), handle component selection/deselection
    if (distMoved < 6) {
      if (pointerDownTarget.current === 'component' || pointerDownTarget.current === 'background') {
        const hitCompId = checkComponentRaycast(e.clientX, e.clientY);
        onSelectComp(hitCompId);
      }
    }

    activePointerAction.current = 'none';
    activeDragAxis.current = null;
    setActiveGizmoAxisState(null);
    setDragLiveInfo(null);
    dragTargetCompId.current = null;
    dragStartPlaneHit.current = null;
    pointerDownTarget.current = 'background';
  };

  // Wheel event for smooth Unity-style scroll zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const zoomDelta = -e.deltaY * 0.0015 * Math.max(0.2, zoom);
    const newZoom = Math.min(4.0, Math.max(0.05, zoom + zoomDelta));

    distanceRef.current = BASE_CAMERA_DISTANCE / newZoom;
    updateCameraTransform();

    onZoomChange?.(Number(newZoom.toFixed(3)));
  };

  // Quick preset camera alignment views
  const alignCamera = (view: 'iso' | 'top' | 'front' | 'side') => {
    if (view === 'iso') {
      sphericalRef.current.theta = (35 * Math.PI) / 180;
      sphericalRef.current.phi = (40 * Math.PI) / 180;
      onRotationChange?.(50, 35);
    } else if (view === 'top') {
      sphericalRef.current.theta = 0;
      sphericalRef.current.phi = 0.05;
      onRotationChange?.(88, 0);
    } else if (view === 'front') {
      sphericalRef.current.theta = 0;
      sphericalRef.current.phi = (85 * Math.PI) / 180;
      onRotationChange?.(5, 0);
    } else if (view === 'side') {
      sphericalRef.current.theta = (90 * Math.PI) / 180;
      sphericalRef.current.phi = (85 * Math.PI) / 180;
      onRotationChange?.(5, 90);
    }
    updateCameraTransform();
  };

  const cursorClass =
    activeGizmoAxisState !== null || hoveredGizmoAxis !== null || activePointerAction.current === 'component-drag'
      ? 'cursor-grab active:cursor-grabbing'
      : activePointerAction.current === 'orbit' || activeTool === 'orbit'
      ? 'cursor-grab active:cursor-grabbing'
      : activeTool === 'pan' || activePointerAction.current === 'pan'
      ? 'cursor-move'
      : 'cursor-default';

  return (
    <div
      ref={mountRef}
      className={`w-full h-full relative select-none touch-none ${cursorClass}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Live Interactive Gizmo Dragging HUD Badge */}
      {dragLiveInfo && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[100] bg-slate-900/95 text-white backdrop-blur-md px-5 py-2.5 rounded-2xl shadow-2xl border border-blue-400/40 animate-in zoom-in-95 duration-100 flex items-center gap-3">
          <div
            className="w-3.5 h-3.5 rounded-full"
            style={{
              backgroundColor:
                dragLiveInfo.axis === 'X'
                  ? '#ef4444'
                  : dragLiveInfo.axis === 'Y'
                  ? '#22c55e'
                  : '#3b82f6',
            }}
          />
          <div className="text-xs font-black uppercase tracking-wider">
            {gizmoMode === 'move' ? (
              <>
                Position {dragLiveInfo.axis === 'X' ? 'Lateral X' : dragLiveInfo.axis === 'Y' ? 'Lateral Y' : 'Elevation Z'} ({dragLiveInfo.axis}):{' '}
                <span className="font-mono text-blue-300 text-sm">{dragLiveInfo.val >= 0 ? `+${dragLiveInfo.val}` : dragLiveInfo.val} mm</span>
              </>
            ) : (
              <>
                {dragLiveInfo.axis === 'X' ? 'Length' : dragLiveInfo.axis === 'Y' ? 'Width' : 'Height'} ({dragLiveInfo.axis}):{' '}
                <span className="font-mono text-blue-300 text-sm">{dragLiveInfo.val} mm</span>
              </>
            )}
          </div>
          {dragLiveInfo.snapped && (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[9px] font-mono font-bold">
              🧲 {localGridSize}mm SNAP
            </span>
          )}
          <span className="text-[10px] font-bold text-slate-400 font-mono">
            ({dragLiveInfo.delta >= 0 ? `+${dragLiveInfo.delta}` : dragLiveInfo.delta} mm)
          </span>
        </div>
      )}

      {/* Floating On-Screen Navigation Toolbar (Left side) */}
      <div className="absolute top-4 left-4 z-[50] flex flex-col gap-2 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg rounded-2xl p-1.5 flex flex-col gap-1">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
              activeTool === 'select' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Select & Gizmo Tool (Default)"
          >
            ↖️
          </button>
          <button
            onClick={() => setActiveTool('orbit')}
            className={`p-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
              activeTool === 'orbit' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Orbit Camera (Rotate 3D View)"
          >
            🔄
          </button>
          <button
            onClick={() => setActiveTool('pan')}
            className={`p-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center ${
              activeTool === 'pan' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Pan Camera (Move View Left/Right/Up/Down)"
          >
            ✋
          </button>
          <div className="h-px bg-slate-200 my-0.5" />
          <button
            onClick={() => {
              const newZ = Math.min(4.0, zoom + 0.2);
              onZoomChange?.(Number(newZ.toFixed(2)));
            }}
            className="p-2 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 hover:text-blue-600 flex items-center justify-center"
            title="Zoom In"
          >
            ➕
          </button>
          <button
            onClick={() => {
              const newZ = Math.max(0.05, zoom - 0.2);
              onZoomChange?.(Number(newZ.toFixed(2)));
            }}
            className="p-2 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 hover:text-blue-600 flex items-center justify-center"
            title="Zoom Out"
          >
            ➖
          </button>
        </div>

        {/* Snapping Control Widget */}
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-lg rounded-2xl p-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => {
                const next = !localSnap;
                setLocalSnap(next);
                onSnapToggle?.(next);
              }}
              className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg transition-all flex items-center gap-1.5 ${
                localSnap ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
              title="Toggle Grid / Edge Snapping"
            >
              <span>🧲 Snap {localSnap ? 'ON' : 'OFF'}</span>
            </button>
          </div>
          {localSnap && (
            <div className="flex gap-1">
              {[25, 50, 100, 250, 500].map((step) => (
                <button
                  key={step}
                  onClick={() => {
                    setLocalGridSize(step);
                    onSnapGridSizeChange?.(step);
                  }}
                  className={`px-1.5 py-0.5 text-[8px] font-black rounded font-mono ${
                    localGridSize === step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Right Controls & Quick Views */}
      <div className="absolute top-4 right-4 z-[50] flex flex-col items-end gap-2 pointer-events-auto">
        <div className="flex items-center gap-2">
          {/* Gizmo Tool Mode Switcher (Move by default vs Scale) */}
          {selectedCompId && (
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-md rounded-xl p-1 flex gap-1 items-center">
              <button
                onClick={() => setGizmoMode('move')}
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 ${
                  gizmoMode === 'move'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Move / Translate Component Position (Default)"
              >
                <span>✋ Move (W)</span>
              </button>
              <button
                onClick={() => setGizmoMode('scale')}
                className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 ${
                  gizmoMode === 'scale'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
                title="Scale / Resize Component Dimensions"
              >
                <span>📐 Scale (R)</span>
              </button>
            </div>
          )}

          <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-md rounded-xl p-1.5 flex gap-1 items-center">
            <button
              onClick={() => alignCamera('iso')}
              className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-colors text-slate-600"
              title="Isometric 3D View"
            >
              ISO
            </button>
            <button
              onClick={() => alignCamera('top')}
              className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-colors text-slate-600"
              title="Top View (Plan)"
            >
              TOP
            </button>
            <button
              onClick={() => alignCamera('front')}
              className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-colors text-slate-600"
              title="Front View"
            >
              FRONT
            </button>
            <button
              onClick={() => alignCamera('side')}
              className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 transition-colors text-slate-600"
              title="Side View"
            >
              SIDE
            </button>
          </div>
        </div>

        {/* Selected Component Status / Local Coordinate Colors & Quick Elevate Buttons */}
        {selectedCompId ? (
          <div className="flex items-center gap-2">
            <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm rounded-lg px-2.5 py-1 flex items-center gap-3 text-[9px] font-black">
              <span className="flex items-center gap-1 text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> X ({gizmoMode === 'move' ? 'Move X' : 'Length'})
              </span>
              <span className="flex items-center gap-1 text-green-600">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Y ({gizmoMode === 'move' ? 'Move Y' : 'Width'})
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Z ({gizmoMode === 'move' ? 'Elevate Z' : 'Height'})
              </span>
            </div>

            {/* Quick 1-Click Elevation Controls */}
            {gizmoMode === 'move' && (
              <div className="bg-blue-900/90 text-white backdrop-blur-sm border border-blue-700/80 shadow-sm rounded-lg p-0.5 flex items-center gap-1 text-[9px] font-black">
                <button
                  onClick={() => {
                    const sel = components.find((c) => c.id === selectedCompId);
                    if (sel) {
                      onUpdateComponent?.(selectedCompId, {
                        position: { ...sel.position, z: sel.position.z + 100 },
                      });
                    }
                  }}
                  className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 rounded text-white transition-colors"
                  title="Raise Elevation (+100mm)"
                >
                  ▲ Z +100
                </button>
                <button
                  onClick={() => {
                    const sel = components.find((c) => c.id === selectedCompId);
                    if (sel) {
                      onUpdateComponent?.(selectedCompId, {
                        position: { ...sel.position, z: Math.max(0, sel.position.z - 100) },
                      });
                    }
                  }}
                  className="px-2 py-0.5 bg-blue-800 hover:bg-blue-700 rounded text-blue-200 transition-colors"
                  title="Lower Elevation (-100mm)"
                >
                  ▼ Z -100
                </button>
                <button
                  onClick={() => {
                    const sel = components.find((c) => c.id === selectedCompId);
                    if (sel) {
                      onUpdateComponent?.(selectedCompId, {
                        position: { ...sel.position, z: 0 },
                      });
                    }
                  }}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors"
                  title="Drop component to ground level (Z=0)"
                >
                  Ground (0)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-lg px-2.5 py-1 text-[9px] font-bold text-slate-500">
            Left Click: Select/Drag Component | Right Drag: Rotate 3D View
          </div>
        )}
      </div>
    </div>
  );
};
