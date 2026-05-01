export type PanelType = 'TP' | 'SP';

export interface Panel {
  code: string;
  type: PanelType;
  w: number;
  h: number;
  thickness: number;
  wCode: string;
  hCode: string;
  area_m2: number;
  panels_per_sheet: number;
}

export const SHEET_W = 1220;
export const SHEET_H = 2440;
export const SHEET_AREA_M2 = (SHEET_W * SHEET_H) / 1_000_000; // 2.9768

const W_CODES: Record<string, number> = {
  '02': 206,
  '04': 390,
  '06': 574,
  '08': 758,
  '12': 1126,
};

const H_CODES: Record<string, number> = {
  P02: 174,
  '02': 206,
  P04: 358,
  '04': 390,
  '06': 574,
};

function nestCount(w: number, h: number): number {
  const a = Math.floor(SHEET_W / w) * Math.floor(SHEET_H / h);
  const b = Math.floor(SHEET_W / h) * Math.floor(SHEET_H / w);
  return Math.max(a, b);
}

function makePanel(code: string, type: PanelType, wCode: string, hCode: string): Panel {
  const w = W_CODES[wCode];
  const h = H_CODES[hCode];
  return {
    code,
    type,
    w,
    h,
    thickness: 10,
    wCode,
    hCode,
    area_m2: (w * h) / 1_000_000,
    panels_per_sheet: nestCount(w, h),
  };
}

const TP_DEFS: Array<[string, string]> = [
  ['04', '04'],
  ['06', '04'],
  ['06', '06'],
  ['06', '02'],
  ['08', '06'],
  ['08', '02'],
  ['08', '08'],
  ['12', '06'],
  ['12', '02'],
  ['12', '04'],
  ['12', '08'],
];

const SP_DEFS: Array<[string, string]> = [
  // H=P02
  ['02', 'P02'],
  ['04', 'P02'],
  ['06', 'P02'],
  ['08', 'P02'],
  ['12', 'P02'],
  // H=02
  ['02', '02'],
  ['04', '02'],
  ['06', '02'],
  ['08', '02'],
  ['12', '02'],
  // H=P04
  ['02', 'P04'],
  ['04', 'P04'],
  ['06', 'P04'],
  ['12', 'P04'],
  // H=04
  ['02', '04'],
  ['06', '04'],
  ['08', '04'],
  ['12', '04'],
  // H=06
  ['04', '06'],
  ['06', '06'],
  ['08', '06'],
  ['12', '06'],
];

export const PANELS: Record<string, Panel> = {};

for (const [w, h] of TP_DEFS) {
  const code = `TP_${w}_${h}`;
  PANELS[code] = makePanel(code, 'TP', w, h);
}

for (const [w, h] of SP_DEFS) {
  const code = `SP_${w}_${h}`;
  PANELS[code] = makePanel(code, 'SP', w, h);
}

export function getPanel(code: string): Panel {
  const p = PANELS[code];
  if (!p) throw new Error(`Unknown panel code: ${code}`);
  return p;
}

export function panelsByType(type: PanelType): Panel[] {
  return Object.values(PANELS).filter((p) => p.type === type);
}
