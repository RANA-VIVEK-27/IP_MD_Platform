'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

// Configuration for the DNA Helix
const NUM_BASE_PAIRS = 32;
const HELIX_RADIUS = 2.0;
const HELIX_HEIGHT = 18;
const BASE_PAIR_DISTANCE = HELIX_HEIGHT / NUM_BASE_PAIRS;
const ROTATION_PER_PAIR = Math.PI / 8;

// Materials
const primaryMaterial = new THREE.MeshPhysicalMaterial({
  color: '#0B6E6B', // Deep Medical Teal
  emissive: '#0B6E6B',
  emissiveIntensity: 0.6,
  roughness: 0.1,
  metalness: 0.4,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  transparent: true,
  opacity: 0.9,
});

const secondaryMaterial = new THREE.MeshPhysicalMaterial({
  color: '#14A3C7', // Medical Cyan
  emissive: '#14A3C7',
  emissiveIntensity: 0.6,
  roughness: 0.1,
  metalness: 0.4,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  transparent: true,
  opacity: 0.9,
});

const connectionMaterial = new THREE.MeshStandardMaterial({
  color: '#E8F5F4',
  emissive: '#E8F5F4',
  emissiveIntensity: 0.4,
  transparent: true,
  opacity: 0.4,
  roughness: 0.2,
});

function DNAHelix() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.2;
      groupRef.current.position.y = Math.sin(clock.getElapsedTime() * 0.5) * 0.5;
    }
  });

  const basePairs = useMemo(() => {
    const pairs = [];
    for (let i = 0; i < NUM_BASE_PAIRS; i++) {
      const y = (i * BASE_PAIR_DISTANCE) - (HELIX_HEIGHT / 2);
      const angle = i * ROTATION_PER_PAIR;
      
      const x1 = Math.cos(angle) * HELIX_RADIUS;
      const z1 = Math.sin(angle) * HELIX_RADIUS;
      
      const x2 = Math.cos(angle + Math.PI) * HELIX_RADIUS;
      const z2 = Math.sin(angle + Math.PI) * HELIX_RADIUS;

      pairs.push({ x1, z1, x2, z2, y, angle });
    }
    return pairs;
  }, []);

  return (
    <group ref={groupRef}>
      {basePairs.map((pair, index) => (
        <group key={index}>
          {/* Backbone 1 */}
          <Sphere args={[0.25, 32, 32]} position={[pair.x1, pair.y, pair.z1]} material={primaryMaterial} />
          {/* Backbone 2 */}
          <Sphere args={[0.25, 32, 32]} position={[pair.x2, pair.y, pair.z2]} material={secondaryMaterial} />
          
          {/* Connection Line */}
          <Cylinder 
            args={[0.04, 0.04, HELIX_RADIUS * 2]} 
            position={[0, pair.y, 0]} 
            rotation={[Math.PI / 2, 0, -pair.angle]} 
            material={connectionMaterial} 
          />

          {/* Inner Base Pair Nodes */}
          <Sphere args={[0.15, 16, 16]} position={[pair.x1 * 0.4, pair.y, pair.z1 * 0.4]} material={primaryMaterial} />
          <Sphere args={[0.15, 16, 16]} position={[pair.x2 * 0.4, pair.y, pair.z2 * 0.4]} material={secondaryMaterial} />
        </group>
      ))}
    </group>
  );
}

function AmbientParticles({ count = 100 }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      temp.push({
        position: [
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
        ],
        factor: Math.random() * 0.5 + 0.5,
        speed: Math.random() * 0.01 + 0.005,
        xFactor: Math.random() * 0.5 + 0.5,
        yFactor: Math.random() * 0.5 + 0.5,
        zFactor: Math.random() * 0.5 + 0.5,
      });
    }
    return temp;
  }, [count]);

  useFrame(() => {
    if (!meshRef.current) return;
    
    particles.forEach((particle, i) => {
      const { position, speed, xFactor, yFactor, zFactor } = particle;
      const t = (particle.factor += speed);
      
      dummy.position.set(
        position[0] + Math.sin(t * xFactor) * 2,
        position[1] + Math.cos(t * yFactor) * 2,
        position[2] + Math.sin(t * zFactor) * 2
      );
      dummy.scale.setScalar(Math.sin(t) * 0.1 + 0.15);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color="#189B6A" transparent opacity={0.3} />
    </instancedMesh>
  );
}

export function HealthcareScene() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: 400, borderRadius: 20, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(11, 110, 107, 0.1)', borderTopColor: 'var(--primary)', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 500, borderRadius: 20, overflow: 'hidden', cursor: 'grab', background: 'transparent' }} onMouseDown={(e) => (e.currentTarget.style.cursor = 'grabbing')} onMouseUp={(e) => (e.currentTarget.style.cursor = 'grab')} onMouseLeave={(e) => (e.currentTarget.style.cursor = 'grab')}>
      <Canvas camera={{ position: [0, 0, 16], fov: 45 }} gl={{ alpha: true }}>
        {/* Environment and Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} color="#ffffff" />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} color="#14A3C7" />
        <pointLight position={[0, 0, 0]} intensity={1} color="#0B6E6B" />
        
        {/* Core DNA Structure */}
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
          <DNAHelix />
        </Float>

        {/* Floating Background Particles */}
        <AmbientParticles count={150} />

        {/* Controls */}
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2 + 0.2}
          minPolarAngle={Math.PI / 2 - 0.2}
        />
      </Canvas>
    </div>
  );
}
