import { useMemo } from 'react';
import { computeBom, useConfiguratorStore } from '../store/configurator';
import { getFurnitureDef } from '../data/furniture';
import { PANELS } from '../data/panels';

function exportCsv(rows: ReturnType<typeof computeBom>['rows'], panelsMap: Record<string, { w: number; h: number }>) {
  const header = ['Codice', 'Tipo', 'W_mm', 'H_mm', 'Quantita', 'Area_pezzo_m2', 'Area_totale_m2'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const p = panelsMap[r.code];
    lines.push(
      [
        r.code,
        r.type,
        p?.w ?? '',
        p?.h ?? '',
        r.qty,
        r.area_pezzo_m2.toFixed(4),
        r.area_totale_m2.toFixed(4),
      ].join(',')
    );
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'bjg-bom.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export function BOMPanel() {
  const furniture = useConfiguratorStore((s) => s.furniture);
  const booth = useConfiguratorStore((s) => s.booth);
  const removeFurniture = useConfiguratorStore((s) => s.removeFurniture);

  const bom = useMemo(() => computeBom(furniture), [furniture]);

  const boothArea = (booth.W * booth.D) / 1_000_000;
  const coverage = boothArea > 0 ? (bom.totalFurnitureFootprint / boothArea) * 100 : 0;

  // panel dims map for CSV
  const panelsDims = useMemo(() => {
    const map: Record<string, { w: number; h: number }> = {};
    for (const k in PANELS) map[k] = { w: PANELS[k].w, h: PANELS[k].h };
    return map;
  }, []);

  return (
    <div className="w-[340px] border-l border-gray-800 bg-gray-900 overflow-y-auto flex flex-col">
      <div className="p-3 border-b border-gray-800">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
          Mobili nel booth ({furniture.length})
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {furniture.length === 0 && (
            <div className="text-xs text-gray-500 italic">Nessun mobile</div>
          )}
          {furniture.map((f) => {
            const def = getFurnitureDef(f.defId);
            return (
              <div
                key={f.instanceId}
                className="flex items-center justify-between bg-gray-800 rounded px-2 py-1 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded shrink-0"
                    style={{ backgroundColor: def.color }}
                  />
                  <span className="truncate">{def.name}</span>
                </div>
                <button
                  className="text-gray-400 hover:text-red-400 ml-2"
                  onClick={() => removeFurniture(f.instanceId)}
                  title="Elimina"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-wider text-gray-400">
            Pannelli totali
          </div>
          <button
            onClick={() => exportCsv(bom.rows, panelsDims)}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
          >
            Esporta CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pr-1 pb-1">Codice</th>
                <th className="text-right px-1 pb-1">Q.tà</th>
                <th className="text-right px-1 pb-1">m²/pz</th>
                <th className="text-right pl-1 pb-1">m² tot</th>
              </tr>
            </thead>
            <tbody>
              {bom.rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-gray-600 italic py-2 text-center">
                    —
                  </td>
                </tr>
              )}
              {bom.rows.map((r) => (
                <tr key={r.code} className="border-b border-gray-800/50">
                  <td className="text-gray-200 py-0.5 pr-1">{r.code}</td>
                  <td className="text-right text-gray-200 px-1">{r.qty}</td>
                  <td className="text-right text-gray-400 px-1">
                    {r.area_pezzo_m2.toFixed(3)}
                  </td>
                  <td className="text-right text-gray-200 pl-1">
                    {r.area_totale_m2.toFixed(3)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-3 border-b border-gray-800">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
          Lastre 1220×2440
        </div>
        <div className="text-xs space-y-1 font-mono">
          <div className="flex justify-between">
            <span className="text-gray-400">Strategia A (dedicata)</span>
            <span className="text-gray-100">{bom.strategyA}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Strategia B (mix, 85%)</span>
            <span className="text-gray-100">{bom.strategyB}</span>
          </div>
          <div className="flex justify-between mt-1 pt-1 border-t border-gray-800">
            <span className="text-gray-400">Area totale</span>
            <span className="text-gray-100">{bom.totalArea.toFixed(2)} m²</span>
          </div>
        </div>
      </div>

      <div className="p-3">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">
          Footprint
        </div>
        <div className="text-xs space-y-1 font-mono">
          <div className="flex justify-between">
            <span className="text-gray-400">Mobili</span>
            <span className="text-gray-100">
              {bom.totalFurnitureFootprint.toFixed(2)} m²
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Booth</span>
            <span className="text-gray-100">{boothArea.toFixed(2)} m²</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Copertura</span>
            <span className="text-gray-100">{coverage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
