import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FURNITURE_LIBRARY, FurnitureDef, getFurnitureDef, FurniturePanel } from '../data/furniture';
import { PANELS } from '../data/panels';

export type SelectionMode = 'panel' | 'furniture';

export interface PanelSwap {
  // For a given panel index inside a furniture instance, the new panel code overriding the default.
  [panelIndex: number]: string;
}

export interface FurnitureInstance {
  instanceId: string;
  defId: string;
  position: [number, number, number]; // mm in world space
  rotationY: number; // radians, 90deg increments
  swaps: PanelSwap;
}

export interface BoothConfig {
  W: number; // mm
  D: number; // mm
}

export const BOOTH_PRESETS: { label: string; W: number; D: number }[] = [
  { label: '2 x 2 m', W: 2000, D: 2000 },
  { label: '3 x 3 m', W: 3000, D: 3000 },
  { label: '3 x 5 m', W: 3000, D: 5000 },
  { label: '5 x 5 m', W: 5000, D: 5000 },
];

export interface SelectionPanel {
  kind: 'panel';
  instanceId: string;
  panelIndex: number;
}
export interface SelectionFurniture {
  kind: 'furniture';
  instanceId: string;
}
export type Selection = SelectionPanel | SelectionFurniture | null;

interface State {
  booth: BoothConfig;
  furniture: FurnitureInstance[];
  selection: Selection;
  selectionMode: SelectionMode;
  snapToGrid: boolean;

  setBooth: (b: BoothConfig) => void;
  addFurniture: (defId: string) => void;
  removeFurniture: (instanceId: string) => void;
  moveFurniture: (instanceId: string, position: [number, number, number]) => void;
  rotateFurniture: (instanceId: string) => void;
  setSelection: (s: Selection) => void;
  setSelectionMode: (m: SelectionMode) => void;
  setSnapToGrid: (v: boolean) => void;
  swapPanel: (instanceId: string, panelIndex: number, newCode: string, scope: 'one' | 'all') => void;
  reset: () => void;
}

let counter = 1;
function newInstanceId(defId: string): string {
  return `${defId}_${Date.now().toString(36)}_${counter++}`;
}

export const GRID_STEP = 184;

export function snap(v: number, step = GRID_STEP): number {
  return Math.round(v / step) * step;
}

export function getEffectivePanel(instance: FurnitureInstance, def: FurnitureDef, idx: number): FurniturePanel {
  const original = def.panels[idx];
  const swappedCode = instance.swaps[idx];
  if (swappedCode && swappedCode !== original.code) {
    return { ...original, code: swappedCode };
  }
  return original;
}

const initial = {
  booth: { W: 3000, D: 3000 } as BoothConfig,
  furniture: [] as FurnitureInstance[],
  selection: null as Selection,
  selectionMode: 'panel' as SelectionMode,
  snapToGrid: true,
};

export const useConfiguratorStore = create<State>()(
  persist(
    (set) => ({
      ...initial,

      setBooth: (b) => set({ booth: b }),

      addFurniture: (defId) =>
        set((s) => {
          const def = getFurnitureDef(defId);
          const inst: FurnitureInstance = {
            instanceId: newInstanceId(defId),
            defId,
            position: [0, 0, 0],
            rotationY: 0,
            swaps: {},
          };
          // ensure footprint within booth - center for now
          void def;
          return { furniture: [...s.furniture, inst] };
        }),

      removeFurniture: (instanceId) =>
        set((s) => ({
          furniture: s.furniture.filter((f) => f.instanceId !== instanceId),
          selection:
            s.selection && s.selection.instanceId === instanceId ? null : s.selection,
        })),

      moveFurniture: (instanceId, position) =>
        set((s) => ({
          furniture: s.furniture.map((f) =>
            f.instanceId === instanceId ? { ...f, position } : f
          ),
        })),

      rotateFurniture: (instanceId) =>
        set((s) => ({
          furniture: s.furniture.map((f) =>
            f.instanceId === instanceId
              ? { ...f, rotationY: (f.rotationY + Math.PI / 2) % (Math.PI * 2) }
              : f
          ),
        })),

      setSelection: (sel) => set({ selection: sel }),
      setSelectionMode: (m) => set({ selectionMode: m, selection: null }),
      setSnapToGrid: (v) => set({ snapToGrid: v }),

      swapPanel: (instanceId, panelIndex, newCode, scope) =>
        set((s) => ({
          furniture: s.furniture.map((f) => {
            if (f.instanceId !== instanceId) return f;
            const def = getFurnitureDef(f.defId);
            const orig = def.panels[panelIndex];
            const newSwaps: PanelSwap = { ...f.swaps };
            if (scope === 'one') {
              newSwaps[panelIndex] = newCode;
            } else {
              // all panels with same effective code in this furniture
              const targetCode = orig.code;
              def.panels.forEach((p, i) => {
                const currentCode = f.swaps[i] ?? p.code;
                if (currentCode === targetCode || p.code === targetCode) {
                  newSwaps[i] = newCode;
                }
              });
            }
            return { ...f, swaps: newSwaps };
          }),
        })),

      reset: () => set({ ...initial, furniture: [], selection: null }),
    }),
    {
      name: 'bjg-booth-configurator-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        booth: state.booth,
        furniture: state.furniture,
        selectionMode: state.selectionMode,
        snapToGrid: state.snapToGrid,
      }),
    }
  )
);

// Aggregated BOM helper
export interface BomRow {
  code: string;
  type: 'TP' | 'SP';
  qty: number;
  area_pezzo_m2: number;
  area_totale_m2: number;
  panels_per_sheet: number;
}

export function computeBom(furniture: FurnitureInstance[]): {
  rows: BomRow[];
  totalArea: number;
  strategyA: number;
  strategyB: number;
  totalFurnitureFootprint: number;
} {
  const counts = new Map<string, number>();
  let totalFootprint = 0;
  for (const inst of furniture) {
    const def = getFurnitureDef(inst.defId);
    totalFootprint += (def.footprint[0] * def.footprint[1]) / 1_000_000;
    def.panels.forEach((p, i) => {
      const code = inst.swaps[i] ?? p.code;
      counts.set(code, (counts.get(code) ?? 0) + 1);
    });
  }
  const rows: BomRow[] = [];
  let totalArea = 0;
  let strategyA = 0;
  for (const [code, qty] of [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const p = PANELS[code];
    if (!p) continue;
    const areaTotale = qty * p.area_m2;
    totalArea += areaTotale;
    strategyA += Math.ceil(qty / p.panels_per_sheet);
    rows.push({
      code,
      type: p.type,
      qty,
      area_pezzo_m2: p.area_m2,
      area_totale_m2: areaTotale,
      panels_per_sheet: p.panels_per_sheet,
    });
  }
  const strategyB = Math.ceil(totalArea / 2.978 / 0.85);
  return { rows, totalArea, strategyA, strategyB, totalFurnitureFootprint: totalFootprint };
}

// re-export library list for UI
export { FURNITURE_LIBRARY };
