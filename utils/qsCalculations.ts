import { ComponentType, RebarConfig } from '../types';

export interface QSResult {
  concreteGrade: string;
  concreteVolume: string; // formatted string e.g. "0.576"
  concreteVolumeNum: number; // raw number in m³
  formworkArea: number; // in m²
  formworkDescription: string;
  smmClause: string;
  steelPercentage: number; // in % (e.g. 0.8, 2.5, 2.0, 1.0)
  steelDensity: number; // 7850 kg/m³
  steelWeightKg: number; // in kg
  steelWeightTonnes: number; // in tonnes
  steelFormulaDesc: string;
  totalReinforcementLength: number; // in meters
  rebarDetails?: {
    mainBarCount: number;
    linkCount: number;
    spacingMm: number;
    diameterMm: number;
    coverMm: number;
    unitWeightKgM: number;
    barScheduleDesc: string;
  };
}

export const STEEL_DENSITY_KG_M3 = 7850;

// Unit weights per meter for standard BS 4449 / MS 146 steel rebar
export const REBAR_UNIT_WEIGHTS: Record<number, number> = {
  6: 0.222,
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.58,
  20: 2.47,
  25: 3.85,
  32: 6.31,
  40: 9.86
};

/**
 * Standard Quantity Surveying (QS) benchmark rules:
 * - Concrete volume = X * Y * Z (m³)
 * - Steel weight = Concrete Volume (m³) * (Steel % / 100) * 7850 kg/m³
 *   - Slab / Ground slab: 1.0%
 *   - Beam / Floor beam: 2.0%
 *   - Footing (Pad footing / Strip): 0.8%
 *   - Column (Stump / Column): 2.5%
 *   - Retaining wall: 1.5%
 *   - Blinding: 0.0%
 */
export function getSteelPercentage(type: ComponentType): number {
  switch (type) {
    case 'ground-slab':
    case 'slab':
      return 1.0;
    case 'ground-beam':
    case 'floor-beam':
      return 2.0;
    case 'pad-footing':
    case 'strip-foundation':
      return 0.8;
    case 'stump':
    case 'column':
      return 2.5;
    case 'retaining-wall':
      return 1.5;
    case 'blinding':
      return 0.0;
    default:
      return 1.0;
  }
}

export function calculateQS(
  type: ComponentType,
  x: number, // mm (Length / Span)
  y: number, // mm (Width / Breadth)
  z: number, // mm (Height / Depth / Thickness)
  rebarConfig?: RebarConfig
): QSResult {
  const xM = x / 1000;
  const yM = y / 1000;
  const zM = z / 1000;

  const rawVol = xM * yM * zM;
  const volStr = rawVol.toFixed(3);
  const volNum = parseFloat(volStr);

  const defaultPct = getSteelPercentage(type);
  
  // Rebar Calculation based on geometry & user-defined rebar parameters
  const spacing = rebarConfig?.spacingMm || (type === 'stump' || type === 'column' ? 150 : 200);
  const diameter = rebarConfig?.diameterMm || (type === 'pad-footing' ? 12 : type === 'stump' || type === 'column' ? 16 : 12);
  const cover = rebarConfig?.coverMm || 40;
  const unitWt = REBAR_UNIT_WEIGHTS[diameter] || 0.888;
  const barType = rebarConfig?.barType || 'T';

  // Compute actual bar schedule
  let mainBarCount = 0;
  let linkCount = 0;
  let totalLengthM = 0;
  let scheduleDesc = '';

  const effX = Math.max(100, x - 2 * cover);
  const effY = Math.max(100, y - 2 * cover);
  const effZ = Math.max(100, z - 2 * cover);

  if (type === 'pad-footing' || type === 'strip-foundation') {
    // Two-way bottom mesh
    const barsInX = Math.max(2, Math.floor(effY / spacing) + 1);
    const barsInY = Math.max(2, Math.floor(effX / spacing) + 1);
    mainBarCount = barsInX + barsInY;
    const lenX = (effX + 2 * (z - 2 * cover) * 0.5) / 1000; // with bend hooks
    const lenY = (effY + 2 * (z - 2 * cover) * 0.5) / 1000;
    totalLengthM = Number((barsInX * lenX + barsInY * lenY).toFixed(2));
    scheduleDesc = `${barsInX}no ${barType}${diameter}@${spacing}c/c B1 + ${barsInY}no ${barType}${diameter}@${spacing}c/c B2`;
  } else if (type === 'stump' || type === 'column') {
    // 4 to 8 main corner/perimeter bars + links
    const perimeterM = (2 * (effX + effY)) / 1000;
    mainBarCount = x >= 400 || y >= 400 ? 8 : 4;
    linkCount = Math.max(2, Math.floor(effZ / spacing) + 1);
    const mainLenM = (z + 40 * diameter) / 1000; // includes starter lap
    const linkLenM = perimeterM + 0.15; // with 135deg hooks
    totalLengthM = Number((mainBarCount * mainLenM + linkCount * linkLenM).toFixed(2));
    scheduleDesc = `${mainBarCount}${barType}${diameter} Main Bars + R6/R8@${spacing}c/c Links (${linkCount}no)`;
  } else if (type === 'ground-beam' || type === 'floor-beam') {
    // Top & bottom longitudinal bars + stirrups
    mainBarCount = 4; // 2T bottom + 2T top
    linkCount = Math.max(2, Math.floor(effX / spacing) + 1);
    const mainLenM = (x + 300) / 1000;
    const stirrupPerimeterM = (2 * (effY + effZ)) / 1000 + 0.15;
    totalLengthM = Number((mainBarCount * mainLenM + linkCount * stirrupPerimeterM).toFixed(2));
    scheduleDesc = `4${barType}${diameter} Longitudinal Bars + R6@${spacing}c/c Stirrups (${linkCount}no)`;
  } else if (type === 'ground-slab' || type === 'slab') {
    // Two-way orthogonal mesh reinforcement
    const isDoubleMat = type === 'slab' || z >= 130;
    const mats = isDoubleMat ? 2 : 1;
    const runsX = Math.max(2, Math.floor(effY / spacing) + 1);
    const runsY = Math.max(2, Math.floor(effX / spacing) + 1);
    mainBarCount = (runsX + runsY) * mats;
    totalLengthM = Number((mats * (runsX * (effX / 1000) + runsY * (effY / 1000))).toFixed(2));
    scheduleDesc = isDoubleMat
      ? `Top & Bottom Mats (B1/B2 & T1/T2) ${barType}${diameter}@${spacing}c/c + Chairs`
      : `BRC Fabric Mesh / ${barType}${diameter}@${spacing}c/c Both Ways`;
  } else if (type === 'retaining-wall') {
    const vertBars = Math.max(2, Math.floor(effX / spacing) + 1) * 2; // 2 faces
    const horizBars = Math.max(2, Math.floor(effZ / spacing) + 1) * 2;
    mainBarCount = vertBars + horizBars;
    totalLengthM = Number((vertBars * (effZ / 1000) + horizBars * (effX / 1000)).toFixed(2));
    scheduleDesc = `2 Layers ${barType}${diameter}@${spacing}c/c Vertical & Horizontal`;
  }

  // Weight calculation: prefer detailed bar schedule weight if spacing is custom, or fallback to SMM standard percentage
  let steelWeightKg = 0;
  if (rebarConfig && totalLengthM > 0) {
    steelWeightKg = Number((totalLengthM * unitWt).toFixed(2));
  } else {
    const steelWeightKgRaw = (rawVol * (defaultPct / 100)) * STEEL_DENSITY_KG_M3;
    steelWeightKg = Number(steelWeightKgRaw.toFixed(2));
  }
  const steelWeightTonnes = Number((steelWeightKg / 1000).toFixed(4));
  const steelFormulaDesc = `${defaultPct}% × ${volStr} m³ × 7,850 kg/m³ = ${steelWeightKg} kg`;

  if (type === 'blinding') {
    return {
      concreteGrade: 'G10 Plain Lean Concrete',
      concreteVolume: volStr,
      concreteVolumeNum: volNum,
      formworkArea: 0,
      formworkDescription: 'No formwork required (lean concrete blinding ≤100mm)',
      smmClause: 'SMM2 Rule F.3.1 / SMM3 Section 09.01',
      steelPercentage: 0,
      steelDensity: STEEL_DENSITY_KG_M3,
      steelWeightKg: 0,
      steelWeightTonnes: 0,
      steelFormulaDesc: 'No reinforcement required (Plain Lean Concrete)',
      totalReinforcementLength: 0
    };
  }

  if (type === 'pad-footing' || type === 'strip-foundation') {
    const perimeter = 2 * (xM + yM);
    const fwArea = Number((perimeter * zM).toFixed(2));

    return {
      concreteGrade: 'G30 Reinforced Concrete',
      concreteVolume: volStr,
      concreteVolumeNum: volNum,
      formworkArea: fwArea,
      formworkDescription: `Sawn formwork to sides of footing, ${z <= 250 ? '≤250mm' : '>250mm'} height`,
      smmClause: 'SMM2 Rule F.3.3 & F.11.1 / SMM3 09.02',
      steelPercentage: defaultPct,
      steelDensity: STEEL_DENSITY_KG_M3,
      steelWeightKg,
      steelWeightTonnes,
      steelFormulaDesc,
      totalReinforcementLength: totalLengthM,
      rebarDetails: {
        mainBarCount,
        linkCount,
        spacingMm: spacing,
        diameterMm: diameter,
        coverMm: cover,
        unitWeightKgM: unitWt,
        barScheduleDesc: scheduleDesc
      }
    };
  }

  if (type === 'stump' || type === 'column') {
    const perimeter = 2 * (xM + yM);
    const fwArea = Number((perimeter * zM).toFixed(2));

    return {
      concreteGrade: 'G30 Reinforced Concrete',
      concreteVolume: volStr,
      concreteVolumeNum: volNum,
      formworkArea: fwArea,
      formworkDescription: `Sawn formwork to sides of ${type === 'stump' ? 'stump' : 'column'}, ${zM > 1 ? '>1.0m' : '≤1.0m'} height`,
      smmClause: 'SMM2 Rule F.3.3 & F.11.1 / SMM3 09.03',
      steelPercentage: defaultPct,
      steelDensity: STEEL_DENSITY_KG_M3,
      steelWeightKg,
      steelWeightTonnes,
      steelFormulaDesc,
      totalReinforcementLength: totalLengthM,
      rebarDetails: {
        mainBarCount,
        linkCount,
        spacingMm: spacing,
        diameterMm: diameter,
        coverMm: cover,
        unitWeightKgM: unitWt,
        barScheduleDesc: scheduleDesc
      }
    };
  }

  if (type === 'ground-beam' || type === 'floor-beam') {
    const isGroundBeam = type === 'ground-beam';
    const fwArea = Number((2 * zM * xM + (isGroundBeam ? 0 : yM * xM)).toFixed(2));

    return {
      concreteGrade: 'G30 Reinforced Concrete',
      concreteVolume: volStr,
      concreteVolumeNum: volNum,
      formworkArea: fwArea,
      formworkDescription: isGroundBeam 
        ? `Sawn formwork to sides of ground beam, ${z <= 500 ? '250-500mm' : '>500mm'} height`
        : `Sawn formwork to sides & soffit of suspended beam`,
      smmClause: 'SMM2 Rule F.3.5 & F.11.1 / SMM3 09.04',
      steelPercentage: defaultPct,
      steelDensity: STEEL_DENSITY_KG_M3,
      steelWeightKg,
      steelWeightTonnes,
      steelFormulaDesc,
      totalReinforcementLength: totalLengthM,
      rebarDetails: {
        mainBarCount,
        linkCount,
        spacingMm: spacing,
        diameterMm: diameter,
        coverMm: cover,
        unitWeightKgM: unitWt,
        barScheduleDesc: scheduleDesc
      }
    };
  }

  if (type === 'ground-slab' || type === 'slab') {
    const isSuspended = type === 'slab';
    const fwArea = Number((2 * (xM + yM) * zM + (isSuspended ? xM * yM : 0)).toFixed(2));

    return {
      concreteGrade: 'G30 Reinforced Concrete',
      concreteVolume: volStr,
      concreteVolumeNum: volNum,
      formworkArea: fwArea,
      formworkDescription: isSuspended
        ? `Sawn formwork to soffit & edge of suspended slab`
        : `Sawn formwork to edge of ground slab, ≤250mm high`,
      smmClause: 'SMM2 Rule F.3.8 & F.11.1 / SMM3 09.05',
      steelPercentage: defaultPct,
      steelDensity: STEEL_DENSITY_KG_M3,
      steelWeightKg,
      steelWeightTonnes,
      steelFormulaDesc,
      totalReinforcementLength: totalLengthM,
      rebarDetails: {
        mainBarCount,
        linkCount,
        spacingMm: spacing,
        diameterMm: diameter,
        coverMm: cover,
        unitWeightKgM: unitWt,
        barScheduleDesc: scheduleDesc
      }
    };
  }

  if (type === 'retaining-wall') {
    const fwArea = Number((2 * xM * zM).toFixed(2)); // both faces
    return {
      concreteGrade: 'G30 Reinforced Concrete',
      concreteVolume: volStr,
      concreteVolumeNum: volNum,
      formworkArea: fwArea,
      formworkDescription: 'Sawn formwork to both sides of retaining wall',
      smmClause: 'SMM2 Rule F.3.7 & F.11.1 / SMM3 09.06',
      steelPercentage: defaultPct,
      steelDensity: STEEL_DENSITY_KG_M3,
      steelWeightKg,
      steelWeightTonnes,
      steelFormulaDesc,
      totalReinforcementLength: totalLengthM,
      rebarDetails: {
        mainBarCount,
        linkCount,
        spacingMm: spacing,
        diameterMm: diameter,
        coverMm: cover,
        unitWeightKgM: unitWt,
        barScheduleDesc: scheduleDesc
      }
    };
  }

  // Generic fallback
  const perimeter = 2 * (xM + yM);
  const fwArea = Number((perimeter * zM).toFixed(2));
  return {
    concreteGrade: 'G30 Reinforced',
    concreteVolume: volStr,
    concreteVolumeNum: volNum,
    formworkArea: fwArea,
    formworkDescription: 'Sawn formwork to sides',
    smmClause: 'SMM2 Section F / SMM3 Section 09',
    steelPercentage: defaultPct,
    steelDensity: STEEL_DENSITY_KG_M3,
    steelWeightKg,
    steelWeightTonnes,
    steelFormulaDesc,
    totalReinforcementLength: totalLengthM,
    rebarDetails: {
      mainBarCount,
      linkCount,
      spacingMm: spacing,
      diameterMm: diameter,
      coverMm: cover,
      unitWeightKgM: unitWt,
      barScheduleDesc: scheduleDesc
    }
  };
}

