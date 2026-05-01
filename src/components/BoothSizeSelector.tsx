import { BOOTH_PRESETS, useConfiguratorStore } from '../store/configurator';

export function BoothSizeSelector() {
  const booth = useConfiguratorStore((s) => s.booth);
  const setBooth = useConfiguratorStore((s) => s.setBooth);
  const selectionMode = useConfiguratorStore((s) => s.selectionMode);
  const setSelectionMode = useConfiguratorStore((s) => s.setSelectionMode);
  const snapToGrid = useConfiguratorStore((s) => s.snapToGrid);
  const setSnapToGrid = useConfiguratorStore((s) => s.setSnapToGrid);
  const reset = useConfiguratorStore((s) => s.reset);

  const matchingPreset = BOOTH_PRESETS.find(
    (p) => p.W === booth.W && p.D === booth.D
  )?.label;

  return (
    <header className="h-14 shrink-0 border-b border-gray-800 bg-gray-900 px-4 flex items-center gap-4">
      <div className="text-sm font-semibold text-gray-100 mr-4">
        BJG Booth Configurator 3D
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Booth:</label>
        <select
          className="bg-gray-800 text-gray-100 text-xs border border-gray-700 rounded px-2 py-1"
          value={matchingPreset ?? 'custom'}
          onChange={(e) => {
            const v = e.target.value;
            const preset = BOOTH_PRESETS.find((p) => p.label === v);
            if (preset) setBooth({ W: preset.W, D: preset.D });
          }}
        >
          {BOOTH_PRESETS.map((p) => (
            <option key={p.label} value={p.label}>
              {p.label}
            </option>
          ))}
          <option value="custom">Personalizzato</option>
        </select>
        <input
          type="number"
          className="bg-gray-800 text-gray-100 text-xs border border-gray-700 rounded px-2 py-1 w-20"
          value={booth.W}
          onChange={(e) => setBooth({ ...booth, W: Math.max(184, +e.target.value || 0) })}
        />
        <span className="text-xs text-gray-500">×</span>
        <input
          type="number"
          className="bg-gray-800 text-gray-100 text-xs border border-gray-700 rounded px-2 py-1 w-20"
          value={booth.D}
          onChange={(e) => setBooth({ ...booth, D: Math.max(184, +e.target.value || 0) })}
        />
        <span className="text-xs text-gray-500">mm</span>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <label className="text-xs text-gray-400">Selezione:</label>
        <div className="flex bg-gray-800 rounded border border-gray-700 overflow-hidden">
          <button
            className={`text-xs px-3 py-1 ${
              selectionMode === 'panel'
                ? 'bg-gray-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => setSelectionMode('panel')}
          >
            Pannello
          </button>
          <button
            className={`text-xs px-3 py-1 ${
              selectionMode === 'furniture'
                ? 'bg-gray-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => setSelectionMode('furniture')}
          >
            Mobile
          </button>
        </div>
      </div>

      <label className="flex items-center gap-1.5 ml-2 text-xs text-gray-300">
        <input
          type="checkbox"
          checked={snapToGrid}
          onChange={(e) => setSnapToGrid(e.target.checked)}
        />
        Snap 184mm
      </label>

      <div className="flex-1" />

      <button
        onClick={() => {
          if (confirm('Reset booth e tutti i mobili?')) reset();
        }}
        className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1 rounded border border-gray-700"
      >
        Reset booth
      </button>
    </header>
  );
}
