import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Edges } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { Panel } from '../data/panels';

interface Props {
  panel: Panel;
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
  selected: boolean;
  furnitureSelected: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}

function lighten(hex: string, amount = 0.15): string {
  const c = new THREE.Color(hex);
  c.r = Math.min(1, c.r + amount);
  c.g = Math.min(1, c.g + amount);
  c.b = Math.min(1, c.b + amount);
  return `#${c.getHexString()}`;
}

export function Panel3D({ panel, position, rotation, color, selected, furnitureSelected, onClick }: Props) {
  const [hovered, setHovered] = useState(false);
  const displayColor = useMemo(() => {
    if (selected) return lighten(color, 0.3);
    if (hovered) return lighten(color, 0.12);
    return color;
  }, [color, hovered, selected]);

  // Box geometry: w along X, h along Y, thickness along Z
  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[panel.w, panel.h, panel.thickness]} />
      <meshLambertMaterial color={displayColor} />
      <Edges
        threshold={1}
        color={selected || furnitureSelected ? '#ffffff' : '#111111'}
        linewidth={selected || furnitureSelected ? 2 : 1}
      />
    </mesh>
  );
}
