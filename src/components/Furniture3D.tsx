import { FurnitureInstance, getEffectivePanel, useConfiguratorStore } from '../store/configurator';
import { getFurnitureDef } from '../data/furniture';
import { getPanel } from '../data/panels';
import { Panel3D } from './Panel3D';

interface Props {
  instance: FurnitureInstance;
}

export function Furniture3D({ instance }: Props) {
  const def = getFurnitureDef(instance.defId);
  const selection = useConfiguratorStore((s) => s.selection);
  const setSelection = useConfiguratorStore((s) => s.setSelection);
  const selectionMode = useConfiguratorStore((s) => s.selectionMode);

  const furnitureSelected =
    selection?.kind === 'furniture' && selection.instanceId === instance.instanceId;

  return (
    <group position={instance.position} rotation={[0, instance.rotationY, 0]}>
      {def.panels.map((p, idx) => {
        const eff = getEffectivePanel(instance, def, idx);
        const panel = getPanel(eff.code);
        const isSelected =
          selection?.kind === 'panel' &&
          selection.instanceId === instance.instanceId &&
          selection.panelIndex === idx;
        return (
          <Panel3D
            key={idx}
            panel={panel}
            position={p.position}
            rotation={p.rotation}
            color={def.color}
            selected={isSelected}
            furnitureSelected={furnitureSelected}
            onClick={() => {
              if (selectionMode === 'furniture') {
                setSelection({ kind: 'furniture', instanceId: instance.instanceId });
              } else {
                setSelection({ kind: 'panel', instanceId: instance.instanceId, panelIndex: idx });
              }
            }}
          />
        );
      })}
    </group>
  );
}
