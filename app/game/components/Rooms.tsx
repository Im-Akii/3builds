"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import * as THREE from "three";
import { clampDt } from "../runtime";
import { useGame } from "../store";
import {
  Cabinet,
  CeilingLight,
  Chair,
  Crate,
  Desk,
  Locker,
  Monitor,
  MonitorBank,
  Plant,
  Reception,
  Shelf,
  Sofa,
  StatusLight,
  WaterCooler,
  Whiteboard,
  WoodCrate,
} from "./Furniture";

/* --------------------------------------------------------------- lobby ---- */

function Lobby() {
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid">
        <Reception position={[-2.6, 0, 5.0]} />
        <Sofa position={[3.9, 0, 4.2]} rotationY={-Math.PI / 2} />
        {/* low display block in the middle of the room */}
        <mesh position={[0, 0.22, -1.2]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.44, 1.6]} />
          <meshStandardMaterial color="#3f434a" roughness={0.8} />
        </mesh>
      </RigidBody>

      <Plant position={[0, 0.44, -1.2]} scale={1.25} />
      <Plant position={[-4.7, 0, 6.2]} />
      <Plant position={[4.7, 0, 6.2]} />
      <Plant position={[-4.7, 0, -6.2]} />
      <Plant position={[4.7, 0, -6.2]} />
      <Monitor position={[-3.9, 1.19, 4.7]} rotationY={0.2} scale={0.7} />

      {/* wayfinding sign on the north wall */}
      <group position={[0, 2.5, -6.8]}>
        <mesh>
          <boxGeometry args={[3.0, 0.7, 0.06]} />
          <meshStandardMaterial color="#22262c" roughness={0.6} />
        </mesh>
        <mesh position={[-0.75, 0, 0.04]}>
          <planeGeometry args={[1.2, 0.16]} />
          <meshBasicMaterial color="#4aa8ff" />
        </mesh>
        <mesh position={[0.78, 0, 0.04]}>
          <planeGeometry args={[1.2, 0.16]} />
          <meshBasicMaterial color="#ffd23b" />
        </mesh>
      </group>

      <CeilingLight position={[0, 3.55, 4.2]} cast />
      <CeilingLight position={[0, 3.55, -0.5]} />
      <CeilingLight position={[0, 3.55, -5.2]} />
    </group>
  );
}

/* ------------------------------------------------------- security room ---- */

function SecurityRoom() {
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid">
        <Desk position={[-15, 0, -5.9]} size={[5.2, 0.75, 1.1]} />
        <Desk position={[-9.6, 0, 2.6]} size={[1.8, 0.72, 0.9]} rotationY={0.2} />
        <Locker position={[-21.5, 0, -5.2]} />
        <Locker position={[-21.5, 0, -3.9]} />
        <Shelf position={[-21.5, 0, 0.4]} />
        <Cabinet position={[-8.6, 0, -4.4]} rotationY={Math.PI} />
        <Cabinet position={[-8.6, 0, -3.5]} rotationY={Math.PI} />
      </RigidBody>

      <WaterCooler position={[-20.6, 0, 4.8]} />

      <MonitorBank position={[-15, 0.79, -5.75]} />
      <Chair position={[-15, 0, -4.6]} rotationY={Math.PI} />
      <Monitor position={[-9.6, 0.76, 2.6]} rotationY={Math.PI + 0.2} scale={0.8} />
      <Whiteboard position={[-10.6, 2.1, -6.8]} />
      <Plant position={[-8.9, 0, 5.6]} />
      <Crate position={[-19.4, 0.42, 6.2]} size={0.84} color="#6f7a3e" />
      <Crate position={[-18.5, 0.42, 6.2]} size={0.84} color="#6f7a3e" />
      <StatusLight position={[-15, 1.62, -6.4]} color="#39ff88" />

      <CeilingLight position={[-18.5, 3.55, -3.5]} cast />
      <CeilingLight position={[-11.5, 3.55, -3.5]} />
      <CeilingLight position={[-15, 3.55, -5.6]} />
      <CeilingLight position={[-15, 3.55, 3.5]} />
    </group>
  );
}

/* ---------------------------------------------------------- vault room ---- */

/** The round door sitting in the north-wall opening of the vault room. */
function VaultDoor() {
  const open = useGame((s) => s.vaultOpen);
  const pivot = useRef<THREE.Group>(null);
  const wheel = useRef<THREE.Group>(null);

  useFrame((_, rawDt) => {
    const dt = clampDt(rawDt);
    if (pivot.current) {
      const target = open ? -1.4 : 0;
      pivot.current.rotation.y +=
        (target - pivot.current.rotation.y) * Math.min(1, dt * 1.4);
    }
    if (wheel.current && open) wheel.current.rotation.z += dt * 1.2;
  });

  return (
    <group>
      {/* reinforced surround */}
      <mesh position={[15, 1.5, -6.82]} receiveShadow>
        <boxGeometry args={[4.6, 3.4, 0.12]} />
        <meshStandardMaterial color="#6d6b66" roughness={0.8} />
      </mesh>
      <mesh position={[15, 1.5, -6.9]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.72, 1.72, 0.08, 40]} />
        <meshStandardMaterial
          color="#0d0f12"
          emissive={open ? "#e8b24a" : "#000000"}
          emissiveIntensity={open ? 0.5 : 0}
        />
      </mesh>

      <group ref={pivot} position={[13.45, 1.5, -6.75]}>
        <group position={[1.55, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[1.68, 1.68, 0.3, 44]} />
            <meshStandardMaterial color="#a3a29d" roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
            <torusGeometry args={[1.44, 0.05, 10, 44]} />
            <meshStandardMaterial color="#8b8a86" metalness={0.4} />
          </mesh>
          <group ref={wheel} position={[0, 0, 0.24]}>
            <mesh>
              <torusGeometry args={[0.5, 0.07, 10, 30]} />
              <meshStandardMaterial color="#b7b6b1" metalness={0.5} roughness={0.4} />
            </mesh>
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2.5]}>
                <boxGeometry args={[0.98, 0.07, 0.07]} />
                <meshStandardMaterial color="#b7b6b1" metalness={0.5} />
              </mesh>
            ))}
            <mesh>
              <sphereGeometry args={[0.14, 16, 16]} />
              <meshStandardMaterial color="#9a9994" metalness={0.6} />
            </mesh>
          </group>
        </group>
      </group>

      {/* the shut door is solid */}
      {!open && (
        <CuboidCollider position={[15, 1.5, -6.9]} args={[1.8, 1.5, 0.2]} />
      )}
    </group>
  );
}

function VaultRoom() {
  return (
    <group>
      <RigidBody type="fixed" colliders="cuboid">
        <WoodCrate position={[20.7, 0.5, 4.3]} />
        <WoodCrate position={[20.7, 1.5, 4.3]} />
        <WoodCrate position={[19.5, 0.5, 4.9]} />
        <Desk position={[10.6, 0, 4.3]} size={[1.7, 0.75, 0.9]} />
        <Locker position={[21.4, 0, -4.4]} />
        <Locker position={[21.4, 0, -3.1]} />
        <Cabinet position={[8.6, 0, -4.4]} />
        <Crate position={[8.9, 0.42, 5.4]} size={0.84} color="#5f6a3a" />
      </RigidBody>

      <VaultDoor />
      <Plant position={[9.0, 0, 6.2]} />
      <StatusLight position={[17.6, 1.95, -6.7]} color="#ffd23b" speed={2.4} />

      <CeilingLight position={[11.5, 3.55, -3]} cast />
      <CeilingLight position={[18.5, 3.55, -3]} />
      <CeilingLight position={[15, 3.55, -5.5]} />
      <CeilingLight position={[15, 3.55, 3.5]} />

      {/* inside the annex */}
      <pointLight
        position={[15, 2.4, -8.6]}
        intensity={4}
        distance={6}
        decay={2}
        color="#ffd9a0"
      />
    </group>
  );
}

/* --------------------------------------------------------- entrance ------- */

function Entrance() {
  return (
    <group>
      {/* glass doors, permanently open */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 1.05, 1.3, 10.5]}
          rotation={[0, s * 0.5, 0]}
          castShadow
        >
          <boxGeometry args={[1.35, 2.5, 0.07]} />
          <meshStandardMaterial
            color="#9fd2e6"
            transparent
            opacity={0.25}
            roughness={0.1}
            metalness={0.2}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.015, 9.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 1.6]} />
        <meshStandardMaterial color="#33363b" roughness={1} />
      </mesh>
      <CeilingLight position={[0, 3.4, 8.8]} intensity={7} />
    </group>
  );
}

export default function Rooms() {
  return (
    <>
      <Entrance />
      <Lobby />
      <SecurityRoom />
      <VaultRoom />
    </>
  );
}
