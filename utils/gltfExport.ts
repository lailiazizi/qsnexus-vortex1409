import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { ProjectComponent } from '../types';
import { COMPONENT_COLORS } from '../constants';

export async function exportComponentsToGLB(components: ProjectComponent[], projectName: string = 'QS_Structural_Model'): Promise<Blob> {
  const scene = new THREE.Scene();

  components.forEach((comp) => {
    const { x: w, y: h, z: d } = comp.dimensions;
    const baseColor = COMPONENT_COLORS[comp.type] || '#3b82f6';

    const group = new THREE.Group();
    group.name = comp.name || comp.type;
    group.position.set(comp.position.x / 1000, comp.position.y / 1000, comp.position.z / 1000); // convert mm to meters for GLTF
    group.rotation.set(
      THREE.MathUtils.degToRad(comp.rotation.x),
      THREE.MathUtils.degToRad(comp.rotation.y),
      THREE.MathUtils.degToRad(comp.rotation.z)
    );

    // Concrete Geometry
    const geo = new THREE.BoxGeometry(w / 1000, h / 1000, d / 1000);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(baseColor),
      roughness: 0.4,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    // Reinforcement Rebar Cage (if enabled)
    if (comp.includeReinforcement && comp.type !== 'blinding') {
      const rebarMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color('#334155'),
        metalness: 0.8,
        roughness: 0.2,
      });

      const rebarW = Math.max(0.01, (w - 80) / 1000);
      const rebarH = Math.max(0.01, (h - 80) / 1000);
      const rebarD = Math.max(0.01, (d - 80) / 1000);

      const cageGeo = new THREE.BoxGeometry(rebarW, rebarH, rebarD);
      const cageWire = new THREE.LineSegments(
        new THREE.EdgesGeometry(cageGeo),
        new THREE.LineBasicMaterial({ color: 0x0f172a, linewidth: 2 })
      );
      group.add(cageWire);
    }

    scene.add(group);
  });

  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
        resolve(blob);
      },
      (error) => reject(error),
      { binary: true }
    );
  });
}
