import { BoothSizeSelector } from './components/BoothSizeSelector';
import { FurnitureLibrary } from './components/FurnitureLibrary';
import { Scene } from './components/Scene';
import { BOMPanel } from './components/BOMPanel';
import { PanelSwapMenu } from './components/PanelSwapMenu';
import { FurnitureToolbar } from './components/FurnitureToolbar';
import { useConfiguratorStore } from './store/configurator';

export default function App() {
  const selection = useConfiguratorStore((s) => s.selection);

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-gray-100">
      <BoothSizeSelector />
      <div className="flex flex-1 min-h-0 relative">
        <FurnitureLibrary />
        <div className="flex-1 relative min-w-0">
          <Scene />
          {selection?.kind === 'panel' && <PanelSwapMenu />}
          {selection?.kind === 'furniture' && <FurnitureToolbar />}
        </div>
        <BOMPanel />
      </div>
    </div>
  );
}
