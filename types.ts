
export type Language = 'EN' | 'BM';
export type SMMEdition = 'SMM2' | 'SMM3';

export type ComponentType = 
  | 'pad-footing'
  | 'stump'
  | 'ground-beam'
  | 'column'
  | 'floor-beam'
  | 'slab'
  | 'ground-slab'
  | 'strip-foundation'
  | 'retaining-wall'
  | 'blinding';

export interface SMM3TabulatedRule {
  level1: string;
  unit: string;
  level2: string[];
  level3?: string[];
  notes?: string;
}

export interface SMM3Section {
  id: string;
  title: string;
  titleBM: string;
  preambles: { en: string[]; bm: string[] };
  rules: SMM3TabulatedRule[];
}

export interface ReferenceLink {
  title: string;
  url: string;
  type: 'doc' | 'web' | 'video';
}

export interface ComponentConfig {
  id: ComponentType;
  name: string;
  nameBM: string;
  category: string;
  categoryBM: string;
  shortName: string;
  smmSectionId: string; 
  smm2SectionId?: string;
  references: ReferenceLink[];
  guideImage: string;
  guideTips: { en: string[]; bm: string[] };
  labels: {
    x: string; xBM: string;
    y: string; yBM: string;
    z: string; zBM: string;
  };
  defaults: {
    x: number;
    y: number;
    z: number;
  };
}

export interface RebarConfig {
  spacingMm: number; // e.g. 150mm
  diameterMm: number; // e.g. 12mm (T12)
  coverMm: number; // e.g. 40mm
  barType?: 'T' | 'R' | 'Y'; // T = High tensile, R = Mild steel round
}

export interface DrawingCalibration {
  standardScale: '1:50' | '1:100' | '1:200' | '1:500' | 'custom';
  mmPerPixel: number; // e.g. 10mm per pixel at 1:100
  widthMm: number;
  heightMm: number;
  opacity: number;
  gridVisible: boolean;
  gridStepMm: number;
  dxfLines?: Array<{ x1: number; y1: number; x2: number; y2: number; layer?: string; color?: string }>;
}

export interface ProjectComponent {
  id: string;
  type: ComponentType;
  name: string;
  status: 'Draft' | 'Ready';
  dimensions: { x: number; y: number; z: number };
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  includeReinforcement?: boolean;
  rebarConfig?: RebarConfig;
  showMeasurements?: boolean;
  lastEdited: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'Active' | 'Draft';
  lastEdited: string;
  components: ProjectComponent[];
  drawingUrl?: string;
  calibration?: DrawingCalibration;
  isExample?: boolean;
}

