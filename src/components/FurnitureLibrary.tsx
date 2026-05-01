import { FURNITURE_LIBRARY, useConfiguratorStore } from '../store/configurator';

export function FurnitureLibrary() {
  const addFurniture = useConfiguratorStore((s) => s.addFurniture);
  return (
    <div className="w-[260px] border-r border-gray-800 bg-gray-900 overflow-y-auto">
      <div className="p-3 text-xs uppercase tracking-wider text-gray-400 border-b border-gray-800">
        Mobili
      </div>
      <div className="p-3 space-y-3">
        {FURNITURE_LIBRARY.map((f) => (
          <div
            key={f.id}
            className="bg-gray-800 rounded p-3 border border-gray-700 hover:border-gray-500 transition"
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-5 h-5 rounded border border-gray-500"
                style={{ backgroundColor: f.color }}
              />
              <div className="text-sm font-medium text-gray-100">{f.name}</div>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              {f.footprint[0]} × {f.footprint[1]} × {f.height} mm
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {f.panels.length} pannelli
            </div>
            <button
              className="mt-2 w-full text-xs bg-gray-700 hover:bg-gray-600 text-gray-100 py-1.5 rounded transition"
              onClick={() => addFurniture(f.id)}
            >
              + Aggiungi
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
