import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { seededRandom } from '../../utils/random';
function ParticleField({ count = 1500 }) {
    const ref = useRef(null);
    const { positions, colors } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const palette = [
            new THREE.Color('#00ffff'),
            new THREE.Color('#a855f7'),
            new THREE.Color('#ff00ff'),
            new THREE.Color('#7c3aed'),
        ];
        for (let i = 0; i < count; i++) {
            const r = 8 + seededRandom(i + 11) * 14;
            const theta = seededRandom(i + 23) * Math.PI * 2;
            const phi = Math.acos(2 * seededRandom(i + 37) - 1);
            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = r * Math.cos(phi);
            const c = palette[Math.floor(seededRandom(i + 47) * palette.length)];
            col[i * 3] = c.r;
            col[i * 3 + 1] = c.g;
            col[i * 3 + 2] = c.b;
        }
        return { positions: pos, colors: col };
    }, [count]);
    useFrame((state, delta) => {
        if (!ref.current)
            return;
        ref.current.rotation.y += delta * 0.04;
        ref.current.rotation.x += delta * 0.015;
        const t = state.clock.getElapsedTime();
        const m = ref.current.material;
        m.size = 0.04 + Math.sin(t * 1.2) * 0.01;
    });
    return (<points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]}/>
        <bufferAttribute attach="attributes-color" args={[colors, 3]}/>
      </bufferGeometry>
      <pointsMaterial size={0.04} sizeAttenuation vertexColors transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false}/>
    </points>);
}
export function ParticleBackground({ className = '', density = 'high', }) {
    const count = density === 'low' ? 600 : density === 'med' ? 1000 : 1600;
    return (<div className={`absolute inset-0 -z-10 pointer-events-none ${className}`} aria-hidden>
      <Canvas camera={{ position: [0, 0, 12], fov: 60 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <ParticleField count={count}/>
      </Canvas>
    </div>);
}
