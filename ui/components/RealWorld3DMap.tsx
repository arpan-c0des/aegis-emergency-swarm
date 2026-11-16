import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  worldState?: any;
}

// 3D coordinate mapping for simulation sectors
const SECTOR_COORDS: Record<string, [number, number, number]> = {
  Station_North: [-18, 0, -22],
  Station_South: [-20, 0, 24],
  Sector_5C: [16, 0, -16],
  Building_A: [16, 0, -16],
  Sector_6B: [20, 0, 18],
  Building_C: [20, 0, 18],
  Evac_Zone: [-18, 0, 18],
  H1_Central: [0, 0, -48],
  H1: [0, 0, -48],
  H2_West: [0, 0, 48],
  H2: [0, 0, 48]
};

// 3D coordinates for road barricade markers
const ROAD_COORDS: Record<string, [number, number, number]> = {
  Road_A1: [-4, 0.5, -20],
  Road_B2: [4, 0.5, -18],
  Road_C3: [18, 0.5, 0],
  Road_D4: [6, 0.5, 8],
  Road_E5: [4, 0.5, 20],
  Road_F6: [-6, 0.5, 30],
  Road_G7: [-20, 0.5, 6],
  Road_H8: [0, 0.5, 24],
  Road_I9: [24, 0.5, 0],
};

export const RealWorld3DMap: React.FC<Props> = ({ worldState }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const angleRef = useRef<number>(Math.PI / 3.5);

  // References to dynamic scene objects
  const vehiclesMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const incidentsMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const roadblocksMapRef = useRef<Map<string, THREE.Group>>(new Map());

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xdce7f3);
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

    // Natural lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d9fa8, 1.2);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff4e6, 2.2);
    sunLight.position.set(45, 80, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // Ground Plane
    const groundGeo = new THREE.PlaneGeometry(160, 160);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xc4d4bc, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Sidewalk quadrants
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

    createRoad(8, 160, 0, 0); // Avenue (N-S)
    createRoad(160, 8, 0, 0); // Boulevard (E-W)

    // Road Stripes
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -70; i <= 70; i += 7) {
      if (Math.abs(i) < 8) continue;
      const s1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 3.5), stripeMat);
      s1.rotation.x = -Math.PI / 2;
      s1.position.set(0, 0.06, i);
      scene.add(s1);

      const s2 = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.3), stripeMat);
      s2.rotation.x = -Math.PI / 2;
      s2.position.set(i, 0.06, 0);
      scene.add(s2);
    }

    // Buildings Group
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);

    const cityBuildings = [
      // NW Block
      { x: -28, z: -28, w: 9, d: 8, h: 8, color: 0xdfcbaf, roofColor: 0x9e3f32 },
      { x: -16, z: -28, w: 9, d: 10, h: 12, color: 0xced6df, roofColor: 0x4a5d73 },
      { x: -26, z: -16, w: 11, d: 8, h: 9, color: 0xe6e0d3, roofColor: 0xb55a30 },
      // NE Block (Sector 5C - Primary Hazard Zone)
      { x: 16, z: -16, w: 10, d: 9, h: 9, color: 0xcf8a7e, roofColor: 0x733227 },
      { x: 28, z: -16, w: 9, d: 8, h: 11, color: 0xdfd8c8, roofColor: 0x8b4334 },
      { x: 18, z: -28, w: 11, d: 8, h: 8, color: 0xd0d5db, roofColor: 0x495b6c },
      // SW Block
      { x: -28, z: 18, w: 10, d: 8, h: 10, color: 0xdde4ec, roofColor: 0x3d4b5c },
      { x: -16, z: 18, w: 9, d: 9, h: 7, color: 0xe5dfd3, roofColor: 0xa4523b },
      // SE Block (Sector 6B - Secondary Explosion Zone)
      { x: 16, z: 18, w: 10, d: 10, h: 9, color: 0xeadcc9, roofColor: 0x994838 },
      { x: 29, z: 18, w: 9, d: 8, h: 8, color: 0xd3dce5, roofColor: 0x495c6e },
      { x: 18, z: 30, w: 8, d: 8, h: 6, color: 0xe0d6c4, roofColor: 0xa6593a }
    ];

    cityBuildings.forEach((b) => {
      const bMesh = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d),
        new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.7 })
      );
      bMesh.position.set(b.x, b.h / 2 + 0.4, b.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      buildingsGroup.add(bMesh);

      // Roof Trim
      const roofTrim = new THREE.Mesh(
        new THREE.BoxGeometry(b.w + 0.4, 0.4, b.d + 0.4),
        new THREE.MeshStandardMaterial({ color: b.roofColor, roughness: 0.5 })
      );
      roofTrim.position.set(b.x, b.h + 0.4, b.z);
      buildingsGroup.add(roofTrim);
    });

    // Evacuation Zone Polygon
    const evacGeo = new THREE.CylinderGeometry(14, 14, 0.3, 32);
    const evacMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.22 });
    const evacZone = new THREE.Mesh(evacGeo, evacMat);
    evacZone.position.set(-18, 0.2, 18);
    scene.add(evacZone);

    // Evacuation Ring
    const ringGeo = new THREE.RingGeometry(13.8, 14.2, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xd97706, side: THREE.DoubleSide });
    const evacRing = new THREE.Mesh(ringGeo, ringMat);
    evacRing.rotation.x = -Math.PI / 2;
    evacRing.position.set(-18, 0.35, 18);
    scene.add(evacRing);

    // Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getElapsedTime();

      // Animate active incident smoke and fire glow
      incidentsMapRef.current.forEach((grp) => {
        grp.children.forEach((child) => {
          if (child instanceof THREE.PointLight) {
            child.intensity = 2.5 + Math.sin(delta * 14) * 1.5;
          } else if (child instanceof THREE.Points) {
            const pos = child.geometry.attributes.position.array as Float32Array;
            for (let i = 1; i < pos.length; i += 3) {
              pos[i] += 0.08;
              if (pos[i] > 18) pos[i] = 4;
            }
            child.geometry.attributes.position.needsUpdate = true;
          }
        });
      });

      // Flasher animations on dispatched vehicles
      vehiclesMapRef.current.forEach((veh) => {
        const flasher = veh.getObjectByName("flasher");
        if (flasher && flasher instanceof THREE.Mesh) {
          (flasher.material as THREE.MeshBasicMaterial).opacity = (Math.sin(delta * 18) > 0) ? 1.0 : 0.2;
        }
      });

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

  // Synchronize 3D scene whenever worldState updates
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !worldState) return;

    // Helper: Build a vehicle model
    const buildVehicleModel = (type: string, callsign: string) => {
      const v = new THREE.Group();
      v.name = callsign;

      const isAmbulance = type === "ambulance";
      const isFire = type === "fire_truck";
      const bodyColor = isAmbulance ? 0xffffff : isFire ? 0xcc291f : 0x193b68;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.3, isFire ? 4.8 : 4.0),
        new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.4 })
      );
      body.position.y = 1.0;
      body.castShadow = true;
      v.add(body);

      // Cabin windshield
      const windShield = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.7, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.1 })
      );
      windShield.position.set(0, 1.7, 0.3);
      v.add(windShield);

      // Flasher
      const flasherMat = new THREE.MeshBasicMaterial({
        color: isAmbulance ? 0xff0044 : isFire ? 0xff8800 : 0x0088ff,
        transparent: true
      });
      const flasher = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.5), flasherMat);
      flasher.name = "flasher";
      flasher.position.set(0, 2.15, 0.3);
      v.add(flasher);

      return v;
    };

    // 1. UPDATE EMERGENCY VEHICLES
    const units = worldState.units || {};
    Object.entries(units).forEach(([uid, u]: [string, any]) => {
      const key = u.callsign || uid;
      let mesh = vehiclesMapRef.current.get(key);

      if (!mesh) {
        mesh = buildVehicleModel(u.unit_type, key);
        scene.add(mesh);
        vehiclesMapRef.current.set(key, mesh);
      }

      // Position vehicle at its sector or interpolate to target
      const targetLoc = u.location || "Station_North";
      const coords = SECTOR_COORDS[targetLoc] || SECTOR_COORDS["Station_North"];

      // Offset slightly to prevent vehicles stacking
      const offsetIndex = (Object.keys(units).indexOf(uid)) * 2.2;
      mesh.position.set(coords[0] + offsetIndex, coords[1], coords[2]);
    });

    // 2. UPDATE INCIDENT HAZARDS (Flames & Smoke Columns)
    const incidents = worldState.incidents || {};
    // Remove old incidents that are no longer active
    incidentsMapRef.current.forEach((grp, incId) => {
      if (!incidents[incId] || !incidents[incId].active || incidents[incId].severity === "extinguished") {
        scene.remove(grp);
        incidentsMapRef.current.delete(incId);
      }
    });

    // Add or update active incidents
    Object.entries(incidents).forEach(([incId, inc]: [string, any]) => {
      if (!inc.active || inc.severity === "extinguished") return;

      if (!incidentsMapRef.current.has(incId)) {
        const hazardGroup = new THREE.Group();
        const coords = SECTOR_COORDS[inc.location] || [16, 0, -16];
        hazardGroup.position.set(coords[0], coords[1], coords[2]);

        // Fire Point Light
        const fireLight = new THREE.PointLight(0xff4500, 3.5, 30);
        fireLight.position.set(0, 4, 0);
        hazardGroup.add(fireLight);

        // Flame Core Mesh
        const flameMesh = new THREE.Mesh(
          new THREE.ConeGeometry(1.8, 4.5, 8),
          new THREE.MeshBasicMaterial({ color: 0xff3700 })
        );
        flameMesh.position.set(0, 2.2, 0);
        hazardGroup.add(flameMesh);

        // Smoke Particles
        const smokeGeo = new THREE.BufferGeometry();
        const smokePos = new Float32Array(24 * 3);
        for (let i = 0; i < 24 * 3; i += 3) {
          smokePos[i] = (Math.random() - 0.5) * 3;
          smokePos[i + 1] = 4 + Math.random() * 8;
          smokePos[i + 2] = (Math.random() - 0.5) * 3;
        }
        smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
        const smokeMat = new THREE.PointsMaterial({
          color: 0x4f4945,
          size: 2.5,
          transparent: true,
          opacity: 0.65
        });
        const smoke = new THREE.Points(smokeGeo, smokeMat);
        hazardGroup.add(smoke);

        scene.add(hazardGroup);
        incidentsMapRef.current.set(incId, hazardGroup);
      }
    });

    // 3. UPDATE ROADBLOCK BARRICADES
    const roads = worldState.roads || {};
    Object.entries(roads).forEach(([roadId, status]: [string, any]) => {
      const isBlocked = status === "blocked";
      const existing = roadblocksMapRef.current.get(roadId);

      if (isBlocked && !existing) {
        const rCoords = ROAD_COORDS[roadId] || [0, 0.5, 0];
        const barGroup = new THREE.Group();
        barGroup.position.set(rCoords[0], rCoords[1], rCoords[2]);

        // Barricade board with caution stripes
        const barMesh = new THREE.Mesh(
          new THREE.BoxGeometry(4.5, 1.2, 0.4),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 })
        );
        barMesh.position.y = 0.6;
        barGroup.add(barMesh);

        // Flashing amber beacon
        const beacon = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.3, 0.5, 8),
          new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        beacon.position.y = 1.4;
        barGroup.add(beacon);

        scene.add(barGroup);
        roadblocksMapRef.current.set(roadId, barGroup);
      } else if (!isBlocked && existing) {
        scene.remove(existing);
        roadblocksMapRef.current.delete(roadId);
      }
    });

  }, [worldState]);

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

  const activeIncCount = Object.values(worldState?.incidents || {}).filter((i: any) => i.active && i.severity !== "extinguished").length;

  return (
    <div className="relative w-full h-[470px] rounded-[24px] overflow-hidden select-none bg-[#dce7f3] border-2 border-white shadow-inner">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Real-time Status Overlay Badges */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white text-[11px] font-[800] text-[#2F2940] shadow-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
          <span>SECTOR 5 // LIVE TELEMETRY STREAM</span>
        </div>
        {activeIncCount > 0 ? (
          <div className="bg-[#fee2e2]/95 backdrop-blur-md px-3 py-1 rounded-full border border-white text-[10px] font-[800] text-[#b91c1c] shadow-sm flex items-center gap-1.5 w-fit">
            <span>🔥</span>
            <span>{activeIncCount} ACTIVE HAZARDS ENGAGED</span>
          </div>
        ) : (
          <div className="bg-[#ecfdf5]/95 backdrop-blur-md px-3 py-1 rounded-full border border-white text-[10px] font-[800] text-[#047857] shadow-sm flex items-center gap-1.5 w-fit">
            <span>✓</span>
            <span>ALL SECTORS CONTAINED & SECURED</span>
          </div>
        )}
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
