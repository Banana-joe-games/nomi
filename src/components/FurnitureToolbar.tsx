import { snap, GRID_STEP, useConfiguratorStore } from '../store/configurator';
import { getFurnitureDef } from '../data/furniture';

export function FurnitureToolbar() {
  const selection = useConfiguratorStore((s) => s.selection);
  const furniture = useConfiguratorStore((s) => s.furniture);
  const moveFurniture = useConfiguratorStore((s) => s.moveFurniture);
  const rotateFurniture = useConfiguratorStore((s) => s.rotateFurniture);
  const removeFurniture = useConfiguratorStore((s) => s.removeFurniture);
  const snapToGrid = useConfiguratorStore((s) => s.snapToGrid);

  if (!selection || selection.kind !== 'furniture') return null;
  const inst = furniture.find((f) => f.instanceId === selection.instanceId);
  if (!inst) return null;
  const def = getFurnitureDef(inst.defId);

  const step = snapToGrid ? GRID_STEP : 50;

  function move(dx: number, dz: number) {
    if (!inst) return;
    const [x, y, z] = inst.position;
    let nx = x + dx;
    let nz = z + dz;
    if (snapToGrid) {
      nx = snap(nx);
      nz = snap(nz);
    }
    moveFurniture(inst.instanceId, [nx, y, nz]);
  }

  return (
    <div className="absolute top-20 right-[360px] w-72 bg-gray-900 border border-gray-700 rounded shadow-2xl text-gray-100 z-30">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
        <div className="text-xs uppercase tracking-wider text-gray-400">
          Mobile selezionato
        </div>
        <div
          className="w-3 h-3 rounded"
          style={{ backgroundColor: def.color }}
        />
      </div>
      <div className="p-3 text-xs space-y-2">
        <div className="text-gray-100 font-medium">{def.name}</div>
        <div className="text-gray-400 font-mono">
          x: {inst.position[0]}mm  z: {inst.position[2]}mm
        </div>
        <div className="text-gray-500 text-[10px]">
          R = ruota 90°, Canc = elimina
        </div>
      </div>
      <div className="px-3 pb-3 grid grid-cols-3 gap-1">
        <div />
        <button
          className="bg-gray-800 hover:bg-gray-700 rounded py-2 text-xs"
          onClick={() => move(0, -step)}
        >
          ↑
        </button>
        <div />
        <button
          className="bg-gray-800 hover:bg-gray-700 rounded py-2 text-xs"
          onClick={() => move(-step, 0)}
        >
          ←
        </button>
        <button
          className="bg-gray-800 hover:bg-gray-700 rounded py-2 text-xs"
          onClick={() => rotateFurniture(inst.instanceId)}
          title="Ruota 90°"
        >
          ⟳
        </button>
        <button
          className="bg-gray-800 hover:bg-gray-700 rounded py-2 text-xs"
          onClick={() => move(step, 0)}
        >
          →
        </button>
        <div />
        <button
          className="bg-gray-800 hover:bg-gray-700 rounded py-2 text-xs"
          onClick={() => move(0, step)}
        >
          ↓
        </button>
        <div />
      </div>
      <div className="px-3 pb-3">
        <button
          className="w-full bg-red-700 hover:bg-red-600 text-white text-xs py-2 rounded"
          onClick={() => removeFurniture(inst.instanceId)}
        >
          Elimina
        </button>
      </div>
    </div>
  );
}
