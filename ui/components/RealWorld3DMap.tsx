import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  worldState?: any;
}

export const RealWorld3DMap: React.FC<Props> = ({ worldState }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const angleRef = useRef<number>(Math.PI / 3.5);

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene, Camera, and Realistic Daylight / Dusk Setting
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xdce7f3); // Soft atmospheric sky tone
    scene.fog = new THREE.FogExp2(0xdce7f3, 0.0055);

    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 1000);
    cameraRef.current = camera;
    const radius = 95;
    camera.position.set(radius * Math.cos(angleRef.current), 55, radius * Math.sin(angleRef.current));
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.replaceChildren(renderer.domElement);

    // 2. Realistic Sun & Natural Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d9fa8, 1.2);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    sunLight.position.set(45, 80, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 200;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    scene.add(sunLight);

    // Hazard Fire Point Light
    const fireGlow = new THREE.PointLight(0xff4500, 3.5, 35);
    fireGlow.position.set(16, 5, -14);
    scene.add(fireGlow);

    // 3. Ground Terrain, Asphalt Streets & Sidewalks
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xc4d4bc, roughness: 0.9 }); // Park green grass
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Sidewalk blocks
    const createSidewalk = (w: number, d: number, x: number, z: number) => {
      const geo = new THREE.BoxGeometry(w, 0.4, d);
      const mat = new THREE.MeshStandardMaterial({ color: 0xd6d3cc, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.2, z);
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    createSidewalk(36, 36, -22, -22);
    createSidewalk(36, 36, 22, -22);
    createSidewalk(36, 36, -22, 22);
    createSidewalk(36, 36, 22, 22);

    // Asphalt Roads (Intersection grid)
    const createRoad = (w: number, d: number, x: number, z: number) => {
      const geo = new THREE.PlaneGeometry(w, d);
      const mat = new THREE.MeshStandardMaterial({ color: 0x3d434a, roughness: 0.6 });
      const road = new THREE.Mesh(geo, mat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.05, z);
      road.receiveShadow = true;
      scene.add(road);
    };

    createRoad(8, 160, 0, 0); // Avenue
    createRoad(160, 8, 0, 0); // Boulevard

    // Road Stripes
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -70; i <= 70; i += 7) {
      if (Math.abs(i) < 8) continue;
      // N-S stripe
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 3.5), stripeMat);
      s1.rotation.x = -Math.PI / 2;
      s1.position.set(0, 0.06, i);
      scene.add(s1);

      // E-W stripe
      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.3), stripeMat);
      s2.rotation.x = -Math.PI / 2;
      s2.position.set(i, 0.06, 0);
      scene.add(s2);
    }

    // Zebra Crossings
    const zebraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const createZebra = (x: number, z: number, rotY = 0) => {
      for (let s = -3; s <= 3; s += 1.2) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.5), zebraMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.rotation.z = rotY;
        stripe.position.set(x + (rotY === 0 ? s : 0), 0.07, z + (rotY !== 0 ? s : 0));
        scene.add(stripe);
      }
    };
    createZebra(0, -5.5);
    createZebra(0, 5.5);
    createZebra(-5.5, 0, Math.PI / 2);
    createZebra(5.5, 0, Math.PI / 2);

    // 4. Normal Town Buildings (Low to Mid-Rise Residences & Commercial Hubs)
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);

    const normalTownBuildings = [
      // Block NW
      { x: -28, z: -28, w: 9, d: 8, h: 8, color: 0xdfcbaf, roofColor: 0x9e3f32, roof: 'pitch' },
      { x: -16, z: -28, w: 9, d: 10, h: 12, color: 0xced6df, roofColor: 0x4a5d73, roof: 'flat' },
      { x: -26, z: -16, w: 11, d: 8, h: 9, color: 0xe6e0d3, roofColor: 0xb55a30, roof: 'pitch' },
      { x: -14, z: -14, w: 9, d: 8, h: 7, color: 0xd8e0cf, roofColor: 0x5a6351, roof: 'flat' },

      // Block NE (Disaster Hazard Block)
      { x: 16, z: -16, w: 10, d: 9, h: 9, color: 0xcf8a7e, roofColor: 0x733227, roof: 'flat' }, // Damaged structure
      { x: 28, z: -16, w: 9, d: 8, h: 11, color: 0xdfd8c8, roofColor: 0x8b4334, roof: 'pitch' },
      { x: 18, z: -28, w: 11, d: 8, h: 8, color: 0xd0d5db, roofColor: 0x495b6c, roof: 'flat' },
      { x: 30, z: -28, w: 8, d: 8, h: 7, color: 0xe3d9c3, roofColor: 0xaa5b38, roof: 'pitch' },

      // Block SW
      { x: -28, z: 18, w: 10, d: 8, h: 10, color: 0xdde4ec, roofColor: 0x3d4b5c, roof: 'flat' },
      { x: -16, z: 18, w: 9, d: 9, h: 7, color: 0xe5dfd3, roofColor: 0xa4523b, roof: 'pitch' },
      { x: -26, z: 30, w: 8, d: 9, h: 8, color: 0xd7cfbe, roofColor: 0x874033, roof: 'pitch' },
      { x: -14, z: 28, w: 10, d: 7, h: 12, color: 0xc8d4dc, roofColor: 0x445866, roof: 'flat' },

      // Block SE
      { x: 16, z: 18, w: 10, d: 10, h: 9, color: 0xeadcc9, roofColor: 0x994838, roof: 'pitch' },
      { x: 29, z: 18, w: 9, d: 8, h: 8, color: 0xd3dce5, roofColor: 0x495c6e, roof: 'flat' },
      { x: 18, z: 30, w: 8, d: 8, h: 6, color: 0xe0d6c4, roofColor: 0xa6593a, roof: 'pitch' },
      { x: 29, z: 30, w: 10, d: 9, h: 11, color: 0xdce2de, roofColor: 0x4f6b5b, roof: 'flat' },
    ];

    normalTownBuildings.forEach((b) => {
      const bMesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d),
        new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.7 })
      );
      bMesh.position.set(b.x, b.h / 2 + 0.4, b.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      buildingsGroup.add(bMesh);

      // Windows grid
      const winGeo = new THREE.PlaneGeometry(0.8, 1.1);
      const winMat = new THREE.MeshBasicMaterial({ color: 0x5b768c });
      for (let y = 2.5; y < b.h - 1; y += 2.2) {
        for (let xOff = -b.w / 2 + 1.5; xOff < b.w / 2 - 1; xOff += 2.2) {
          const win = new THREE.Mesh(winGeo, winMat);
          win.position.set(b.x + xOff, y + 0.4, b.z + b.d / 2 + 0.05);
          buildingsGroup.add(win);
        }
      }

      // Roof details
      if (b.roof === 'pitch') {
        const roofGeo = new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.72, 3.2, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: b.roofColor, roughness: 0.6 });
        const roofMesh = new THREE.Mesh(roofGeo, roofMat);
        roofMesh.rotation.y = Math.PI / 4;
        roofMesh.position.set(b.x, b.h + 1.8 + 0.4, b.z);
        roofMesh.castShadow = true;
        buildingsGroup.add(roofMesh);
      } else {
        const roofTrim = new THREE.Mesh(
          new THREE.BoxGeometry(b.w + 0.4, 0.4, b.d + 0.4),
          new THREE.MeshStandardMaterial({ color: b.roofColor, roughness: 0.5 })
        );
        roofTrim.position.set(b.x, b.h + 0.4, b.z);
        buildingsGroup.add(roofTrim);
      }
    });

    // 5. Trees along Sidewalks
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x487a41, roughness: 0.8 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x614833, roughness: 0.9 });
    const createTree = (x: number, z: number) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.8), trunkMat);
      trunk.position.set(x, 0.9 + 0.4, z);
      trunk.castShadow = true;
      scene.add(trunk);

      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2), treeMat);
      foliage.position.set(x, 2.2 + 0.4, z);
      foliage.castShadow = true;
      scene.add(foliage);
    };

    createTree(-6, -6);
    createTree(-6, -14);
    createTree(-6, 8);
    createTree(6, 12);
    createTree(6, -8);
    createTree(-14, 6);

    // 6. Realistic Emergency Vehicles
    const createVehicle = (bodyColor: number, isAmbulance = false) => {
      const v = new THREE.Group();
      // Chassis
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.3, 4.2),
        new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4, metalness: 0.2 })
      );
      body.position.y = 1.0;
      body.castShadow = true;
      v.add(body);

      // Cabin windshield
      const windShield = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.7, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.1 })
      );
      windShield.position.set(0, 1.7, 0.4);
      v.add(windShield);

      // Flashers
      const flasher = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.25, 0.5),
        new THREE.MeshBasicMaterial({ color: isAmbulance ? 0xff0044 : 0x0088ff })
      );
      flasher.position.set(0, 2.15, 0.4);
      v.add(flasher);

      // Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
      const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12);
      [
        [-1.15, 0.4, 1.2],
        [1.15, 0.4, 1.2],
        [-1.15, 0.4, -1.2],
        [1.15, 0.4, -1.2],
      ].forEach(([wx, wy, wz]) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(wx, wy, wz);
        v.add(w);
      });

      return v;
    };

    // AMB-07 Paramedic
    const amb = createVehicle(0xffffff, true);
    amb.position.set(-2, 0, 15);
    scene.add(amb);

    // FIRE-03 Engine
    const fireTruck = createVehicle(0xcc291f, false);
    fireTruck.position.set(2, 0, -4);
    fireTruck.scale.set(1.1, 1.15, 1.25);
    scene.add(fireTruck);

    // POL-02 Interceptor
    const pol = createVehicle(0x193b68, false);
    pol.position.set(14, 0, 2);
    pol.rotation.y = Math.PI / 2;
    scene.add(pol);

    // 7. Fire & Smoke Column at Sector 5C
    const smokeParticles = 24;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeParticles * 3);
    for (let i = 0; i < smokeParticles * 3; i += 3) {
      smokePos[i] = 16 + (Math.random() - 0.5) * 4;
      smokePos[i + 1] = 6 + Math.random() * 8;
      smokePos[i + 2] = -16 + (Math.random() - 0.5) * 4;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x4f4945,
      size: 2.8,
      transparent: true,
      opacity: 0.65,
    });
    const smoke = new THREE.Points(smokeGeo, smokeMat);
    scene.add(smoke);

    // 8. Semi-transparent Evacuation Sector Polygon
    const evacGeo = new THREE.CylinderGeometry(14, 14, 0.3, 32);
    const evacMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const evacZone = new THREE.Mesh(evacGeo, evacMat);
    evacZone.position.set(-18, 0.2, 18);
    scene.add(evacZone);

    // Evacuation Zone border ring
    const ringGeo = new THREE.RingGeometry(13.8, 14.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd97706, side: THREE.DoubleSide });
    const evacRing = new THREE.Mesh(ringGeo, ringMat);
    evacRing.rotation.x = -Math.PI / 2;
    evacRing.position.set(-18, 0.35, 18);
    scene.add(evacRing);

    // 9. Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getElapsedTime();

      // Fire light flicker
      fireGlow.intensity = 2.8 + Math.sin(delta * 14) * 1.2;

      // Animate rising smoke particles
      const positions = smokeGeo.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.08;
        if (positions[i] > 16) positions[i] = 7;
      }
      smokeGeo.attributes.position.needsUpdate = true;

      // Patrolling Ambulance on avenue
      amb.position.z = 10 + Math.sin(delta * 0.7) * 18;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Smooth Orbit Controls
  const rotateLeft = () => {
    angleRef.current -= Math.PI / 8;
    updateCamera();
  };

  const rotateRight = () => {
    angleRef.current += Math.PI / 8;
    updateCamera();
  };

  const setTilt = (high: boolean) => {
    if (!cameraRef.current) return;
    const r = 95;
    const y = high ? 70 : 38;
    cameraRef.current.position.set(r * Math.cos(angleRef.current), y, r * Math.sin(angleRef.current));
    cameraRef.current.lookAt(0, 0, 0);
  };

  const updateCamera = () => {
    if (!cameraRef.current) return;
    const r = 95;
    const y = cameraRef.current.position.y;
    cameraRef.current.position.set(r * Math.cos(angleRef.current), y, r * Math.sin(angleRef.current));
    cameraRef.current.lookAt(0, 0, 0);
  };

  return (
    <div className="relative w-full h-[470px] rounded-[24px] overflow-hidden select-none bg-[#dce7f3] border-2 border-white shadow-inner">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Real-time Status Overlay Badges */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white text-[11px] font-[800] text-[#2F2940] shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
          <span>SECTOR 5 // NORMAL CITY GRID (3D TACTICAL)</span>
        </div>
        <div className="bg-[#fee2e2]/95 backdrop-blur-md px-3 py-1 rounded-full border border-white text-[10px] font-[800] text-[#b91c1c] shadow-sm flex items-center gap-1.5 w-fit">
          <span>🔥</span>
          <span>STRUCTURAL INCIDENT (BUILDING A - SECTOR 5C)</span>
        </div>
      </div>

      {/* Camera Position & Orbit Controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/95 backdrop-blur-md border border-white px-3 py-1.5 rounded-full text-[10px] font-[800] text-[#4A4458] shadow-md">
        <span className="text-[#8E819E] uppercase mr-1">Camera:</span>
        <button
          onClick={() => setTilt(true)}
          className="px-2.5 py-1 bg-[#F3EFFC] hover:bg-[#E6DFF5] rounded-full border border-white transition active:scale-95"
        >
          ▲ HIGH
        </button>
        <button
          onClick={() => setTilt(false)}
          className="px-2.5 py-1 bg-[#F3EFFC] hover:bg-[#E6DFF5] rounded-full border border-white transition active:scale-95"
        >
          ▼ LOW
        </button>
        <button
          onClick={rotateLeft}
          className="px-2.5 py-1 bg-[#F3EFFC] hover:bg-[#E6DFF5] rounded-full border border-white transition active:scale-95"
        >
          ↺ ROT L
        </button>
        <button
          onClick={rotateRight}
          className="px-2.5 py-1 bg-[#F3EFFC] hover:bg-[#E6DFF5] rounded-full border border-white transition active:scale-95"
        >
          ↻ ROT R
        </button>
      </div>
    </div>
  );
};