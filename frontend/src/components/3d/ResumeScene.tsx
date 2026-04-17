import { useRef } from 'react';
import { type RootState, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

export function FloatingResume() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state: RootState) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <Float
      speed={2}
      rotationIntensity={0.5}
      floatIntensity={0.5}
    >
      <mesh ref={meshRef} position={[0, 0, 0]}>
        {/* Resume document shape */}
        <boxGeometry args={[2, 2.8, 0.05]} />
        <meshStandardMaterial
          color="#ffffff"
          metalness={0.1}
          roughness={0.2}
        />
        
        {/* Document lines decoration */}
        <mesh position={[0, 0, 0.026]}>
          <boxGeometry args={[1.6, 0.05, 0.01]} />
          <meshStandardMaterial color="#6366f1" />
        </mesh>
        <mesh position={[0, 0.3, 0.026]}>
          <boxGeometry args={[1.6, 0.05, 0.01]} />
          <meshStandardMaterial color="#8b5cf6" />
        </mesh>
        <mesh position={[0, -0.3, 0.026]}>
          <boxGeometry args={[1.6, 0.05, 0.01]} />
          <meshStandardMaterial color="#a78bfa" />
        </mesh>
      </mesh>
    </Float>
  );
}

export function AIBrain() {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state: RootState) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={[3, 0, 0]}>
      {/* Central sphere */}
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial
          color="#6366f1"
          emissive="#6366f1"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Neural network connections */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const x = Math.cos(angle) * 1.2;
        const z = Math.sin(angle) * 1.2;
        return (
          <mesh key={i} position={[x, 0, z]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
              color="#8b5cf6"
              emissive="#8b5cf6"
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function ParticleField() {
  const particlesRef = useRef<THREE.Points>(null);
  
  useFrame((state: RootState) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  const particleCount = 100;
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#8b5cf6"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}
