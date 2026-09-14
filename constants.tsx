
import { ComponentConfig, SMM3Section } from './types';

export const TEXTBOOK_INFO = {
  title: 'Construction Technology',
  publisher: 'Royal Institution of Surveyors Malaysia (RISM)',
  isbn: '978-967-15476-6-3',
  date: 'October 2021'
};

export const SMM2_LIBRARY: Record<string, SMM3Section> = {
  'F': {
    id: 'F',
    title: 'Concrete Work (SMM2)',
    titleBM: 'Kerja Konkrit (SMM2)',
    preambles: {
      en: [
        'Rule F.3.1: Description shall include the mix and type of cement.',
        'Rule F.8.2: Reinforcement bars shall be described and given in mass (kg).',
        'Rule F.11.1: Formwork shall be measured for the actual area in contact with the concrete.'
      ],
      bm: [
        'Peraturan F.3.1: Penerangan hendaklah termasuk campuran dan jenis simen.',
        'Peraturan F.8.2: Bar tetulang hendaklah diterangkan dan diberikan dalam jisim (kg).',
        'Peraturan F.11.1: Kotak acuan hendaklah diukur untuk kawasan sebenar yang bersentuhan dengan konkrit.'
      ]
    },
    rules: [
      {
        level1: '1. Lean concrete',
        unit: 'm2',
        level2: ['Plain in-situ concrete G10 in blinding', 'Not exceeding 100mm thick'],
        level3: ['Concrete: F.3.1', 'Formwork: -', 'Reinforcement: -'],
        notes: 'Description matches Item 1 of Pad Footing schedule.'
      },
      {
        level1: '2. Footing',
        unit: 'm3',
        level2: ['Reinforced in-situ concrete G30 in footing'],
        level3: [
          'Concrete: F.3.1, F.3.3',
          'Formwork: Sawn formwork to sides, not exceeding 250mm high (F.11.1)',
          'Reinforcement: Mild steel/high tensile steel bar (F.8.2, F.8.4.a)'
        ],
        notes: 'Schedule Item 2.'
      },
      {
        level1: '3. Column stump',
        unit: 'm3',
        level2: ['Reinforcement in-situ concrete G30 in column stump'],
        level3: [
          'Concrete: F.3.1, F.3.3',
          'Formwork: Sawn formwork to sides, exceeding 1.00m high (F.1.1.1)',
          'Reinforcement: Straight and bent/links (F.8.2, F.8.4.a)'
        ],
        notes: 'Schedule Item 3.'
      },
      {
        level1: '4. Ground beam',
        unit: 'm3',
        level2: ['Reinforced in-situ concrete G30 in ground beam'],
        level3: [
          'Concrete: F.3.1, F.3.5',
          'Formwork: Sawn formwork to sides, 250mm - 500mm high (F.11.1)',
          'Reinforcement: Straight and bend/stirrups (F.8.2, F.8.4.a)'
        ],
        notes: 'Schedule Item 4.'
      },
      {
        level1: '5. Ground slab',
        unit: 'm3',
        level2: ['Reinforced in-situ concrete G30 in ground slab'],
        level3: [
          'Concrete: F.3.1, F.3.8',
          'Formwork: Sawn formwork to edges, not exceeding 250mm high (F.11.1)',
          'Reinforcement: Fabric reinforcement (F.8.2 or F.9.2, F.8.4.a)'
        ],
        notes: 'Schedule Item 5 (100mm - 150mm thick).'
      }
    ]
  }
};

export const SMM3_LIBRARY: Record<string, SMM3Section> = {
  '09': {
    id: '09',
    title: 'In-Situ Concrete Works (SMM3)',
    titleBM: 'Kerja Konkrit In-Situ (SMM3)',
    preambles: {
      en: [
        'Concrete volume measured net.',
        'No deduction for reinforcement or steel sections.'
      ],
      bm: [
        'Isipadu konkrit diukur bersih.',
        'Tiada potongan untuk tetulang atau bahagian keluli.'
      ]
    },
    rules: [
      {
        level1: '09.02 Foundations',
        unit: 'm3',
        level2: ['Pad footings', 'Raft foundations'],
        level3: ['Plain concrete', 'Reinforced concrete'],
        notes: 'Measurement is nett before excavation allowance.'
      }
    ]
  }
};

export const COMPONENT_CONFIGS: Record<string, ComponentConfig> = {
  'pad-footing': { 
    id: 'pad-footing', 
    name: 'Pad Footing', 
    nameBM: 'Asas Pad',
    category: 'Substructure',
    categoryBM: 'Sub-struktur',
    shortName: 'PF',
    smmSectionId: '09',
    smm2SectionId: 'F',
    references: [{ title: 'SMM2 F.3.3: Footing', url: '/library/F?edition=SMM2', type: 'doc' }],
    guideImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=800',
    guideTips: {
      en: ['Reinforced in-situ concrete G30.', 'Sawn formwork < 250mm high.', 'Mild/High tensile steel bar.'],
      bm: ['Konkrit in-situ diperkukuh G30.', 'Kotak acuan < 250mm tinggi.', 'Bar keluli lembut/tegangan tinggi.']
    },
    labels: { x: 'Length', xBM: 'Panjang', y: 'Width', yBM: 'Lebar', z: 'Thickness', zBM: 'Ketebalan' }, 
    defaults: { x: 1200, y: 1200, z: 400 } 
  },
  'stump': { 
    id: 'stump', 
    name: 'Column stump', 
    nameBM: 'Puntung Tiang',
    category: 'Substructure',
    categoryBM: 'Sub-struktur',
    shortName: 'ST',
    smmSectionId: '09',
    smm2SectionId: 'F',
    references: [{ title: 'SMM2 F.3.3: Stump', url: '/library/F?edition=SMM2', type: 'doc' }],
    guideImage: 'https://images.unsplash.com/photo-1590634331662-660d0b639912?auto=format&fit=crop&q=80&w=800',
    guideTips: {
      en: ['Reinforcement in-situ concrete G30.', 'Formwork > 1.00m high.', 'Straight and bent/links.'],
      bm: ['Tetulang konkrit in-situ G30.', 'Kotak acuan > 1.00m tinggi.', 'Bar lurus dan bengkok/sengkang.']
    },
    labels: { x: 'Breadth', xBM: 'Lebar', y: 'Width', yBM: 'Lebar', z: 'Height', zBM: 'Tinggi' }, 
    defaults: { x: 250, y: 250, z: 900 } 
  },
  'ground-beam': { 
    id: 'ground-beam', 
    name: 'Ground beam', 
    nameBM: 'Rasuk Bumi',
    category: 'Substructure',
    categoryBM: 'Sub-struktur',
    shortName: 'GB',
    smmSectionId: '09',
    smm2SectionId: 'F',
    references: [{ title: 'SMM2 F.3.5: Ground Beam', url: '/library/F?edition=SMM2', type: 'doc' }],
    guideImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=800',
    guideTips: {
      en: ['Reinforced in-situ concrete G30.', 'Formwork 250-500mm high.', 'Straight and bend/stirrups.'],
      bm: ['Konkrit in-situ diperkukuh G30.', 'Kotak acuan 250-500mm tinggi.', 'Bar lurus dan bengkok/sengkang.']
    },
    labels: { x: 'Span', xBM: 'Rentang', y: 'Breadth', yBM: 'Lebar', z: 'Depth', zBM: 'Kedalaman' }, 
    defaults: { x: 3000, y: 250, z: 450 } 
  },
  'ground-slab': { 
    id: 'ground-slab', 
    name: 'Ground slab', 
    nameBM: 'Papah Lantai Bumi',
    category: 'Substructure',
    categoryBM: 'Sub-struktur',
    shortName: 'GS',
    smmSectionId: '09',
    smm2SectionId: 'F',
    references: [{ title: 'SMM2 F.3.8: Ground Slab', url: '/library/F?edition=SMM2', type: 'doc' }],
    guideImage: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=800',
    guideTips: {
      en: ['Reinforced in-situ concrete G30.', 'Sisi tidak melebihi 250mm tinggi.', 'Fabric reinforcement.'],
      bm: ['Konkrit in-situ diperkukuh G30.', 'Sisi tidak melebihi 250mm tinggi.', 'Tetulang jenis fabrik.']
    },
    labels: { x: 'Length', xBM: 'Panjang', y: 'Width', yBM: 'Lebar', z: 'Thickness', zBM: 'Ketebalan' }, 
    defaults: { x: 4000, y: 4000, z: 150 } 
  },
  'blinding': { 
    id: 'blinding', 
    name: 'Concrete blinding', 
    nameBM: 'Konkrit Pelapik',
    category: 'Substructure',
    categoryBM: 'Sub-struktur',
    shortName: 'BL',
    smmSectionId: '09',
    smm2SectionId: 'F',
    references: [{ title: 'SMM2 F.3.1: Lean Concrete in blinding', url: '/library/F?edition=SMM2', type: 'doc' }],
    guideImage: 'https://images.unsplash.com/photo-1517646288024-aa60d3780590?auto=format&fit=crop&q=80&w=800',
    guideTips: {
      en: ['Plain in-situ concrete G10.', 'In blinding, not exceeding 100mm thick.', 'No formwork required.'],
      bm: ['Konkrit in-situ biasa G10.', 'Dalam pelapik, tidak melebihi 100mm tebal.', 'Tiada kotak acuan diperlukan.']
    },
    labels: { x: 'Length', xBM: 'Panjang', y: 'Width', yBM: 'Lebar', z: 'Thickness', zBM: 'Ketebalan' }, 
    defaults: { x: 4000, y: 4000, z: 50 } 
  },
  'column': {
    id: 'column',
    name: 'Superstructure Column',
    nameBM: 'Tiang Struktur Atas',
    category: 'Superstructure',
    categoryBM: 'Super-struktur',
    shortName: 'COL',
    smmSectionId: '09',
    smm2SectionId: 'F',
    references: [{ title: 'SMM2 F.3.3: Column', url: '/library/F?edition=SMM2', type: 'doc' }],
    guideImage: 'https://images.unsplash.com/photo-1590634331662-660d0b639912?auto=format&fit=crop&q=80&w=800',
    guideTips: {
      en: ['Reinforced in-situ concrete G30.', 'Sawn formwork to sides > 1.00m.', 'Main bars & links.'],
      bm: ['Konkrit in-situ diperkukuh G30.', 'Kotak acuan pada sisi > 1.00m.', 'Bar utama & pautan.']
    },
    labels: { x: 'Width (X)', xBM: 'Lebar (X)', y: 'Depth (Y)', yBM: 'Kedalaman (Y)', z: 'Height (Z)', zBM: 'Tinggi (Z)' },
    defaults: { x: 250, y: 250, z: 3000 }
  },
  'floor-beam': {
    id: 'floor-beam',
    name: 'Suspended Floor Beam',
    nameBM: 'Rasuk Tingkat Atas',
    category: 'Superstructure',
    categoryBM: 'Super-struktur',
    shortName: 'FB',
    smmSectionId: '09',
    smm2SectionId: 'F',
    references: [{ title: 'SMM2 F.3.5: Floor Beam', url: '/library/F?edition=SMM2', type: 'doc' }],
    guideImage: 'https://images.unsplash.com/photo-1541888946425-d81bb19480c5?auto=format&fit=crop&q=80&w=800',
    guideTips: {
      en: ['Reinforced concrete G30 in floor beam.', 'Formwork to sides and soffit.', 'Main bars & stirrups.'],
      bm: ['Konkrit bertetulang G30 dalam rasuk tingkat.', 'Kotak acuan pada sisi dan bawah rasuk.', 'Bar utama & sengkang.']
    },
    labels: { x: 'Span (L)', xBM: 'Rentang (L)', y: 'Width (b)', yBM: 'Lebar (b)', z: 'Depth (h)', zBM: 'Kedalaman (h)' },
    defaults: { x: 3000, y: 200, z: 450 }
  },
  'slab': {
    id: 'slab',
    name: 'Suspended Floor Slab',
    nameBM: 'Papah Lantai Atas',
    category: 'Superstructure',
    categoryBM: 'Super-struktur',
    shortName: 'SL',
    smmSectionId: '09',
    smm2SectionId: 'F',
    references: [{ title: 'SMM2 F.3.8: Suspended Slab', url: '/library/F?edition=SMM2', type: 'doc' }],
    guideImage: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=800',
    guideTips: {
      en: ['Suspended slab G30, measured net.', 'Sawn formwork to soffit & edge.', 'Top and bottom mesh/rebar.'],
      bm: ['Lantai atas digantung G30, diukur bersih.', 'Kotak acuan bawah lantai & tepi.', 'Tetulang atas & bawah.']
    },
    labels: { x: 'Length', xBM: 'Panjang', y: 'Width', yBM: 'Lebar', z: 'Thickness', zBM: 'Ketebalan' },
    defaults: { x: 4000, y: 4000, z: 125 }
  },
  'strip-foundation': {
    id: 'strip-foundation',
    name: 'Strip Foundation',
    nameBM: 'Asas Jalur',
    category: 'Substructure',
    categoryBM: 'Sub-struktur',
    shortName: 'SF',
    smmSectionId: '09',
    smm2SectionId: 'F',
    references: [{ title: 'SMM2 F.3.3: Foundation', url: '/library/F?edition=SMM2', type: 'doc' }],
    guideImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=800',
    guideTips: {
      en: ['Continuous strip footing under load-bearing walls.', 'Formwork to sides.', 'Longitudinal & transverse rebar.'],
      bm: ['Asas jalur berterusan di bawah dinding galas.', 'Kotak acuan pada kedua-dua sisi.', 'Tetulang membujur & melintang.']
    },
    labels: { x: 'Length', xBM: 'Panjang', y: 'Width', yBM: 'Lebar', z: 'Depth', zBM: 'Kedalaman' },
    defaults: { x: 4000, y: 600, z: 300 }
  },
  'retaining-wall': {
    id: 'retaining-wall',
    name: 'Retaining Wall',
    nameBM: 'Dinding Penahan',
    category: 'Substructure',
    categoryBM: 'Sub-struktur',
    shortName: 'RW',
    smmSectionId: '09',
    smm2SectionId: 'F',
    references: [{ title: 'SMM2 F.3.7: Walls', url: '/library/F?edition=SMM2', type: 'doc' }],
    guideImage: 'https://images.unsplash.com/photo-1517646288024-aa60d3780590?auto=format&fit=crop&q=80&w=800',
    guideTips: {
      en: ['Reinforced concrete retaining wall.', 'Formwork both sides.', 'Vertical and horizontal rebar mats.'],
      bm: ['Dinding penahan konkrit bertetulang.', 'Kotak acuan kedua-dua belah sisi.', 'Lapisan tetulang tegak dan melintang.']
    },
    labels: { x: 'Length', xBM: 'Panjang', y: 'Thickness', yBM: 'Tebal', z: 'Height', zBM: 'Tinggi' },
    defaults: { x: 3000, y: 250, z: 1800 }
  }
};

export const COMPONENT_COLORS: Record<string, string> = {
  'pad-footing': '#1e40af',
  'stump': '#3b82f6',
  'ground-beam': '#ef4444',
  'ground-slab': '#10b981',
  'blinding': '#64748b',
  'column': '#6366f1',
  'floor-beam': '#f97316',
  'slab': '#06b6d4',
  'strip-foundation': '#8b5cf6',
  'retaining-wall': '#d97706'
};

export const TRANSLATIONS = {
  EN: {
    dashboard: 'Dashboard',
    library: 'SMM Library',
    settings: 'Settings',
    help: 'Help',
    logout: 'Logout',
    structureModel: 'Structure Model',
    assembly: 'Assembly of structural elements.',
    inspector: 'Inspector',
    adjustElement: 'Adjust selected element.',
    elementInfo: '1. Element Info',
    dimensions: '2. Dimensions (mm)',
    reinforcement: 'Reinforcement Bar',
    rebarDesc: 'Visual rebar grid inside concrete.',
    measurements: 'Dimension Lines',
    measureDesc: 'CAD-style measurement indicators.',
    position: '3. Position (Elevation)',
    baseElevation: 'Base Elevation',
    elementRotation: '4. Element Rotation',
    resetRotation: 'Reset Orientation',
    remove: 'Remove Element',
    finalize: 'View in 3D AR',
    changeDrawing: 'Upload Drawing',
    backToDash: 'Back to Dashboard',
    constructNew: 'Construct New',
    selectToInspect: 'Select an element to inspect',
    saved: 'Saved to Local PC',
    qsQuantities: 'QS Quantities',
    area: 'Area',
    volume: 'Concrete Volume',
    referSmm: 'Open SMM Library',
    smmTitle: 'Malaysian Standard Method of Measurement',
    edition: 'Select Edition',
    measurementRules: 'Tabulated Rules of Measurement',
    preambles: 'General Preambles',
    technicalDiagram: 'Technical Diagram Guide',
    studentTips: 'Academic Tips for QS',
    close: 'Close Library',
    exampleLabel: 'Reference',
    officialRef: 'References',
    searchLib: 'Search SMM Rules...',
    browseSections: 'Browse All Sections',
    viewFullSection: 'View Full Section',
    returnProject: 'Back to Project',
    academicRef: 'Academic Reference',
    viewAssembly: 'View Construction Guide',
    proTips: 'Professional QS Tips',
    backToWorkspace: 'Back to Workspace',
    addElement: 'Add Component',
    disclaimerTitle: 'Data Persistence Notice',
    disclaimerText: 'Project data is stored locally in your browser cache. Your work is saved automatically and remains accessible on this device. Note: Data is not transferable between different computers or browsers.'
  },
  BM: {
    dashboard: 'Papan Pemuka',
    library: 'Perpustakaan SMM',
    settings: 'Tetapan',
    help: 'Bantuan',
    logout: 'Log Keluar',
    structureModel: 'Model Struktur',
    assembly: 'Pemasangan elemen struktur.',
    inspector: 'Pemeriksa',
    adjustElement: 'Laraskan elemen terpilih.',
    elementInfo: '1. Maklumat Elemen',
    dimensions: '2. Dimensi (mm)',
    reinforcement: 'Tetulang Besi',
    rebarDesc: 'Grid tetulang di dalam konkrit.',
    measurements: 'Garisan Dimensi',
    measureDesc: 'Penunjuk ukuran gaya CAD.',
    position: '3. Kedudukan (Aras)',
    baseElevation: 'Aras Dasar',
    elementRotation: '4. Putaran Elemen',
    resetRotation: 'Set Semula Putaran',
    remove: 'Padam Elemen',
    finalize: 'Lihat dalam AR 3D',
    changeDrawing: 'Muat Naik Lukisan',
    backToDash: 'Kembali ke Papan Pemuka',
    constructNew: 'Bina Baru',
    selectToInspect: 'Pilih elemen untuk diperiksa',
    saved: 'Disimpan ke PC Tempatan',
    qsQuantities: 'Kuantiti QS',
    area: 'Keluasan',
    volume: 'Isipadu Konkrit',
    referSmm: 'Buka Perpustakaan SMM',
    smmTitle: 'Kaedah Pengukuran Standard Malaysia',
    edition: 'Pilih Edisi',
    measurementRules: 'Jadual Peraturan Pengukuran',
    preambles: 'Pendahuluan Am',
    technicalDiagram: 'Tetapan Gambarajah Teknikal',
    studentTips: 'Tip Akademik untuk QS',
    close: 'Tutup Perpustakaan',
    exampleLabel: 'Rujukan',
    officialRef: 'Rujukan',
    searchLib: 'Cari Peraturan SMM...',
    browseSections: 'Semak Semua Seksyen',
    viewFullSection: 'Lihat Seksyen Penuh',
    returnProject: 'Kembali ke Projek',
    academicRef: 'Rujukan Akademik',
    viewAssembly: 'Lihat Panduan Pembinaan',
    proTips: 'Tip QS Profesional',
    backToWorkspace: 'Kembali ke Ruang Kerja',
    addElement: 'Tambah Komponen',
    disclaimerTitle: 'Nota Penyimpanan Data',
    disclaimerText: 'Semua data projek disimpan secara tempatan dalam cache pelayar anda. Kerja anda disimpan secara automatik dan kekal boleh diakses pada peranti ini. Nota: Data tidak boleh dipindahkan antara komputer atau pelayar yang berbeza.'
  }
};
