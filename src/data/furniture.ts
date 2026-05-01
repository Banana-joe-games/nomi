import { getPanel, PanelType } from './panels';

export interface FurniturePanel {
  code: string;
  type: PanelType;
  position: [number, number, number]; // mm, center of panel in furniture local coords
  rotation: [number, number, number]; // radians
  role: string;
}

export interface FurnitureDef {
  id: string;
  name: string;
  color: string;
  footprint: [number, number]; // [W, D] in mm
  height: number; // in mm
  panels: FurniturePanel[];
}

const PI2 = Math.PI / 2;
const T = 10; // panel thickness

// Helpers for orientation:
// - Default Box geometry: w along X, h along Y, thickness along Z (we use thickness=10 along Z)
// - TP (lying flat): rotate so panel face is parallel to XZ plane => rotateX(PI/2)
// - SP back/front (faces along Z): no rotation, thickness on Z
// - SP left/right (faces along X): rotate around Y => rotateY(PI/2)

const TP_FLAT: [number, number, number] = [PI2, 0, 0]; // top/bottom
const SP_BACK: [number, number, number] = [0, 0, 0];   // facing +Z/-Z (thickness on Z)
const SP_SIDE: [number, number, number] = [0, PI2, 0]; // facing +X/-X (thickness on X)

// === Helpers to build cube-like furniture ===

interface CubeArgs {
  w: number; // outer footprint X
  d: number; // outer footprint Z (depth)
  zBase: number; // bottom Z of this section (mm)
  zTop: number; // top Z of this section
  topCode: string; // TP code for top
  bottomCode?: string; // optional TP code for bottom
  sideCodeWX: string; // SP code for front/back walls (W matches w)
  sideCodeWZ: string; // SP code for left/right walls (W matches d)
  rolePrefix?: string;
}

function makeCube(args: CubeArgs): FurniturePanel[] {
  const {
    w,
    d,
    zBase,
    zTop,
    topCode,
    bottomCode,
    sideCodeWX,
    sideCodeWZ,
    rolePrefix = '',
  } = args;
  const out: FurniturePanel[] = [];
  const sideH = zTop - zBase;
  const cy = zBase + sideH / 2;

  // Top
  out.push({
    code: topCode,
    type: 'TP',
    position: [0, zTop - T / 2, 0],
    rotation: TP_FLAT,
    role: rolePrefix + 'top',
  });

  if (bottomCode) {
    out.push({
      code: bottomCode,
      type: 'TP',
      position: [0, zBase + T / 2, 0],
      rotation: TP_FLAT,
      role: rolePrefix + 'bottom',
    });
  }

  // Front (+Z) and Back (-Z) walls
  out.push({
    code: sideCodeWX,
    type: 'SP',
    position: [0, cy, d / 2 - T / 2],
    rotation: SP_BACK,
    role: rolePrefix + 'front',
  });
  out.push({
    code: sideCodeWX,
    type: 'SP',
    position: [0, cy, -d / 2 + T / 2],
    rotation: SP_BACK,
    role: rolePrefix + 'back',
  });

  // Left (-X) and Right (+X) walls
  out.push({
    code: sideCodeWZ,
    type: 'SP',
    position: [-w / 2 + T / 2, cy, 0],
    rotation: SP_SIDE,
    role: rolePrefix + 'side_left',
  });
  out.push({
    code: sideCodeWZ,
    type: 'SP',
    position: [w / 2 - T / 2, cy, 0],
    rotation: SP_SIDE,
    role: rolePrefix + 'side_right',
  });

  return out;
}

// === FURNITURE DEFINITIONS ===

// 1. Demo Table Coffee Height (758x758x574)
const demoTableCoffee: FurnitureDef = {
  id: 'demo_table_coffee',
  name: 'Demo Table Coffee Height',
  color: '#95A5A6',
  footprint: [758, 758],
  height: 574,
  panels: [
    {
      code: 'TP_08_08',
      type: 'TP',
      position: [0, 574 - T / 2, 0],
      rotation: TP_FLAT,
      role: 'top',
    },
    {
      code: 'SP_08_06',
      type: 'SP',
      position: [0, 574 / 2, 758 / 2 - T / 2],
      rotation: SP_BACK,
      role: 'front',
    },
    {
      code: 'SP_08_06',
      type: 'SP',
      position: [0, 574 / 2, -758 / 2 + T / 2],
      rotation: SP_BACK,
      role: 'back',
    },
    {
      code: 'SP_08_06',
      type: 'SP',
      position: [-758 / 2 + T / 2, 574 / 2, 0],
      rotation: SP_SIDE,
      role: 'side_left',
    },
    {
      code: 'SP_08_06',
      type: 'SP',
      position: [758 / 2 - T / 2, 574 / 2, 0],
      rotation: SP_SIDE,
      role: 'side_right',
    },
  ],
};

// 2. Demo Table Standing Height (758x758x780)
const demoTableStanding: FurnitureDef = {
  id: 'demo_table_standing',
  name: 'Demo Table Standing Height',
  color: '#7F8C8D',
  footprint: [758, 758],
  height: 780,
  panels: [
    // middle TP at z = 390
    {
      code: 'TP_08_08',
      type: 'TP',
      position: [0, 390, 0],
      rotation: TP_FLAT,
      role: 'shelf_mid',
    },
    // top TP at z = 780
    {
      code: 'TP_08_08',
      type: 'TP',
      position: [0, 780 - T / 2, 0],
      rotation: TP_FLAT,
      role: 'top',
    },
    // lower SPs (z=0..390)
    {
      code: 'SP_08_04',
      type: 'SP',
      position: [0, 195, 758 / 2 - T / 2],
      rotation: SP_BACK,
      role: 'lower_front',
    },
    {
      code: 'SP_08_04',
      type: 'SP',
      position: [0, 195, -758 / 2 + T / 2],
      rotation: SP_BACK,
      role: 'lower_back',
    },
    {
      code: 'SP_08_04',
      type: 'SP',
      position: [-758 / 2 + T / 2, 195, 0],
      rotation: SP_SIDE,
      role: 'lower_left',
    },
    {
      code: 'SP_08_04',
      type: 'SP',
      position: [758 / 2 - T / 2, 195, 0],
      rotation: SP_SIDE,
      role: 'lower_right',
    },
    // upper SPs (z=390..780)
    {
      code: 'SP_08_04',
      type: 'SP',
      position: [0, 585, 758 / 2 - T / 2],
      rotation: SP_BACK,
      role: 'upper_front',
    },
    {
      code: 'SP_08_04',
      type: 'SP',
      position: [0, 585, -758 / 2 + T / 2],
      rotation: SP_BACK,
      role: 'upper_back',
    },
    {
      code: 'SP_08_04',
      type: 'SP',
      position: [-758 / 2 + T / 2, 585, 0],
      rotation: SP_SIDE,
      role: 'upper_left',
    },
    {
      code: 'SP_08_04',
      type: 'SP',
      position: [758 / 2 - T / 2, 585, 0],
      rotation: SP_SIDE,
      role: 'upper_right',
    },
  ],
};

// 3. Showcase Stand (403x403x1267) - tall thin
// Section heights from spec: lower SP_04_02 (206) + middle SP_04_P04 (358) + upper SP_04_06 (574)
// Total ~ 1138, plus 4 TPs (10mm each = 40) => ~ 1178; we treat sections sequentially
const showcaseStand: FurnitureDef = (() => {
  const w = 403;
  const d = 403;
  const zBase = 0;
  const zMid1 = 206 + T; // top of lower section
  const zMid2 = zMid1 + 358 + T;
  const zTop = zMid2 + 574 + T;

  const panels: FurniturePanel[] = [];

  // 4 TPs (bottom + 3 internal/top shelves)
  panels.push({
    code: 'TP_04_04',
    type: 'TP',
    position: [0, zBase + T / 2, 0],
    rotation: TP_FLAT,
    role: 'bottom',
  });
  panels.push({
    code: 'TP_04_04',
    type: 'TP',
    position: [0, zMid1 - T / 2, 0],
    rotation: TP_FLAT,
    role: 'shelf_1',
  });
  panels.push({
    code: 'TP_04_04',
    type: 'TP',
    position: [0, zMid2 - T / 2, 0],
    rotation: TP_FLAT,
    role: 'shelf_2',
  });
  panels.push({
    code: 'TP_04_04',
    type: 'TP',
    position: [0, zTop - T / 2, 0],
    rotation: TP_FLAT,
    role: 'top',
  });

  // 4x SP_04_02 lower section (206 high)
  const cyLow = zBase + T + 206 / 2;
  panels.push({ code: 'SP_04_02', type: 'SP', position: [0, cyLow, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_front' });
  panels.push({ code: 'SP_04_02', type: 'SP', position: [0, cyLow, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_back' });
  panels.push({ code: 'SP_04_02', type: 'SP', position: [-w / 2 + T / 2, cyLow, 0], rotation: SP_SIDE, role: 'lower_left' });
  panels.push({ code: 'SP_04_02', type: 'SP', position: [w / 2 - T / 2, cyLow, 0], rotation: SP_SIDE, role: 'lower_right' });

  // 4x SP_04_P04 middle decorative (358 high)
  const cyMid = zMid1 + 358 / 2;
  panels.push({ code: 'SP_04_P04', type: 'SP', position: [0, cyMid, d / 2 - T / 2], rotation: SP_BACK, role: 'mid_front' });
  panels.push({ code: 'SP_04_P04', type: 'SP', position: [0, cyMid, -d / 2 + T / 2], rotation: SP_BACK, role: 'mid_back' });
  panels.push({ code: 'SP_04_P04', type: 'SP', position: [-w / 2 + T / 2, cyMid, 0], rotation: SP_SIDE, role: 'mid_left' });
  panels.push({ code: 'SP_04_P04', type: 'SP', position: [w / 2 - T / 2, cyMid, 0], rotation: SP_SIDE, role: 'mid_right' });

  // 4x SP_04_06 upper section (574 high)
  const cyUp = zMid2 + 574 / 2;
  panels.push({ code: 'SP_04_06', type: 'SP', position: [0, cyUp, d / 2 - T / 2], rotation: SP_BACK, role: 'upper_front' });
  panels.push({ code: 'SP_04_06', type: 'SP', position: [0, cyUp, -d / 2 + T / 2], rotation: SP_BACK, role: 'upper_back' });
  panels.push({ code: 'SP_04_06', type: 'SP', position: [-w / 2 + T / 2, cyUp, 0], rotation: SP_SIDE, role: 'upper_left' });
  panels.push({ code: 'SP_04_06', type: 'SP', position: [w / 2 - T / 2, cyUp, 0], rotation: SP_SIDE, role: 'upper_right' });

  return {
    id: 'showcase_stand',
    name: 'Showcase Stand',
    color: '#E74C3C',
    footprint: [w, d],
    height: zTop,
    panels,
  };
})();

// 4. Light Box Display (587x403x904)
const lightBoxDisplay: FurnitureDef = (() => {
  const w = 587;
  const d = 403;
  const totalH = 904;
  // 3 TPs (bottom, middle, top), 4 SP_06_06 sides (front/back), 4 SP_04_02 short ends
  // SP_06_06 = 574 tall, SP_04_02 = 206 tall
  // Section heights => use 2 layers: lower (height ~ 358), upper (height ~ 358)?
  // Simpler: bottom TP at floor, middle TP at z=448, top TP at z=904
  // 4x SP_06_06 split as 2 front+2 back (one per layer? but SP_06_06 is 574 so doesn't split)
  // We'll place SP_06_06 spanning bottom -> middle (574 tall) and SP_04_02 spanning middle -> top (206 tall + ends)
  const zMid = 10 + 574 + 10; // top of bottom (10) + 574 + top TP thickness offset

  const panels: FurniturePanel[] = [];

  // bottom TP
  panels.push({ code: 'TP_06_04', type: 'TP', position: [0, T / 2, 0], rotation: TP_FLAT, role: 'bottom' });
  // middle TP
  panels.push({ code: 'TP_06_04', type: 'TP', position: [0, zMid - T / 2, 0], rotation: TP_FLAT, role: 'shelf_mid' });
  // top TP
  panels.push({ code: 'TP_06_04', type: 'TP', position: [0, totalH - T / 2, 0], rotation: TP_FLAT, role: 'top' });

  // Lower section: 2x SP_06_06 (front + back) and 2x SP_04_02 (left + right - but mismatch height)
  // Use SP_06_06 for front/back, SP_04_06 not in lower so use... Actually spec says 4x SP_06_06 sides
  // and 4x SP_04_02 short ends. Lower section span is large. We'll place
  // 2x SP_06_06 (front+back lower) + 2x SP_06_06 (front+back upper not making sense)
  // Re-read: "4x SP_06_06 sides + 4x SP_04_02 short ends" => total 8 SPs
  // Lower section (574 tall):
  //   front+back = SP_06_06, left+right = SP_04_06? but only SP_04_02 listed
  // We approximate: put 2x SP_06_06 as front/back of full-height lower section,
  // 2x SP_04_02 as left/right of bottom strip,
  // 2x SP_06_06 as front/back of upper section,
  // 2x SP_04_02 as left/right of upper section
  // Lower section z range: T..zMid-T  (~574)
  const zLowerMid = T + 574 / 2;
  panels.push({ code: 'SP_06_06', type: 'SP', position: [0, zLowerMid, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_front' });
  panels.push({ code: 'SP_06_06', type: 'SP', position: [0, zLowerMid, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_back' });
  panels.push({ code: 'SP_04_02', type: 'SP', position: [-w / 2 + T / 2, T + 206 / 2, 0], rotation: SP_SIDE, role: 'lower_left' });
  panels.push({ code: 'SP_04_02', type: 'SP', position: [w / 2 - T / 2, T + 206 / 2, 0], rotation: SP_SIDE, role: 'lower_right' });

  // Upper section: above middle TP
  const zUpperMid = zMid + (totalH - zMid) / 2;
  panels.push({ code: 'SP_06_06', type: 'SP', position: [0, zUpperMid, d / 2 - T / 2], rotation: SP_BACK, role: 'upper_front' });
  panels.push({ code: 'SP_06_06', type: 'SP', position: [0, zUpperMid, -d / 2 + T / 2], rotation: SP_BACK, role: 'upper_back' });
  panels.push({ code: 'SP_04_02', type: 'SP', position: [-w / 2 + T / 2, zMid + 206 / 2, 0], rotation: SP_SIDE, role: 'upper_left' });
  panels.push({ code: 'SP_04_02', type: 'SP', position: [w / 2 - T / 2, zMid + 206 / 2, 0], rotation: SP_SIDE, role: 'upper_right' });

  return {
    id: 'light_box_display',
    name: 'Light Box Display',
    color: '#F39C12',
    footprint: [w, d],
    height: totalH,
    panels,
  };
})();

// 5. Inclined Display (587x613x1310)
const inclinedDisplay: FurnitureDef = (() => {
  const w = 587;
  const d = 613;
  const totalH = 1310;
  // 5x TP_06_06 stacked + 4x SP_06_06 + 3x SP_06_02
  const panels: FurniturePanel[] = [];
  const tpZs = [T / 2, 250, 500, 750, totalH - T / 2];
  tpZs.forEach((z, i) => {
    panels.push({
      code: 'TP_06_06',
      type: 'TP',
      position: [0, z, 0],
      rotation: TP_FLAT,
      role: i === 0 ? 'bottom' : i === tpZs.length - 1 ? 'top' : `shelf_${i}`,
    });
  });
  // 4x SP_06_06 (574 tall) - place as 4 walls in upper portion
  const upperBaseZ = 750;
  const upperMidY = upperBaseZ + 574 / 2;
  panels.push({ code: 'SP_06_06', type: 'SP', position: [0, upperMidY, d / 2 - T / 2], rotation: SP_BACK, role: 'upper_front' });
  panels.push({ code: 'SP_06_06', type: 'SP', position: [0, upperMidY, -d / 2 + T / 2], rotation: SP_BACK, role: 'upper_back' });
  panels.push({ code: 'SP_06_06', type: 'SP', position: [-w / 2 + T / 2, upperMidY, 0], rotation: SP_SIDE, role: 'upper_left' });
  panels.push({ code: 'SP_06_06', type: 'SP', position: [w / 2 - T / 2, upperMidY, 0], rotation: SP_SIDE, role: 'upper_right' });
  // 3x SP_06_02 - place as front bands between lower TPs (slight inclination simulated as alternating offsets)
  panels.push({ code: 'SP_06_02', type: 'SP', position: [0, T + 206 / 2, d / 2 - T / 2], rotation: SP_BACK, role: 'band_1' });
  panels.push({ code: 'SP_06_02', type: 'SP', position: [0, 250 + T + 206 / 2, d / 2 - T / 2], rotation: SP_BACK, role: 'band_2' });
  panels.push({ code: 'SP_06_02', type: 'SP', position: [0, 500 + T + 206 / 2, d / 2 - T / 2], rotation: SP_BACK, role: 'band_3' });
  return {
    id: 'inclined_display',
    name: 'Inclined Display',
    color: '#9B59B6',
    footprint: [w, d],
    height: totalH,
    panels,
  };
})();

// 6. Coffee Station (904x587x1856) - 2 stacked modules
const coffeeStation: FurnitureDef = (() => {
  const w = 904;
  const d = 587;
  const totalH = 1856;
  // Lower module ~ W08xD06, height ~ 1240 (so upper vetrina ~ 600 tall on top)
  const lowerH = 1240;
  const panels: FurniturePanel[] = [];

  // Lower: 3x TP_08_06 (bottom, mid, top)
  panels.push({ code: 'TP_08_06', type: 'TP', position: [0, T / 2, 0], rotation: TP_FLAT, role: 'lower_bottom' });
  panels.push({ code: 'TP_08_06', type: 'TP', position: [0, lowerH / 2, 0], rotation: TP_FLAT, role: 'lower_mid' });
  panels.push({ code: 'TP_08_06', type: 'TP', position: [0, lowerH - T / 2, 0], rotation: TP_FLAT, role: 'lower_top' });

  // Lower walls: 2x SP_08_06 (front+back), 2x SP_08_04 (lower-side?), 2x SP_08_02
  panels.push({ code: 'SP_08_06', type: 'SP', position: [0, lowerH / 4 + T, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_front_lo' });
  panels.push({ code: 'SP_08_06', type: 'SP', position: [0, lowerH / 4 + T, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_back_lo' });
  panels.push({ code: 'SP_08_04', type: 'SP', position: [0, (3 * lowerH) / 4, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_front_hi' });
  panels.push({ code: 'SP_08_04', type: 'SP', position: [0, (3 * lowerH) / 4, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_back_hi' });
  panels.push({ code: 'SP_08_02', type: 'SP', position: [0, lowerH - 100, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_band_front' });
  panels.push({ code: 'SP_08_02', type: 'SP', position: [0, lowerH - 100, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_band_back' });

  // structural SP_06_02 x2 (interior dividers running depth-wise)
  panels.push({ code: 'SP_06_02', type: 'SP', position: [-w / 4, lowerH - 100, 0], rotation: SP_SIDE, role: 'divider_l' });
  panels.push({ code: 'SP_06_02', type: 'SP', position: [w / 4, lowerH - 100, 0], rotation: SP_SIDE, role: 'divider_r' });
  // SP_02_04 x2 (side ends)
  panels.push({ code: 'SP_02_04', type: 'SP', position: [-w / 2 + T / 2, 200, 0], rotation: SP_SIDE, role: 'lower_side_l' });
  panels.push({ code: 'SP_02_04', type: 'SP', position: [w / 2 - T / 2, 200, 0], rotation: SP_SIDE, role: 'lower_side_r' });

  // Upper vetrina W08xD02 (depth=206), centered on top: 2x TP_08_02 + 6x SP_08_P02 + 6x SP_02_P02
  const upperH = totalH - lowerH;
  const upperBaseZ = lowerH;
  const vetrinaD = 206;
  // 2x TP_08_02
  panels.push({ code: 'TP_08_02', type: 'TP', position: [0, upperBaseZ + T / 2, 0], rotation: TP_FLAT, role: 'upper_bottom' });
  panels.push({ code: 'TP_08_02', type: 'TP', position: [0, totalH - T / 2, 0], rotation: TP_FLAT, role: 'upper_top' });
  // 6x SP_08_P02 (front/back across 3 sub-layers)
  const lh = upperH / 3;
  for (let i = 0; i < 3; i++) {
    const cy = upperBaseZ + i * lh + lh / 2;
    panels.push({ code: 'SP_08_P02', type: 'SP', position: [0, cy, vetrinaD / 2 - T / 2], rotation: SP_BACK, role: `upper_front_${i}` });
    panels.push({ code: 'SP_08_P02', type: 'SP', position: [0, cy, -vetrinaD / 2 + T / 2], rotation: SP_BACK, role: `upper_back_${i}` });
  }
  // 6x SP_02_P02 (left/right across 3 sub-layers)
  for (let i = 0; i < 3; i++) {
    const cy = upperBaseZ + i * lh + lh / 2;
    panels.push({ code: 'SP_02_P02', type: 'SP', position: [-w / 2 + T / 2, cy, 0], rotation: SP_SIDE, role: `upper_left_${i}` });
    panels.push({ code: 'SP_02_P02', type: 'SP', position: [w / 2 - T / 2, cy, 0], rotation: SP_SIDE, role: `upper_right_${i}` });
  }

  return {
    id: 'coffee_station',
    name: 'Coffee Station',
    color: '#3498DB',
    footprint: [w, d],
    height: totalH,
    panels,
  };
})();

// 7. Brewing Kit Display (1139x622x2320)
const brewingKitDisplay: FurnitureDef = (() => {
  const w = 1139;
  const d = 622;
  const totalH = 2320;
  const lowerH = 1100;
  const panels: FurniturePanel[] = [];

  // Lower W12xD06: 3x TP_12_06
  panels.push({ code: 'TP_12_06', type: 'TP', position: [0, T / 2, 0], rotation: TP_FLAT, role: 'lower_bottom' });
  panels.push({ code: 'TP_12_06', type: 'TP', position: [0, lowerH / 2, 0], rotation: TP_FLAT, role: 'lower_mid' });
  panels.push({ code: 'TP_12_06', type: 'TP', position: [0, lowerH - T / 2, 0], rotation: TP_FLAT, role: 'lower_top' });
  // 2x SP_12_06 (front+back lower bottom)
  panels.push({ code: 'SP_12_06', type: 'SP', position: [0, lowerH / 4, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_front_lo' });
  panels.push({ code: 'SP_12_06', type: 'SP', position: [0, lowerH / 4, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_back_lo' });
  // 2x SP_12_04 (front+back upper)
  panels.push({ code: 'SP_12_04', type: 'SP', position: [0, lowerH * 0.75, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_front_hi' });
  panels.push({ code: 'SP_12_04', type: 'SP', position: [0, lowerH * 0.75, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_back_hi' });
  // 2x SP_12_P04 dividers (interior horizontal bands - actually interior shelf level)
  panels.push({ code: 'SP_12_P04', type: 'SP', position: [0, 300, d / 4], rotation: SP_BACK, role: 'shelf_band_1' });
  panels.push({ code: 'SP_12_P04', type: 'SP', position: [0, 700, d / 4], rotation: SP_BACK, role: 'shelf_band_2' });
  // 2x SP_06_06 (sides lower)
  panels.push({ code: 'SP_06_06', type: 'SP', position: [-w / 2 + T / 2, lowerH / 4 + 100, 0], rotation: SP_SIDE, role: 'lower_side_l' });
  panels.push({ code: 'SP_06_06', type: 'SP', position: [w / 2 - T / 2, lowerH / 4 + 100, 0], rotation: SP_SIDE, role: 'lower_side_r' });
  // 2x SP_02_P04 narrow ends (upper)
  panels.push({ code: 'SP_02_P04', type: 'SP', position: [-w / 2 + T / 2, lowerH - 200, 0], rotation: SP_SIDE, role: 'lower_end_l' });
  panels.push({ code: 'SP_02_P04', type: 'SP', position: [w / 2 - T / 2, lowerH - 200, 0], rotation: SP_SIDE, role: 'lower_end_r' });
  // 2x SP_02_04 ends
  panels.push({ code: 'SP_02_04', type: 'SP', position: [-w / 2 + T / 2, 200, d / 4], rotation: SP_SIDE, role: 'lower_inner_l' });
  panels.push({ code: 'SP_02_04', type: 'SP', position: [w / 2 - T / 2, 200, d / 4], rotation: SP_SIDE, role: 'lower_inner_r' });

  // Upper scaffolding W12xD02 (5 layers of TP, 6x TP_12_02, 6x SP_12_02 horizontal walls, 6x SP_02_02 + 4x SP_06_02)
  const upperH = totalH - lowerH;
  const layers = 5;
  const layerH = upperH / layers;
  const vetD = 206;
  for (let i = 0; i < 6; i++) {
    const z = lowerH + Math.min(i * layerH, upperH - T) + (i === 5 ? -T / 2 : T / 2);
    panels.push({ code: 'TP_12_02', type: 'TP', position: [0, z, 0], rotation: TP_FLAT, role: `upper_shelf_${i}` });
  }
  for (let i = 0; i < 5; i++) {
    const cy = lowerH + i * layerH + layerH / 2;
    if (i < 3) {
      panels.push({ code: 'SP_12_02', type: 'SP', position: [0, cy, vetD / 2 - T / 2], rotation: SP_BACK, role: `upper_front_${i}` });
      panels.push({ code: 'SP_12_02', type: 'SP', position: [0, cy, -vetD / 2 + T / 2], rotation: SP_BACK, role: `upper_back_${i}` });
    }
  }
  // 6x SP_02_02 short ends
  for (let i = 0; i < 3; i++) {
    const cy = lowerH + i * layerH + layerH / 2;
    panels.push({ code: 'SP_02_02', type: 'SP', position: [-w / 2 + T / 2, cy, 0], rotation: SP_SIDE, role: `upper_left_${i}` });
    panels.push({ code: 'SP_02_02', type: 'SP', position: [w / 2 - T / 2, cy, 0], rotation: SP_SIDE, role: `upper_right_${i}` });
  }
  // 4x SP_06_02 mid posts
  panels.push({ code: 'SP_06_02', type: 'SP', position: [-w / 4, lowerH + 300, vetD / 2 - T / 2], rotation: SP_BACK, role: 'upper_post_lf' });
  panels.push({ code: 'SP_06_02', type: 'SP', position: [w / 4, lowerH + 300, vetD / 2 - T / 2], rotation: SP_BACK, role: 'upper_post_rf' });
  panels.push({ code: 'SP_06_02', type: 'SP', position: [-w / 4, lowerH + 300, -vetD / 2 + T / 2], rotation: SP_BACK, role: 'upper_post_lb' });
  panels.push({ code: 'SP_06_02', type: 'SP', position: [w / 4, lowerH + 300, -vetD / 2 + T / 2], rotation: SP_BACK, role: 'upper_post_rb' });

  return {
    id: 'brewing_kit_display',
    name: 'Brewing Kit Display',
    color: '#2ECC71',
    footprint: [w, d],
    height: totalH,
    panels,
  };
})();

// 8. Music Station (720x608x1660)
const musicStation: FurnitureDef = (() => {
  const w = 720;
  const d = 608;
  const totalH = 1660;
  const lowerH = 1000;
  const panels: FurniturePanel[] = [];
  // Lower W06xD06 (4 layers): 4x TP_06_06
  for (let i = 0; i < 4; i++) {
    const z = i === 0 ? T / 2 : i === 3 ? lowerH - T / 2 : (lowerH / 3) * i;
    panels.push({ code: 'TP_06_06', type: 'TP', position: [0, z, 0], rotation: TP_FLAT, role: `lower_shelf_${i}` });
  }
  // 4x SP_06_06 (sides full lower height)
  panels.push({ code: 'SP_06_06', type: 'SP', position: [0, 287 + T, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_front_lo' });
  panels.push({ code: 'SP_06_06', type: 'SP', position: [0, 287 + T, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_back_lo' });
  panels.push({ code: 'SP_06_06', type: 'SP', position: [-w / 2 + T / 2, 287 + T, 0], rotation: SP_SIDE, role: 'lower_side_l_lo' });
  panels.push({ code: 'SP_06_06', type: 'SP', position: [w / 2 - T / 2, 287 + T, 0], rotation: SP_SIDE, role: 'lower_side_r_lo' });
  // 8x SP_06_04 stacked above
  const cyU = lowerH - 200;
  panels.push({ code: 'SP_06_04', type: 'SP', position: [0, cyU, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_front_hi' });
  panels.push({ code: 'SP_06_04', type: 'SP', position: [0, cyU, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_back_hi' });
  panels.push({ code: 'SP_06_04', type: 'SP', position: [-w / 2 + T / 2, cyU, 0], rotation: SP_SIDE, role: 'lower_side_l_hi' });
  panels.push({ code: 'SP_06_04', type: 'SP', position: [w / 2 - T / 2, cyU, 0], rotation: SP_SIDE, role: 'lower_side_r_hi' });
  panels.push({ code: 'SP_06_04', type: 'SP', position: [0, cyU - 250, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_front_mid' });
  panels.push({ code: 'SP_06_04', type: 'SP', position: [0, cyU - 250, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_back_mid' });
  panels.push({ code: 'SP_06_04', type: 'SP', position: [-w / 2 + T / 2, cyU - 250, 0], rotation: SP_SIDE, role: 'lower_side_l_mid' });
  panels.push({ code: 'SP_06_04', type: 'SP', position: [w / 2 - T / 2, cyU - 250, 0], rotation: SP_SIDE, role: 'lower_side_r_mid' });
  // 2x SP_06_P04 dividers
  panels.push({ code: 'SP_06_P04', type: 'SP', position: [0, lowerH / 2, 0], rotation: SP_SIDE, role: 'divider' });
  panels.push({ code: 'SP_06_P04', type: 'SP', position: [0, lowerH * 0.8, 0], rotation: SP_SIDE, role: 'divider_2' });

  // Upper vetrina W06xD02
  const vetD = 206;
  panels.push({ code: 'TP_06_02', type: 'TP', position: [0, lowerH + T / 2, 0], rotation: TP_FLAT, role: 'upper_bottom' });
  panels.push({ code: 'TP_06_02', type: 'TP', position: [0, totalH - T / 2, 0], rotation: TP_FLAT, role: 'upper_top' });
  // 4x SP_06_P02 (front+back, 2 layers)
  panels.push({ code: 'SP_06_P02', type: 'SP', position: [0, lowerH + 100, vetD / 2 - T / 2], rotation: SP_BACK, role: 'upper_front_lo' });
  panels.push({ code: 'SP_06_P02', type: 'SP', position: [0, lowerH + 100, -vetD / 2 + T / 2], rotation: SP_BACK, role: 'upper_back_lo' });
  panels.push({ code: 'SP_06_P02', type: 'SP', position: [0, totalH - 100, vetD / 2 - T / 2], rotation: SP_BACK, role: 'upper_front_hi' });
  panels.push({ code: 'SP_06_P02', type: 'SP', position: [0, totalH - 100, -vetD / 2 + T / 2], rotation: SP_BACK, role: 'upper_back_hi' });
  // 2x SP_02_P04 ends
  panels.push({ code: 'SP_02_P04', type: 'SP', position: [-w / 2 + T / 2, lowerH + (totalH - lowerH) / 2, 0], rotation: SP_SIDE, role: 'upper_left' });
  panels.push({ code: 'SP_02_P04', type: 'SP', position: [w / 2 - T / 2, lowerH + (totalH - lowerH) / 2, 0], rotation: SP_SIDE, role: 'upper_right' });

  return {
    id: 'music_station',
    name: 'Music Station',
    color: '#E67E22',
    footprint: [w, d],
    height: totalH,
    panels,
  };
})();

// 9. Depth-Down Counter (1139x806x1088) - upper vetrina W12xD04 + lower W12xD08
const depthDownCounter: FurnitureDef = (() => {
  const w = 1139;
  const d = 806;
  const totalH = 1088;
  const lowerH = 600;
  const panels: FurniturePanel[] = [];
  // 2x TP_12_08 (lower bottom + lower top)
  panels.push({ code: 'TP_12_08', type: 'TP', position: [0, T / 2, 0], rotation: TP_FLAT, role: 'lower_bottom' });
  panels.push({ code: 'TP_12_08', type: 'TP', position: [0, lowerH - T / 2, 0], rotation: TP_FLAT, role: 'lower_top' });
  // 2x TP_12_04 (upper bottom = same as lower top? reuse semantically; place at same z but different depth)
  panels.push({ code: 'TP_12_04', type: 'TP', position: [0, lowerH + T / 2, -d / 4], rotation: TP_FLAT, role: 'upper_bottom' });
  panels.push({ code: 'TP_12_04', type: 'TP', position: [0, totalH - T / 2, -d / 4], rotation: TP_FLAT, role: 'upper_top' });
  // 2x SP_12_06 lower front+back
  panels.push({ code: 'SP_12_06', type: 'SP', position: [0, lowerH / 2, d / 2 - T / 2], rotation: SP_BACK, role: 'lower_front' });
  panels.push({ code: 'SP_12_06', type: 'SP', position: [0, lowerH / 2, -d / 2 + T / 2], rotation: SP_BACK, role: 'lower_back' });
  // 2x SP_12_04 upper front+back
  const upperD = 390;
  panels.push({ code: 'SP_12_04', type: 'SP', position: [0, (lowerH + totalH) / 2, -d / 4 + upperD / 2 - T / 2], rotation: SP_BACK, role: 'upper_front' });
  panels.push({ code: 'SP_12_04', type: 'SP', position: [0, (lowerH + totalH) / 2, -d / 4 - upperD / 2 + T / 2], rotation: SP_BACK, role: 'upper_back' });
  // 4x SP_12_02 narrow horizontal bands (kick/skirt)
  panels.push({ code: 'SP_12_02', type: 'SP', position: [0, T + 103, d / 2 - T / 2], rotation: SP_BACK, role: 'kick_front' });
  panels.push({ code: 'SP_12_02', type: 'SP', position: [0, T + 103, -d / 2 + T / 2], rotation: SP_BACK, role: 'kick_back' });
  panels.push({ code: 'SP_12_02', type: 'SP', position: [0, lowerH - T - 103, d / 2 - T / 2], rotation: SP_BACK, role: 'top_band_front' });
  panels.push({ code: 'SP_12_02', type: 'SP', position: [0, lowerH - T - 103, -d / 2 + T / 2], rotation: SP_BACK, role: 'top_band_back' });
  // 2x SP_12_P02 (interior dividers)
  panels.push({ code: 'SP_12_P02', type: 'SP', position: [0, lowerH - 90, d / 4], rotation: SP_BACK, role: 'inner_band_1' });
  panels.push({ code: 'SP_12_P02', type: 'SP', position: [0, lowerH - 90, -d / 4], rotation: SP_BACK, role: 'inner_band_2' });
  // 2x SP_04_02 short ends lower
  panels.push({ code: 'SP_04_02', type: 'SP', position: [-w / 2 + T / 2, T + 103, 0], rotation: SP_SIDE, role: 'lower_end_l' });
  panels.push({ code: 'SP_04_02', type: 'SP', position: [w / 2 - T / 2, T + 103, 0], rotation: SP_SIDE, role: 'lower_end_r' });
  // 2x SP_04_P02 short ends upper
  panels.push({ code: 'SP_04_P02', type: 'SP', position: [-w / 2 + T / 2, lowerH + (totalH - lowerH) / 2, -d / 4], rotation: SP_SIDE, role: 'upper_end_l' });
  panels.push({ code: 'SP_04_P02', type: 'SP', position: [w / 2 - T / 2, lowerH + (totalH - lowerH) / 2, -d / 4], rotation: SP_SIDE, role: 'upper_end_r' });

  return {
    id: 'depth_down_counter',
    name: 'Depth-Down Counter',
    color: '#1ABC9C',
    footprint: [w, d],
    height: totalH,
    panels,
  };
})();

export const FURNITURE_LIBRARY: FurnitureDef[] = [
  demoTableCoffee,
  demoTableStanding,
  showcaseStand,
  lightBoxDisplay,
  inclinedDisplay,
  coffeeStation,
  brewingKitDisplay,
  musicStation,
  depthDownCounter,
];

export function getFurnitureDef(id: string): FurnitureDef {
  const f = FURNITURE_LIBRARY.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown furniture: ${id}`);
  return f;
}

// Validate all panel codes exist; throw at module load if any mismatch.
for (const f of FURNITURE_LIBRARY) {
  for (const p of f.panels) {
    getPanel(p.code); // throws if missing
  }
}

// avoid unused import warning
void makeCube;
