import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect } from 'react';
import { useConfiguratorStore } from '../store/configurator';
import { Floor } from './Floor';
import { Furniture3D } from './Furniture3D';

export function Scene() {
  const booth = useConfiguratorStore((s) => s.booth);
  const furniture = useConfiguratorStore((s) => s.furniture);
  const setSelection = useConfiguratorStore((s) => s.setSelection);
  const selection = useConfiguratorStore((s) => s.selection);
  const removeFurniture = useConfiguratorStore((s) => s.removeFurniture);
  const rotateFurniture = useConfiguratorStore((s) => s.rotateFurniture);
  const selectionMode = useConfiguratorStore((s) => s.selectionMode);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selection) return;
      if (selectionMode !== 'furniture') return;
      if (e.key === 'r' || e.key === 'R') {
        rotateFurniture(selection.instanceId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        removeFurniture(selection.instanceId);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, selectionMode, rotateFurniture, removeFurniture]);

  return (
    <Canvas
      shadows
      camera={{ position: [5000, 4000, 5000], fov: 45, near: 10, far: 50000 }}
      onPointerMissed={() => setSelection(null)}
      style={{ background: '#1a1a1a' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[3000, 5000, 2000]}
        intensity={0.9}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <OrbitControls
        target={[0, 500, 0]}
        enablePan
        enableRotate
        enableZoom
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
      <Floor W={booth.W} D={booth.D} />
      {furniture.map((f) => (
        <Furniture3D key={f.instanceId} instance={f} />
      ))}
    </Canvas>
  );
}
