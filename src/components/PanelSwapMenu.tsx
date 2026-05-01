import { useMemo, useState } from 'react';
import { getEffectivePanel, useConfiguratorStore } from '../store/configurator';
import { getFurnitureDef } from '../data/furniture';
import { getPanel, panelsByType } from '../data/panels';

export function PanelSwapMenu() {
  const selection = useConfiguratorStore((s) => s.selection);
  const furniture = useConfiguratorStore((s) => s.furniture);
  const swapPanel = useConfiguratorStore((s) => s.swapPanel);
  const setSelection = useConfiguratorStore((s) => s.setSelection);

  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<null | {
    title: string;
    message: string;
    actions: { label: string; primary?: boolean; onClick: () => void }[];
  }>(null);

  const data = useMemo(() => {
    if (!selection || selection.kind !== 'panel') return null;
    const inst = furniture.find((f) => f.instanceId === selection.instanceId);
    if (!inst) return null;
    const def = getFurnitureDef(inst.defId);
    const orig = def.panels[selection.panelIndex];
    const eff = getEffectivePanel(inst, def, selection.panelIndex);
    const panel = getPanel(eff.code);
    return { inst, def, orig, panel };
  }, [selection, furniture]);

  if (!data || !selection || selection.kind !== 'panel') return null;
  const { inst, def, panel } = data;
  const panelIndex = selection.panelIndex;
  const instanceId = selection.instanceId;

  const compatible = panelsByType(panel.type);

  function applySwap(newCode: string, scope: 'one' | 'all') {
    swapPanel(instanceId, panelIndex, newCode, scope);
    setPendingCode(null);
    setConfirmModal(null);
  }

  function onPick(newCode: string) {
    if (newCode === panel.code) return;
    const newPanel = getPanel(newCode);
    setPendingCode(newCode);

    // Mismatch checks for SP: other SPs in same furniture have different H code
    if (panel.type === 'SP') {
      const otherHCodes = new Set<string>();
      def.panels.forEach((p, i) => {
        if (i === panelIndex) return;
        const code = inst.swaps[i] ?? p.code;
        const pp = getPanel(code);
        if (pp.type === 'SP') otherHCodes.add(pp.hCode);
      });
      if (otherHCodes.size > 0 && !otherHCodes.has(newPanel.hCode)) {
        const other = [...otherHCodes].join(', ');
        setConfirmModal({
          title: 'Attenzione',
          message: `Gli altri pannelli SP di questo mobile hanno altezza H=${other}. Vuoi cambiarli tutti o solo questo?`,
          actions: [
            {
              label: 'Cambia tutti',
              primary: true,
              onClick: () => applySwap(newCode, 'all'),
            },
            { label: 'Solo questo', onClick: () => applySwap(newCode, 'one') },
            { label: 'Annulla', onClick: () => setConfirmModal(null) },
          ],
        });
        return;
      }
    }

    // Mismatch checks for TP: SPs underneath define a footprint that doesn't match
    if (panel.type === 'TP') {
      const spWCodes = new Set<string>();
      def.panels.forEach((p, i) => {
        const code = inst.swaps[i] ?? p.code;
        const pp = getPanel(code);
        if (pp.type === 'SP') spWCodes.add(pp.wCode);
      });
      // crude: if newPanel.wCode not in spWCodes
      if (spWCodes.size > 0 && !spWCodes.has(newPanel.wCode)) {
        setConfirmModal({
          title: 'Attenzione',
          message:
            'Il TP non corrisponde alla pianta dei pannelli SP. Procedere comunque?',
          actions: [
            { label: 'Sì', primary: true, onClick: () => applySwap(newCode, 'one') },
            { label: 'No', onClick: () => setConfirmModal(null) },
          ],
        });
        return;
      }
    }

    // Default: ask which scope
    setConfirmModal({
      title: 'Sostituisci pannello',
      message: 'Applicare la sostituzione a quale scope?',
      actions: [
        {
          label: 'Solo questo pannello',
          primary: true,
          onClick: () => applySwap(newCode, 'one'),
        },
        {
          label: 'Tutti i pannelli identici',
          onClick: () => applySwap(newCode, 'all'),
        },
        { label: 'Annulla', onClick: () => setConfirmModal(null) },
      ],
    });
  }

  return (
    <>
      <div
        className="absolute top-20 right-[360px] w-72 bg-gray-900 border border-gray-700 rounded shadow-2xl text-gray-100 z-30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <div className="text-xs uppercase tracking-wider text-gray-400">
            Pannello selezionato
          </div>
          <button
            className="text-gray-400 hover:text-white"
            onClick={() => setSelection(null)}
            title="Chiudi"
          >
            ✕
          </button>
        </div>
        <div className="p-3 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Mobile</span>
            <span className="text-gray-100 truncate ml-2">{def.name}</span>
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-gray-400">Codice attuale</span>
            <span className="text-gray-100">{panel.code}</span>
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-gray-400">Dimensioni</span>
            <span className="text-gray-100">
              {panel.w} × {panel.h} × {panel.thickness}
            </span>
          </div>
          <div className="flex justify-between font-mono">
            <span className="text-gray-400">Tipo</span>
            <span className="text-gray-100">{panel.type}</span>
          </div>
        </div>
        <div className="px-3 pb-3">
          <label className="text-xs text-gray-400 block mb-1">
            Sostituisci con
          </label>
          <select
            className="w-full bg-gray-800 border border-gray-700 text-gray-100 text-xs px-2 py-1.5 rounded font-mono"
            value={pendingCode ?? panel.code}
            onChange={(e) => onPick(e.target.value)}
          >
            {compatible.map((p) => (
              <option key={p.code} value={p.code}>
                {p.code} ({p.w}×{p.h})
              </option>
            ))}
          </select>
          <div className="text-[10px] text-gray-500 mt-2">
            Sub-opzioni di scope nel popup di conferma:
            <br />• Solo questo pannello
            <br />• Tutti i pannelli identici in questo mobile
          </div>
        </div>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-96 p-4">
            <div className="text-sm font-semibold text-gray-100 mb-2">
              {confirmModal.title}
            </div>
            <div className="text-xs text-gray-300 mb-4">{confirmModal.message}</div>
            <div className="flex flex-col gap-2">
              {confirmModal.actions.map((a, i) => (
                <button
                  key={i}
                  onClick={a.onClick}
                  className={`text-xs px-3 py-2 rounded ${
                    a.primary
                      ? 'bg-blue-600 hover:bg-blue-500 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
