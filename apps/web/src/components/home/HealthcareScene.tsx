'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const NODE_CONFIGS = [
  { id: 'prescription', label: 'Prescription', desc: 'Upload', color: '#087F7B', angle: 0 },
  { id: 'ai', label: 'AI Extraction', desc: 'OCR + NLP', color: '#2563A6', angle: Math.PI / 3 },
  { id: 'doctor', label: 'Doctor Verify', desc: 'Clinical review', color: '#22A06B', angle: (2 * Math.PI) / 3 },
  { id: 'medicine', label: 'Medicine', desc: 'Discovery', color: '#D98A00', angle: Math.PI },
  { id: 'pharmacy', label: 'Pharmacy', desc: 'Fulfillment', color: '#1F9D68', angle: (4 * Math.PI) / 3 },
  { id: 'patient', label: 'Patient', desc: 'Receive', color: '#0B6E8E', angle: (5 * Math.PI) / 3 },
];

export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export function HealthcareScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [webglOk, setWebglOk] = useState(true);

  useEffect(() => {
    if (!isWebGLAvailable()) { setWebglOk(false); return; }
    const container = containerRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = Math.max(container.clientHeight, 400);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F4F8FA');

    const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
    camera.position.set(0, 0, 9);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    canvasRef.current = renderer.domElement;

    scene.fog = new THREE.Fog('#F4F8FA', 10, 20);

    scene.add(new THREE.AmbientLight('#ffffff', 0.7));
    const dirLight = new THREE.DirectionalLight('#ffffff', 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const coreGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: '#087F7B', transparent: true, opacity: 0.12,
      roughness: 0.05, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    const coreGlowGeo = new THREE.SphereGeometry(0.65, 24, 24);
    const coreGlowMat = new THREE.MeshBasicMaterial({ color: '#087F7B', transparent: true, opacity: 0.04, side: THREE.BackSide });
    const coreGlow = new THREE.Mesh(coreGlowGeo, coreGlowMat);
    scene.add(coreGlow);

    const coreLight = new THREE.PointLight('#087F7B', 10, 5, 2);
    scene.add(coreLight);

    const nodeMeshes: { mesh: THREE.Mesh; glow: THREE.Mesh; config: typeof NODE_CONFIGS[0]; baseY: number }[] = [];
    NODE_CONFIGS.forEach((cfg) => {
      const radius = 2.8;
      const x = Math.sin(cfg.angle) * radius;
      const y = Math.cos(cfg.angle) * radius;

      const nGeo = new THREE.SphereGeometry(0.18, 20, 20);
      const nMat = new THREE.MeshPhysicalMaterial({
        color: cfg.color, transparent: true, opacity: 0.85,
        roughness: 0.15, metalness: 0.08, clearcoat: 0.5,
        emissive: cfg.color, emissiveIntensity: 0.1,
      });
      const nMesh = new THREE.Mesh(nGeo, nMat);
      nMesh.position.set(x, y, 0);
      scene.add(nMesh);

      const gGeo = new THREE.SphereGeometry(0.22, 12, 12);
      const gMat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.05, side: THREE.BackSide });
      const gMesh = new THREE.Mesh(gGeo, gMat);
      gMesh.position.set(x, y, 0);
      scene.add(gMesh);

      nodeMeshes.push({ mesh: nMesh, glow: gMesh, config: cfg, baseY: y });
    });

    const linePoints: THREE.Vector3[] = [];
    NODE_CONFIGS.forEach((cfg, i) => {
      const next = NODE_CONFIGS[(i + 1) % NODE_CONFIGS.length];
      const r = 2.8;
      linePoints.push(new THREE.Vector3(Math.sin(cfg.angle) * r, Math.cos(cfg.angle) * r, 0));
      linePoints.push(new THREE.Vector3(Math.sin(next.angle) * r, Math.cos(next.angle) * r, 0));
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMat = new THREE.LineBasicMaterial({ color: '#087F7B', transparent: true, opacity: 0.1 });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    const particleCount = NODE_CONFIGS.length;
    const particleMeshes: THREE.Mesh[] = [];
    NODE_CONFIGS.forEach((cfg, i) => {
      const next = NODE_CONFIGS[(i + 1) % NODE_CONFIGS.length];
      const pGeo = new THREE.SphereGeometry(0.045, 8, 8);
      const pMat = new THREE.MeshBasicMaterial({ color: '#087F7B', transparent: true, opacity: 0.7 });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      scene.add(pMesh);
      particleMeshes.push(pMesh);
    });

    const ambientCount = 60;
    const ambGeo = new THREE.BufferGeometry();
    const ambPos = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      const r = 3.5 + Math.random() * 2;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      ambPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      ambPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      ambPos[i * 3 + 2] = r * Math.cos(ph) - 1;
    }
    ambGeo.setAttribute('position', new THREE.BufferAttribute(ambPos, 3));
    const ambMat = new THREE.PointsMaterial({ color: '#087F7B', size: 0.012, transparent: true, opacity: 0.25, sizeAttenuation: true });
    const ambPoints = new THREE.Points(ambGeo, ambMat);
    scene.add(ambPoints);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    const onResize = () => {
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 400);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    setLoaded(true);

    const clock = new THREE.Clock();
    let camTargetX = 0;
    let camTargetY = 0;
    let camCurrentX = 0;
    let camCurrentY = 0;

    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      camTargetX = mouseRef.current.x * 0.3;
      camTargetY = mouseRef.current.y * 0.2;
      camCurrentX += (camTargetX - camCurrentX) * 0.02;
      camCurrentY += (camTargetY - camCurrentY) * 0.02;
      camera.position.x = camCurrentX;
      camera.position.y = camCurrentY;
      camera.lookAt(0, 0, 0);

      coreMesh.rotation.y = t * 0.08;
      coreMesh.rotation.x = Math.sin(t * 0.4) * 0.05;
      coreMesh.position.y = Math.sin(t * 0.6) * 0.08;
      coreGlow.rotation.y = t * 0.06;
      coreGlow.position.y = coreMesh.position.y;
      coreLight.position.y = coreMesh.position.y;

      nodeMeshes.forEach((nd) => {
        const ny = nd.baseY + Math.sin(t * 0.7 + nd.config.angle) * 0.15;
        nd.mesh.position.y = ny;
        nd.glow.position.y = ny;
      });

      const r = 2.8;
      particleMeshes.forEach((pm, i) => {
        const cfg = NODE_CONFIGS[i];
        const next = NODE_CONFIGS[(i + 1) % NODE_CONFIGS.length];
        const sx = Math.sin(cfg.angle) * r;
        const sy = Math.cos(cfg.angle) * r;
        const ex = Math.sin(next.angle) * r;
        const ey = Math.cos(next.angle) * r;
        const progress = ((t * 0.12 + i / particleCount) % 1);
        const ease = Math.sin(progress * Math.PI);
        pm.position.set(sx + (ex - sx) * progress, sy + (ey - sy) * progress, 0);
        pm.scale.setScalar(0.5 + ease * 0.5);
        (pm.material as THREE.MeshBasicMaterial).opacity = 0.3 + ease * 0.5;
      });

      ambPoints.rotation.y = t * 0.015;
      ambPoints.rotation.x = t * 0.008;
      const posArr = ambGeo.getAttribute('position').array as Float32Array;
      for (let i = 0; i < ambientCount; i++) {
        posArr[i * 3 + 1] += Math.sin(t * 0.5 + i) * 0.0002;
      }
      ambGeo.getAttribute('position').needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      coreGeo.dispose(); coreMat.dispose();
      coreGlowGeo.dispose(); coreGlowMat.dispose();
      lineGeo.dispose(); lineMat.dispose();
      ambGeo.dispose(); ambMat.dispose();
      nodeMeshes.forEach(nd => { nd.mesh.geometry.dispose(); (nd.mesh.material as any).dispose(); nd.glow.geometry.dispose(); (nd.glow.material as any).dispose(); });
      particleMeshes.forEach(pm => { pm.geometry.dispose(); (pm.material as any).dispose(); });
    };
  }, []);

  if (!webglOk) {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: 400, background: 'linear-gradient(165deg, #F0FAFA 0%, #EDF5FB 40%, #F4F8FA 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }} role="img" aria-label="Healthcare network visualization">
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(8,127,123,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: 32, textAlign: 'center', color: '#5B7182' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#087F7B" strokeWidth="1.5" style={{ marginBottom: 16, opacity: 0.5 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><circle cx="12" cy="12" r="3" /></svg>
          <p style={{ fontSize: 15, fontWeight: 500 }}>Healthcare Network Visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 400, borderRadius: 16, position: 'relative', overflow: 'hidden' }}
      role="img"
      aria-label="Interactive 3D healthcare workflow showing prescription to delivery flow"
    />
  );
}
