import { useMemo } from 'react';
import * as THREE from 'three';

interface Props {
  W: number;
  D: number;
}

const GRID = 184;

export function Floor({ W, D }: Props) {
  const gridGeometry = useMemo(() => {
    const positions: number[] = [];
    const halfW = W / 2;
    const halfD = D / 2;
    // lines parallel to Z, every GRID along X
    for (let x = -halfW; x <= halfW + 0.01; x += GRID) {
      positions.push(x, 0.5, -halfD, x, 0.5, halfD);
    }
    for (let z = -halfD; z <= halfD + 0.01; z += GRID) {
      positions.push(-halfW, 0.5, z, halfW, 0.5, z);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geom;
  }, [W, D]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W, D]} />
        <meshLambertMaterial color="#cccccc" />
      </mesh>
      <lineSegments>
        <primitive attach="geometry" object={gridGeometry} />
        <lineBasicMaterial color="#888888" />
      </lineSegments>
      {/* booth border */}
      <lineSegments position={[0, 1, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(W, 0.5, D)]} />
        <lineBasicMaterial color="#ffffff" linewidth={2} />
      </lineSegments>
    </group>
  );
}
