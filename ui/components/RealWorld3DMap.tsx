import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Flame, ShieldAlert, Crosshair, MapPin, Eye, Maximize2, 
  RotateCcw, Compass, CloudRain, Sun, Activity, Truck, Building2, Bed
} from 'lucide-react';

interface Props {
  worldState?: any;
  theme?: 'tactical' | 'clay';
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
}

// 3D Landmark & Sector Coordinates
const SECTOR_COORDS: Record<string, [number, number, number]> = {
  Station_North: [-28, 0, -28],
  Station_South: [-28, 0, 28],
  Sector_5C: [26, 0, -24],
  Building_A: [26, 0, -24],
  Sector_6B: [28, 0, 26],
  Building_C: [28, 0, 26],
  Evac_Zone: [-22, 0, 20],
  H1_Central: [0, 0, -42],
  H1: [0, 0, -42],
  H2_West: [0, 0, 42],
  H2: [0, 0, 42]
};

// Road barricade marker coordinates
const ROAD_BLOCK_COORDS: Record<string, [number, number, number]> = {
  Road_A1: [-14, 0.4, -28],
  Road_B2: [14, 0.4, -34],
  Road_C3: [28, 0.4, 0],
  Road_D4: [14, 0.4, -14],
  Road_E5: [10, 0.4, 24],
  Road_F6: [-10, 0.4, 32],
  Road_G7: [-24, 0.4, 24],
  Road_H8: [0, 0.4, 28],
  Road_I9: [0, 0.4, 0],
};

interface InspectedEntity {
  type: 'unit' | 'hospital' | 'incident';
  title: string;
  badge: string;
  badgeColor: string;
  details: { label: string; value: string | number }[];
}

export const RealWorld3DMap: React.FC<Props> = ({ 
  worldState, 
  theme = 'clay', 
  isTheaterMode = false, 
  onToggleTheater 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Dynamic Scene Registries
  const vehiclesMapRef = useRef<Map<string, { group: THREE.Group; targetPos: THREE.Vector3; flasherLeft: THREE.Mesh; flasherRight: THREE.Mesh; sirenLight: THREE.PointLight }>>(new Map());
  const incidentsMapRef = useRef<Map<string, { group: THREE.Group; fireLight: THREE.PointLight; flameMesh: THREE.Mesh; smokePoints: THREE.Points }>>(new Map());
  const roadblocksMapRef = useRef<Map<string, THREE.Group>>(new Map());
  const waterSprayRef = useRef<THREE.Points | null>(null);
  const rainSystemRef = useRef<THREE.Points | null>(null);
  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);

  // Selected Tactical Entity for Inspector Overlay
  const [inspectedEntity, setInspectedEntity] = useState<InspectedEntity | null>(null);
  const [weatherVisual, setWeatherVisual] = useState<boolean>(true);
  const [activeCamPreset, setActiveCamPreset] = useState<string>('overview');

  // Dynamic theme update for 3D Background & Fog
  useEffect(() => {
    if (!sceneRef.current) return;
    const isDark = theme === 'tactical';
    const bgColor = isDark ? 0x060b16 : 0xdce8f5;
    sceneRef.current.background = new THREE.Color(bgColor);
    sceneRef.current.fog = new THREE.FogExp2(bgColor, isDark ? 0.005 : 0.004);
  }, [theme]);

  // 1. Scene Initialization
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const isDark = theme === 'tactical';
    const bgColor = isDark ? 0x060b16 : 0xdce8f5;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, isDark ? 0.005 : 0.004);

    const camera = new THREE.PerspectiveCamera(38, width / height, 1, 1000);
    cameraRef.current = camera;
    camera.position.set(75, 68, 75);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    containerRef.current.replaceChildren(renderer.domElement);

    // Orbit Controls with Smooth Damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Prevent dipping beneath ground
    controls.minDistance = 25;
    controls.maxDistance = 200;
    controls.target.set(0, 0, 0);

    // Natural Sun and Hemisphere Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8a99a8, 1.3);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff6e6, 2.0);
    sunLight.position.set(60, 95, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 250;
    sunLight.shadow.camera.left = -75;
    sunLight.shadow.camera.right = 75;
    sunLight.shadow.camera.top = 75;
    sunLight.shadow.camera.bottom = -75;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Ground Grass Terrain Base
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xbed2b4, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // ==========================================
    // 2. URBAN INFRASTRUCTURE & STREET GRID
    // ==========================================
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x383e47, roughness: 0.55 });
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const yellowStripeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xd3cfc7, roughness: 0.85 });

    // Main Avenue (North-South, 10m wide)
    const avenueGeo = new THREE.PlaneGeometry(10, 180);
    const avenue = new THREE.Mesh(avenueGeo, roadMat);
    avenue.rotation.x = -Math.PI / 2;
    avenue.position.set(0, 0.04, 0);
    avenue.receiveShadow = true;
    scene.add(avenue);

    // Main Boulevard (East-West, 10m wide)
    const blvdGeo = new THREE.PlaneGeometry(180, 10);
    const blvd = new THREE.Mesh(blvdGeo, roadMat);
    blvd.rotation.x = -Math.PI / 2;
    blvd.position.set(0, 0.04, 0);
    blvd.receiveShadow = true;
    scene.add(blvd);

    // Secondary Cross Streets connecting outer sectors
    const cross1 = new THREE.Mesh(new THREE.PlaneGeometry(6, 120), roadMat);
    cross1.rotation.x = -Math.PI / 2;
    cross1.position.set(28, 0.038, 0);
    cross1.receiveShadow = true;
    scene.add(cross1);

    const cross2 = new THREE.Mesh(new THREE.PlaneGeometry(6, 120), roadMat);
    cross2.rotation.x = -Math.PI / 2;
    cross2.position.set(-28, 0.038, 0);
    cross2.receiveShadow = true;
    scene.add(cross2);

    const cross3 = new THREE.Mesh(new THREE.PlaneGeometry(120, 6), roadMat);
    cross3.rotation.x = -Math.PI / 2;
    cross3.position.set(0, 0.038, -28);
    cross3.receiveShadow = true;
    scene.add(cross3);

    const cross4 = new THREE.Mesh(new THREE.PlaneGeometry(120, 6), roadMat);
    cross4.rotation.x = -Math.PI / 2;
    cross4.position.set(0, 0.038, 28);
    cross4.receiveShadow = true;
    scene.add(cross4);

    // Double Yellow Centerlines & White Dashed Markings
    for (let z = -80; z <= 80; z += 6) {
      if (Math.abs(z) < 10) continue;
      // Avenue divider
      const yLine1 = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 4.5), yellowStripeMat);
      yLine1.rotation.x = -Math.PI / 2;
      yLine1.position.set(-0.2, 0.05, z);
      scene.add(yLine1);
      const yLine2 = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 4.5), yellowStripeMat);
      yLine2.rotation.x = -Math.PI / 2;
      yLine2.position.set(0.2, 0.05, z);
      scene.add(yLine2);

      // White lane dashes
      const wDash1 = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.5), stripeMat);
      wDash1.rotation.x = -Math.PI / 2;
      wDash1.position.set(2.8, 0.05, z);
      scene.add(wDash1);
      const wDash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 2.5), stripeMat);
      wDash2.rotation.x = -Math.PI / 2;
      wDash2.position.set(-2.8, 0.05, z);
      scene.add(wDash2);
    }

    // Boulevard Markings (East-West)
    for (let x = -80; x <= 80; x += 6) {
      if (Math.abs(x) < 10) continue;
      const yLine = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.3), yellowStripeMat);
      yLine.rotation.x = -Math.PI / 2;
      yLine.position.set(x, 0.05, 0);
      scene.add(yLine);
    }

    // Pedestrian Zebra Crossings at Central Intersection
    const createCrosswalk = (cx: number, cz: number, isHoriz: boolean) => {
      for (let s = -4; s <= 4; s += 1.4) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(isHoriz ? 0.7 : 2.8, isHoriz ? 2.8 : 0.7), stripeMat);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(cx + (isHoriz ? s : 0), 0.06, cz + (!isHoriz ? s : 0));
        scene.add(stripe);
      }
    };
    createCrosswalk(0, -6.8, true);
    createCrosswalk(0, 6.8, true);
    createCrosswalk(-6.8, 0, false);
    createCrosswalk(6.8, 0, false);

    // Sidewalk Islands
    const buildSidewalkBlock = (w: number, d: number, x: number, z: number) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(w, 0.45, d), sidewalkMat);
      sw.position.set(x, 0.22, z);
      sw.receiveShadow = true;
      scene.add(sw);
    };
    buildSidewalkBlock(18, 18, -16, -16);
    buildSidewalkBlock(18, 18, 16, -16);
    buildSidewalkBlock(18, 18, -16, 16);
    buildSidewalkBlock(18, 18, 16, 16);

    // ==========================================
    // 3. ARCHITECTURAL DISTRICTS & LANDMARKS
    // ==========================================
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);

    // --- LANDMARK 1: CENTRAL TRAUMA HOSPITAL (H1) [North Avenue] ---
    const hospitalGroup = new THREE.Group();
    hospitalGroup.position.set(0, 0, -46);
    hospitalGroup.userData = { type: 'hospital', id: 'H1', name: 'Central Trauma Hospital' };

    // Main ICU Tower
    const h1Main = new THREE.Mesh(
      new THREE.BoxGeometry(16, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.1 })
    );
    h1Main.position.y = 9;
    h1Main.castShadow = true;
    h1Main.receiveShadow = true;
    hospitalGroup.add(h1Main);

    // Clinical Wings
    const h1EastWing = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 12), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }));
    h1EastWing.position.set(12, 5, 0);
    h1EastWing.castShadow = true;
    hospitalGroup.add(h1EastWing);

    const h1WestWing = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 12), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }));
    h1WestWing.position.set(-12, 5, 0);
    h1WestWing.castShadow = true;
    hospitalGroup.add(h1WestWing);

    // Rooftop Helipad
    const helipadRing = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 4.6, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    );
    helipadRing.rotation.x = -Math.PI / 2;
    helipadRing.position.set(0, 18.06, 0);
    hospitalGroup.add(helipadRing);

    // Red Cross Signage
    const redCrossV = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    redCrossV.position.set(0, 12, 7.15);
    hospitalGroup.add(redCrossV);
    const redCrossH = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 0.2), new THREE.MeshBasicMaterial({ color: 0xdc2626 }));
    redCrossH.position.set(0, 12, 7.15);
    hospitalGroup.add(redCrossH);

    // Emergency Bay Drive-Thru Canopy
    const erCanopy = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 5), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
    erCanopy.position.set(0, 3.5, 9.5);
    hospitalGroup.add(erCanopy);

    scene.add(hospitalGroup);
    interactiveObjectsRef.current.push(h1Main);

    // --- LANDMARK 2: ST. LUKE'S COMMUNITY CLINIC (H2) [South Avenue] ---
    const h2Group = new THREE.Group();
    h2Group.position.set(0, 0, 44);
    h2Group.userData = { type: 'hospital', id: 'H2', name: "St. Luke's Community Clinic" };

    const h2Body = new THREE.Mesh(new THREE.BoxGeometry(14, 7, 10), new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.6 }));
    h2Body.position.y = 3.5;
    h2Body.castShadow = true;
    h2Group.add(h2Body);

    const h2Sign = new THREE.Mesh(new THREE.BoxGeometry(6, 1.2, 0.2), new THREE.MeshBasicMaterial({ color: 0xd97706 }));
    h2Sign.position.set(0, 6, -5.15);
    h2Group.add(h2Sign);

    scene.add(h2Group);
    interactiveObjectsRef.current.push(h2Body);

    // --- LANDMARK 3: SECTOR 5C (BUILDING A) - ACTIVE FIRE INDUSTRIAL ZONE [NE] ---
    const sec5CGroup = new THREE.Group();
    sec5CGroup.position.set(26, 0, -24);
    sec5CGroup.userData = { type: 'incident', id: 'INC_01', name: 'Sector 5C Structural Fire' };

    // Industrial Warehouse
    const indFactory = new THREE.Mesh(new THREE.BoxGeometry(14, 11, 12), new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 }));
    indFactory.position.y = 5.5;
    indFactory.castShadow = true;
    indFactory.receiveShadow = true;
    sec5CGroup.add(indFactory);

    // Factory Smokestack Chimney
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, 16, 12), new THREE.MeshStandardMaterial({ color: 0x44403c }));
    chimney.position.set(5.5, 8, -4.5);
    chimney.castShadow = true;
    sec5CGroup.add(chimney);

    // Chemical Storage Tanks
    const tank1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 5.5, 16), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6 }));
    tank1.position.set(-5.5, 2.75, 4.5);
    sec5CGroup.add(tank1);

    scene.add(sec5CGroup);
    interactiveObjectsRef.current.push(indFactory);

    // --- LANDMARK 4: SECTOR 6B (SUBWAY CONCOURSE & SKYSCRAPERS) [SE] ---
    const sec6BGroup = new THREE.Group();
    sec6BGroup.position.set(28, 0, 26);
    sec6BGroup.userData = { type: 'incident', id: 'INC_02', name: 'Sector 6B Subway Concourse' };

    // Glass Tower 1
    const tower1 = new THREE.Mesh(
      new THREE.BoxGeometry(10, 28, 9),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.8 })
    );
    tower1.position.set(-2, 14, 0);
    tower1.castShadow = true;
    sec6BGroup.add(tower1);

    // Spire
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.4, 8, 8), new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 }));
    spire.position.set(-2, 32, 0);
    sec6BGroup.add(spire);

    // Glass Tower 2
    const tower2 = new THREE.Mesh(
      new THREE.BoxGeometry(9, 20, 9),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.2, metalness: 0.6 })
    );
    tower2.position.set(7, 10, -2);
    tower2.castShadow = true;
    sec6BGroup.add(tower2);

    // Subway Canopy Portal
    const subwayEntrance = new THREE.Mesh(new THREE.BoxGeometry(5, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    subwayEntrance.position.set(-6, 0.9, 8);
    sec6BGroup.add(subwayEntrance);

    scene.add(sec6BGroup);
    interactiveObjectsRef.current.push(tower1);

    // --- LANDMARK 5: STATION NORTH (FIRE & RESCUE HEADQUARTERS) [NW] ---
    const stnNorthGroup = new THREE.Group();
    stnNorthGroup.position.set(-28, 0, -28);
    const fireStnBody = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 }));
    fireStnBody.position.y = 4;
    fireStnBody.castShadow = true;
    stnNorthGroup.add(fireStnBody);
    scene.add(stnNorthGroup);

    // --- LANDMARK 6: STATION SOUTH (POLICE PRECINCT) [SW] ---
    const stnSouthGroup = new THREE.Group();
    stnSouthGroup.position.set(-28, 0, 28);
    const policeStnBody = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }));
    policeStnBody.position.y = 4;
    policeStnBody.castShadow = true;
    stnSouthGroup.add(policeStnBody);
    scene.add(stnSouthGroup);

    // --- GENERAL URBAN MID-RISE RESIDENCES ---
    const normalBuildings = [
      { x: -16, z: -16, w: 9, d: 8, h: 9, color: 0xdfcbaf, roof: 'pitch', roofColor: 0xb55a30 },
      { x: 16, z: -16, w: 8, d: 8, h: 8, color: 0xdde4ec, roof: 'flat', roofColor: 0x3d4b5c },
      { x: -16, z: 16, w: 9, d: 9, h: 10, color: 0xe5dfd3, roof: 'pitch', roofColor: 0x874033 },
      { x: 16, z: 16, w: 9, d: 8, h: 9, color: 0xd3dce5, roof: 'flat', roofColor: 0x495c6e },
    ];

    normalBuildings.forEach((b) => {
      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.7 }));
      bMesh.position.set(b.x, b.h / 2 + 0.45, b.z);
      bMesh.castShadow = true;
      buildingsGroup.add(bMesh);

      if (b.roof === 'pitch') {
        const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.75, 3.2, 4), new THREE.MeshStandardMaterial({ color: b.roofColor, roughness: 0.6 }));
        roof.rotation.y = Math.PI / 4;
        roof.position.set(b.x, b.h + 2.05, b.z);
        roof.castShadow = true;
        buildingsGroup.add(roof);
      }
    });

    // Street Trees
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.8 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const plantTree = (tx: number, tz: number) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.0), trunkMat);
      trunk.position.set(tx, 1.2, tz);
      trunk.castShadow = true;
      scene.add(trunk);

      const foliage = new THREE.Mesh(new THREE.DodecahedronGeometry(1.3), treeMat);
      foliage.position.set(tx, 2.7, tz);
      foliage.castShadow = true;
      scene.add(foliage);
    };
    [[-6, -14], [-6, -24], [-6, 14], [-6, 24], [6, -14], [6, 14], [-14, 6], [14, -6]].forEach(([tx, tz]) => plantTree(tx, tz));

    // Street Lamps with Warm Cones
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const addLamp = (lx: number, lz: number) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4.5), lampMat);
      pole.position.set(lx, 2.25, lz);
      scene.add(pole);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), lampGlowMat);
      bulb.position.set(lx, 4.5, lz);
      scene.add(bulb);
    };
    [[-5.8, -10], [-5.8, 10], [5.8, -10], [5.8, 10], [-10, -5.8], [10, -5.8]].forEach(([lx, lz]) => addLamp(lx, lz));

    // ==========================================
    // 4. WATER SPRAY HOSE STREAM (FOR FIRE SUPPRESSION)
    // ==========================================
    const sprayParticles = 40;
    const sprayGeo = new THREE.BufferGeometry();
    const sprayPos = new Float32Array(sprayParticles * 3);
    sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
    const sprayMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 1.2, transparent: true, opacity: 0.85 });
    const waterSpray = new THREE.Points(sprayGeo, sprayMat);
    waterSpray.visible = false;
    scene.add(waterSpray);
    waterSprayRef.current = waterSpray;

    // ==========================================
    // 5. ATMOSPHERIC RAIN PARTICLE SYSTEM
    // ==========================================
    const rainCount = 900;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount * 3; i += 3) {
      rainPositions[i] = (Math.random() - 0.5) * 140;
      rainPositions[i + 1] = Math.random() * 60;
      rainPositions[i + 2] = (Math.random() - 0.5) * 140;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.6,
      transparent: true,
      opacity: 0.55
    });
    const rainSystem = new THREE.Points(rainGeo, rainMat);
    scene.add(rainSystem);
    rainSystemRef.current = rainSystem;

    // ==========================================
    // 6. ANIMATION & RENDER LOOP
    // ==========================================
    let animId: number;
    const clock = new THREE.Clock();
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Update Orbit Controls Damping
      controls.update();

      // Animate Vehicles: Smooth Interpolation Towards Assigned Targets
      vehiclesMapRef.current.forEach(({ group, targetPos, flasherLeft, flasherRight, sirenLight }) => {
        // Position lerp
        group.position.lerp(targetPos, delta * 2.8);

        // Turn heading towards target
        const dir = new THREE.Vector3().subVectors(targetPos, group.position);
        if (dir.length() > 0.4) {
          const targetAngle = Math.atan2(dir.x, dir.z);
          group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetAngle, delta * 3.5);
        }

        // Flasher & Rotating Siren Beacon
        const flashPhase = Math.sin(elapsed * 16);
        (flasherLeft.material as THREE.MeshBasicMaterial).opacity = flashPhase > 0 ? 1.0 : 0.2;
        (flasherRight.material as THREE.MeshBasicMaterial).opacity = flashPhase <= 0 ? 1.0 : 0.2;
        sirenLight.intensity = flashPhase > 0 ? 3.0 : 0.8;
      });

      // Animate Active Fires & Smoke Particles
      incidentsMapRef.current.forEach(({ fireLight, flameMesh, smokePoints }) => {
        // Fire turbulence
        fireLight.intensity = 3.0 + Math.sin(elapsed * 18) * 1.8;
        flameMesh.scale.set(
          1.0 + Math.sin(elapsed * 12) * 0.15,
          1.0 + Math.sin(elapsed * 20) * 0.2,
          1.0 + Math.sin(elapsed * 15) * 0.15
        );

        // Rising smoke plume
        const sPos = smokePoints.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < sPos.length; i += 3) {
          sPos[i] += 0.12;
          if (sPos[i] > 20) sPos[i] = 4;
        }
        smokePoints.geometry.attributes.position.needsUpdate = true;
      });

      // Animate Water Suppression Stream
      if (waterSpray.visible) {
        const wPos = waterSpray.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < wPos.length; i += 3) {
          wPos[i] += 0.35;
          wPos[i + 1] = Math.max(0.5, wPos[i + 1] - 0.08);
          if (wPos[i] > 26) {
            wPos[i] = 16;
            wPos[i + 1] = 4;
          }
        }
        waterSpray.geometry.attributes.position.needsUpdate = true;
      }

      // Animate Atmospheric Rain
      if (rainSystem.visible) {
        const rPos = rainSystem.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < rPos.length; i += 3) {
          rPos[i] -= 1.2;
          if (rPos[i] < 0) rPos[i] = 60;
        }
        rainSystem.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Interactive Raycast Click Handler
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current || !camera) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveObjectsRef.current, true);

      if (intersects.length > 0) {
        let rootObj: THREE.Object3D | null = intersects[0].object;
        while (rootObj && !rootObj.userData?.type && rootObj.parent) {
          rootObj = rootObj.parent;
        }
        if (rootObj && rootObj.userData?.type) {
          const uData = rootObj.userData;
          if (uData.type === 'unit') {
            setInspectedEntity({
              type: 'unit',
              title: `${uData.callsign} (${uData.id})`,
              badge: uData.unit_type?.toUpperCase() || 'UNIT',
              badgeColor: '#B5DEFF',
              details: [
                { label: 'Status', value: uData.status?.toUpperCase() || 'AVAILABLE' },
                { label: 'Current Sector', value: uData.location || 'Station' },
                { label: 'Fuel Remaining', value: `${uData.fuel} mins` },
                { label: 'Mission', value: uData.assigned_target ? `Enroute to ${uData.assigned_target}` : 'Standby / Patrol' }
              ]
            });
          } else if (uData.type === 'hospital') {
            setInspectedEntity({
              type: 'hospital',
              title: uData.name,
              badge: 'FACILITY',
              badgeColor: '#C3FFB5',
              details: [
                { label: 'Trauma Capability', value: uData.id === 'H1' ? 'Level 1 Trauma' : 'Urgent Clinic' },
                { label: 'Bed Capacity', value: uData.id === 'H1' ? '28 / 37 Free' : '12 / 29 Free' },
                { label: 'Backup Power', value: 'Nominal Grid (100%)' }
              ]
            });
          } else if (uData.type === 'incident') {
            setInspectedEntity({
              type: 'incident',
              title: uData.name,
              badge: 'ACTIVE HAZARD',
              badgeColor: '#FFE6A5',
              details: [
                { label: 'Incident Code', value: uData.id },
                { label: 'Perimeter Hazard', value: 'Structural Collapse / Flash Fire' },
                { label: 'Recommended Action', value: 'Engage suppression & establish 300m cordon' }
              ]
            });
          }
        }
      }
    };
    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', handlePointerDown);

    let ro: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (ro) ro.disconnect();
      domElem.removeEventListener('pointerdown', handlePointerDown);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // 2. Synchronize Dynamic Entities with `worldState`
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !worldState) return;

    // Toggle Rain visibility based on worldState weather
    const isRaining = worldState.weather?.includes('rain') || worldState.weather?.includes('flood');
    if (rainSystemRef.current) {
      rainSystemRef.current.visible = weatherVisual && isRaining;
    }
    if (scene) {
      const isDark = theme === 'tactical';
      const baseColor = isDark ? 0x060b16 : (isRaining ? 0xb0c4de : 0xdce8f5);
      scene.background = new THREE.Color(baseColor);
      scene.fog = new THREE.FogExp2(
        baseColor,
        isDark ? 0.005 : (isRaining ? 0.0075 : 0.004)
      );
    }

    // Helper: Build Vehicle Mesh with Dual Flashers and Spotlight
    const buildVehicleModel = (type: string, callsign: string, id: string) => {
      const v = new THREE.Group();
      v.name = callsign;
      v.userData = { type: 'unit', callsign, id, unit_type: type };

      const isAmbulance = type === "ambulance";
      const isFire = type === "fire_truck";
      const bodyColor = isAmbulance ? 0xffffff : isFire ? 0xb91c1c : 0x1e3a8a;

      // Main Chassis
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 1.4, isFire ? 5.2 : 4.2),
        new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.35, metalness: 0.15 })
      );
      body.position.y = 1.0;
      body.castShadow = true;
      body.receiveShadow = true;
      v.add(body);

      // Cabin Windshield
      const windShield = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.75, 1.4),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 })
      );
      windShield.position.set(0, 1.75, 0.5);
      v.add(windShield);

      // Dual Red & Blue Roof Emergency Flashers
      const flasherLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.4),
        new THREE.MeshBasicMaterial({ color: 0xff0044, transparent: true })
      );
      flasherLeft.position.set(-0.5, 2.2, 0.5);
      v.add(flasherLeft);

      const flasherRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.3, 0.4),
        new THREE.MeshBasicMaterial({ color: 0x0088ff, transparent: true })
      );
      flasherRight.position.set(0.5, 2.2, 0.5);
      v.add(flasherRight);

      // Rotating Siren Point Light
      const sirenLight = new THREE.PointLight(isFire ? 0xff3b30 : 0x007aff, 2.0, 18);
      sirenLight.position.set(0, 2.8, 0.5);
      v.add(sirenLight);

      // Headlight Cones
      const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl1.position.set(-0.8, 0.9, isFire ? 2.65 : 2.15);
      v.add(hl1);
      const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl2.position.set(0.8, 0.9, isFire ? 2.65 : 2.15);
      v.add(hl2);

      // Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
      const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
      [
        [-1.2, 0.42, 1.3],
        [1.2, 0.42, 1.3],
        [-1.2, 0.42, -1.3],
        [1.2, 0.42, -1.3],
      ].forEach(([wx, wy, wz]) => {
        const w = new THREE.Mesh(wheelGeo, wheelMat);
        w.rotation.z = Math.PI / 2;
        w.position.set(wx, wy, wz);
        v.add(w);
      });

      return { group: v, flasherLeft, flasherRight, sirenLight };
    };

    // 1. UPDATE AND INTERPOLATE EMERGENCY UNITS
    const units = worldState.units || {};
    let fireEngineOnScene = false;

    Object.entries(units).forEach(([uid, u]: [string, any]) => {
      const key = u.callsign || uid;
      let vehRecord = vehiclesMapRef.current.get(key);

      if (!vehRecord) {
        const built = buildVehicleModel(u.unit_type, key, uid);
        scene.add(built.group);
        interactiveObjectsRef.current.push(built.group);

        const initTarget = SECTOR_COORDS[u.location] || SECTOR_COORDS["Station_North"];
        built.group.position.set(initTarget[0], initTarget[1], initTarget[2]);

        vehRecord = {
          group: built.group,
          targetPos: new THREE.Vector3(initTarget[0], initTarget[1], initTarget[2]),
          flasherLeft: built.flasherLeft,
          flasherRight: built.flasherRight,
          sirenLight: built.sirenLight
        };
        vehiclesMapRef.current.set(key, vehRecord);
      }

      // Update unit metadata for the inspector
      vehRecord.group.userData = {
        type: 'unit',
        callsign: key,
        id: uid,
        unit_type: u.unit_type,
        status: u.status,
        location: u.location,
        fuel: u.fuel_remaining_minutes,
        assigned_target: u.assigned_target
      };

      // Set target vector for smooth driving interpolation
      const targetSector = u.assigned_target || u.location || "Station_North";
      const tCoords = SECTOR_COORDS[targetSector] || SECTOR_COORDS["Station_North"];
      vehRecord.targetPos.set(tCoords[0], tCoords[1], tCoords[2]);

      // Check if Fire Engine is currently on-scene at Sector 5C
      if (u.unit_type === "fire_truck" && (u.location === "Sector_5C" || u.assigned_target === "Sector_5C") && u.status !== "available") {
        fireEngineOnScene = true;
      }
    });

    // Toggle water suppression hose stream
    if (waterSprayRef.current) {
      waterSprayRef.current.visible = fireEngineOnScene;
      if (fireEngineOnScene) {
        waterSprayRef.current.position.set(16, 1.5, -24);
      }
    }

    // 2. UPDATE ACTIVE HAZARDS (FLAMES, SMOKE COLUMNS)
    const incidents = worldState.incidents || {};

    // Remove extinguished incidents
    incidentsMapRef.current.forEach((val, incId) => {
      if (!incidents[incId] || !incidents[incId].active || incidents[incId].severity === "extinguished") {
        scene.remove(val.group);
        incidentsMapRef.current.delete(incId);
      }
    });

    // Add or modulate active incidents
    Object.entries(incidents).forEach(([incId, inc]: [string, any]) => {
      if (!inc.active || inc.severity === "extinguished") return;

      let hazard = incidentsMapRef.current.get(incId);
      if (!hazard) {
        const hGroup = new THREE.Group();
        const coords = SECTOR_COORDS[inc.location] || [26, 0, -24];
        hGroup.position.set(coords[0], coords[1], coords[2]);

        // Point Light
        const fireLight = new THREE.PointLight(0xff4500, 3.8, 32);
        fireLight.position.set(0, 5, 0);
        hGroup.add(fireLight);

        // Core Flame Cone
        const flameMesh = new THREE.Mesh(
          new THREE.ConeGeometry(2.2, 5.5, 8),
          new THREE.MeshBasicMaterial({ color: 0xff3b00 })
        );
        flameMesh.position.set(0, 2.75, 0);
        hGroup.add(flameMesh);

        // Smoke Plume
        const smokeParticles = 28;
        const smokeGeo = new THREE.BufferGeometry();
        const sPositions = new Float32Array(smokeParticles * 3);
        for (let i = 0; i < smokeParticles * 3; i += 3) {
          sPositions[i] = (Math.random() - 0.5) * 4;
          sPositions[i + 1] = 4 + Math.random() * 10;
          sPositions[i + 2] = (Math.random() - 0.5) * 4;
        }
        smokeGeo.setAttribute('position', new THREE.BufferAttribute(sPositions, 3));
        const smokePoints = new THREE.Points(
          smokeGeo,
          new THREE.PointsMaterial({ color: 0x475569, size: 2.8, transparent: true, opacity: 0.65 })
        );
        hGroup.add(smokePoints);

        scene.add(hGroup);
        hazard = { group: hGroup, fireLight, flameMesh, smokePoints };
        incidentsMapRef.current.set(incId, hazard);
      }
    });

    // 3. UPDATE ROADBLOCK BARRICADES
    const roads = worldState.roads || {};
    Object.entries(roads).forEach(([roadId, status]: [string, any]) => {
      const isBlocked = status === "blocked";
      const existing = roadblocksMapRef.current.get(roadId);

      if (isBlocked && !existing) {
        const rCoords = ROAD_BLOCK_COORDS[roadId] || [0, 0.4, 0];
        const barGroup = new THREE.Group();
        barGroup.position.set(rCoords[0], rCoords[1], rCoords[2]);

        // Barricade board with orange caution stripes
        const barMesh = new THREE.Mesh(
          new THREE.BoxGeometry(4.8, 1.2, 0.4),
          new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.5 })
        );
        barMesh.position.y = 0.6;
        barGroup.add(barMesh);

        // Warning Beacon Light
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        beacon.position.y = 1.45;
        barGroup.add(beacon);

        const beaconLight = new THREE.PointLight(0xff0000, 1.5, 8);
        beaconLight.position.y = 1.6;
        barGroup.add(beaconLight);

        scene.add(barGroup);
        roadblocksMapRef.current.set(roadId, barGroup);
      } else if (!isBlocked && existing) {
        scene.remove(existing);
        roadblocksMapRef.current.delete(roadId);
      }
    });

  }, [worldState, weatherVisual, theme]);

  // Smooth Camera Preset Controller
  const setCameraPreset = (preset: string) => {
    setActiveCamPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    const controls = controlsRef.current;

    switch (preset) {
      case 'overview':
        cameraRef.current.position.set(75, 68, 75);
        controls.target.set(0, 0, 0);
        break;
      case 'sector_5c':
        cameraRef.current.position.set(45, 28, -8);
        controls.target.set(26, 4, -24);
        break;
      case 'sector_6b':
        cameraRef.current.position.set(45, 30, 45);
        controls.target.set(28, 6, 26);
        break;
      case 'hospital':
        cameraRef.current.position.set(22, 24, -28);
        controls.target.set(0, 8, -46);
        break;
      case 'topdown':
        cameraRef.current.position.set(0, 110, 0.01);
        controls.target.set(0, 0, 0);
        break;
    }
  };

  const activeIncidents = Object.values(worldState?.incidents || {}).filter((i: any) => i.active && i.severity !== "extinguished");

  return (
    <div className={`relative w-full ${isTheaterMode ? 'h-[620px]' : 'h-[490px]'} rounded-[24px] overflow-hidden select-none transition-all duration-300 ${
      theme === 'tactical'
        ? 'bg-[#060b16] border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.15)]'
        : 'bg-[#dce8f5] border-2 border-white shadow-inner'
    }`}>
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Tactical Status Badges */}
      <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
        <div className={`backdrop-blur-md px-3.5 py-1.5 rounded-full border text-[11px] font-[800] shadow-sm flex items-center gap-2 ${
          theme === 'tactical'
            ? 'bg-slate-900/90 border-slate-700/80 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
            : 'bg-white/95 border-white text-[#2F2940]'
        }`}>
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
          <span>NYC SECTOR 5 & 6 // HIGH-RES 3D COMMAND MESH</span>
        </div>

        {activeIncidents.length > 0 ? (
          <div className={`backdrop-blur-md px-3 py-1 rounded-full border text-[10px] font-[800] shadow-sm flex items-center gap-1.5 w-fit ${
            theme === 'tactical'
              ? 'bg-red-950/80 border-red-500/40 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
              : 'bg-[#fee2e2]/95 border-white text-[#b91c1c]'
          }`}>
            <Flame size={12} className="animate-bounce text-red-400" />
            <span>ACTIVE HAZARD ENGAGED AT SECTOR 5C (FIRE ENGINE ON-SCENE)</span>
          </div>
        ) : (
          <div className={`backdrop-blur-md px-3 py-1 rounded-full border text-[10px] font-[800] shadow-sm flex items-center gap-1.5 w-fit ${
            theme === 'tactical'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-[#ecfdf5]/95 border-white text-[#047857]'
          }`}>
            <span>✓</span>
            <span>ALL CORRIDORS SECURED & NOMINAL</span>
          </div>
        )}
      </div>

      {/* Camera View Presets & Mode Toolbar */}
      <div className={`absolute top-3 right-3 flex items-center gap-1.5 backdrop-blur-md border p-1 rounded-full text-[10px] font-[800] shadow-md z-10 ${
        theme === 'tactical'
          ? 'bg-slate-900/90 border-slate-700/80 text-slate-300 shadow-[0_4px_20px_rgba(0,0,0,0.5)]'
          : 'bg-white/95 border-white text-[#4A4458]'
      }`}>
        <button
          onClick={() => setCameraPreset('overview')}
          className={`px-3 py-1 rounded-full transition ${
            activeCamPreset === 'overview'
              ? (theme === 'tactical' ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' : 'bg-[#2F2940] text-white shadow-sm')
              : (theme === 'tactical' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-[#F3EFFC] text-[#5A4E75]')
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setCameraPreset('sector_5c')}
          className={`px-3 py-1 rounded-full transition ${
            activeCamPreset === 'sector_5c'
              ? (theme === 'tactical' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'bg-[#FFE6A5] text-[#874b0c] shadow-sm')
              : (theme === 'tactical' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-[#F3EFFC] text-[#5A4E75]')
          }`}
        >
          🔥 Fire 5C
        </button>
        <button
          onClick={() => setCameraPreset('sector_6b')}
          className={`px-3 py-1 rounded-full transition ${
            activeCamPreset === 'sector_6b'
              ? (theme === 'tactical' ? 'bg-purple-500 text-white font-bold shadow-sm' : 'bg-[#D6C2FF] text-[#4a2d82] shadow-sm')
              : (theme === 'tactical' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-[#F3EFFC] text-[#5A4E75]')
          }`}
        >
          🚇 Subway 6B
        </button>
        <button
          onClick={() => setCameraPreset('hospital')}
          className={`px-3 py-1 rounded-full transition ${
            activeCamPreset === 'hospital'
              ? (theme === 'tactical' ? 'bg-blue-500 text-white font-bold shadow-sm' : 'bg-[#B5DEFF] text-[#1b446f] shadow-sm')
              : (theme === 'tactical' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-[#F3EFFC] text-[#5A4E75]')
          }`}
        >
          🏥 Hospital H1
        </button>
        <button
          onClick={() => setCameraPreset('topdown')}
          className={`px-3 py-1 rounded-full transition ${
            activeCamPreset === 'topdown'
              ? (theme === 'tactical' ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm' : 'bg-[#C3FFB5] text-[#2E5A2A] shadow-sm')
              : (theme === 'tactical' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-[#F3EFFC] text-[#5A4E75]')
          }`}
        >
          🗺️ 2D Map
        </button>
        <button
          onClick={() => setWeatherVisual(!weatherVisual)}
          title="Toggle Weather Rain Precipitation"
          className={`w-7 h-7 rounded-full flex items-center justify-center border transition ${
            theme === 'tactical'
              ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-cyan-300'
              : 'bg-white hover:bg-[#F3EFFC] border-white text-[#7B6E96]'
          }`}
        >
          {weatherVisual ? <CloudRain size={13} className="text-[#0284c7]" /> : <Sun size={13} className="text-[#f59e0b]" />}
        </button>

        {onToggleTheater && (
          <button
            onClick={onToggleTheater}
            title={isTheaterMode ? "Exit Theater Mode" : "Expand 3D Theater Mode"}
            className={`w-7 h-7 rounded-full flex items-center justify-center border transition ${
              theme === 'tactical'
                ? (isTheaterMode ? 'bg-cyan-500 text-slate-950 border-cyan-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-cyan-300')
                : (isTheaterMode ? 'bg-[#2F2940] text-white border-white' : 'bg-white hover:bg-[#F3EFFC] border-white text-[#7B6E96]')
            }`}
          >
            <Maximize2 size={13} />
          </button>
        )}
      </div>

      {/* Tactical Object Inspector Overlay (Triggered by Clicking Any Unit/District) */}
      {inspectedEntity && (
        <div className={`absolute bottom-4 left-4 max-w-xs w-full backdrop-blur-md border rounded-[20px] p-3.5 shadow-xl z-20 animate-in fade-in slide-in-from-bottom-2 ${
          theme === 'tactical'
            ? 'bg-slate-900/95 border-slate-700/80 text-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.6)]'
            : 'bg-white/95 border-2 border-white text-[#2F2940]'
        }`}>
          <div className={`flex items-center justify-between pb-2 border-b mb-2 ${
            theme === 'tactical' ? 'border-slate-800' : 'border-[#EEE8F8]'
          }`}>
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-[800] border border-white"
                style={{ backgroundColor: inspectedEntity.badgeColor }}
              >
                {inspectedEntity.type === 'unit' ? <Truck size={12} className="text-slate-900" /> : inspectedEntity.type === 'hospital' ? <Bed size={12} className="text-slate-900" /> : <Flame size={12} className="text-slate-900" />}
              </div>
              <span className={`font-[800] text-xs truncate max-w-[150px] ${
                theme === 'tactical' ? 'text-cyan-200' : 'text-[#2F2940]'
              }`}>
                {inspectedEntity.title}
              </span>
            </div>
            <button 
              onClick={() => setInspectedEntity(null)}
              className={theme === 'tactical' ? 'text-slate-400 hover:text-white text-xs font-[800]' : 'text-[#9A8EB0] hover:text-[#2F2940] text-xs font-[800]'}
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 text-[11px] font-[700]">
            {inspectedEntity.details.map((d, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className={theme === 'tactical' ? 'text-slate-400' : 'text-[#8E819E]'}>{d.label}:</span>
                <span className={`font-[800] ${theme === 'tactical' ? 'text-cyan-300 font-mono' : 'text-[#244974]'}`}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orbit Controls Guidance Pill */}
      <div className={`absolute bottom-3 right-3 flex items-center gap-2 backdrop-blur-md px-3 py-1 rounded-full border text-[9px] font-[800] shadow-sm pointer-events-none ${
        theme === 'tactical'
          ? 'bg-slate-900/85 border-slate-700/80 text-slate-300 shadow-[0_2px_10px_rgba(0,0,0,0.4)]'
          : 'bg-white/90 border-white text-[#7B6E96]'
      }`}>
        <Compass size={11} className={theme === 'tactical' ? 'text-cyan-400' : 'text-[#244974]'} />
        <span>Left-click: Orbit • Right-click: Pan • Scroll: Zoom • Click entity: Inspect</span>
      </div>
    </div>
  );
};
