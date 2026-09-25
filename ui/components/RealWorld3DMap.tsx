import React, { useState } from 'react';
import { Flame } from 'lucide-react';

interface Props {
  worldState?: any;
}

export const RealWorld3DMap: React.FC<Props> = ({ worldState }) => {
  const [pitch, setPitch] = useState<number>(56);
  const [rotation, setRotation] = useState<number>(-22);

  // 3D Extruded Building Blocks with heights and footprint dimensions
  const buildings = [
    { id: 'b1', top: 50, left: 70, width: 65, height: 55, elevation: 90, color: '#1a2b42', label: 'Sector 5A' },
    { id: 'b2', top: 130, left: 55, width: 75, height: 60, elevation: 130, color: '#162335', label: 'Financial Plz' },
    { id: 'b3', top: 60, left: 340, width: 90, height: 65, elevation: 110, color: '#1c314d', label: 'Sector 5C' },
    { id: 'b4', top: 170, left: 330, width: 85, height: 70, elevation: 80, color: '#17273d', label: 'Metro Hub' },
    { id: 'b5', top: 280, left: 360, width: 95, height: 80, elevation: 140, color: '#131e2e', label: 'Sector 6B' },
    { id: 'b6', top: 310, left: 80, width: 70, height: 75, elevation: 65, color: '#1d2f47', label: 'West Warehouses' },
  ];

  return (
    <div className="relative w-full h-[480px] bg-[#070d18] rounded border-4 border-[#2b170c] overflow-hidden shadow-[inset_0_4px_16px_rgba(0,0,0,0.9)] select-none">
      
      {/* 3D Perspective Viewport */}
      <div 
        className="w-full h-full relative"
        style={{
          perspective: '1000px',
        }}
      >
        <div 
          className="w-full h-full absolute inset-0 transition-transform duration-500 ease-out"
          style={{
            transform: `rotateX(${pitch}deg) rotateZ(${rotation}deg) scale(0.95)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Ground City Grid Surface */}
          <div 
            className="absolute -inset-24 bg-[#0a1322] border-2 border-[#162a47]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(0, 240, 255, 0.15) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0, 240, 255, 0.15) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          >
            {/* Street Corridors */}
            <div className="absolute top-[140px] left-0 right-0 h-9 bg-[#0e1c31] border-y border-[#00f0ff]/30 flex items-center justify-around">
              <span className="text-[9px] font-mono tracking-widest text-cyan-500/60 font-black">AVENUE A // MAIN METRO ARTERY</span>
              <span className="text-[9px] font-mono tracking-widest text-cyan-500/60 font-black">CORRIDOR 01</span>
            </div>

            <div className="absolute top-[270px] left-0 right-0 h-10 bg-[#0e1c31] border-y border-[#00f0ff]/30 flex items-center justify-around">
              <span className="text-[9px] font-mono tracking-widest text-cyan-500/60 font-black">AVENUE B // LOGISTICS HIGHWAY</span>
            </div>

            <div className="absolute left-[200px] top-0 bottom-0 w-8 bg-[#0e1c31] border-x border-[#00f0ff]/30"></div>
            <div className="absolute left-[310px] top-0 bottom-0 w-9 bg-[#0e1c31] border-x border-[#00f0ff]/30"></div>

            {/* Evacuation Zone Vector Polygon on Ground */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <polygon 
                points="170,430 290,180 470,250 370,440" 
                fill="rgba(245, 158, 11, 0.22)" 
                stroke="#f59e0b" 
                strokeWidth="2.5" 
                strokeDasharray="6 4" 
              />
              <line x1="160" y1="410" x2="380" y2="410" stroke="#00f0ff" strokeWidth="2.5" strokeDasharray="4 3" />
            </svg>

            {/* Road Blocked Barricade */}
            <div className="absolute top-[145px] left-[215px] bg-red-950 text-red-300 border border-red-600 px-2 py-0.5 text-[8px] font-black tracking-widest shadow-red-glow">
              ⊗ CORRIDOR BLOCKED
            </div>
          </div>

          {/* 3D Extruded Buildings (Rendered with real Z-depth) */}
          {buildings.map((b) => (
            <div
              key={b.id}
              className="absolute transition-transform duration-300"
              style={{
                top: `${b.top}px`,
                left: `${b.left}px`,
                width: `${b.width}px`,
                height: `${b.height}px`,
                transformStyle: 'preserve-3d',
                transform: `translateZ(${b.elevation / 2}px)`,
              }}
            >
              {/* Roof (Top Face) */}
              <div 
                className="absolute inset-0 border border-cyan-400/40 flex flex-col items-center justify-center text-center p-1"
                style={{
                  background: 'linear-gradient(135deg, #1f3654 0%, #15253b 100%)',
                  transform: `translateZ(${b.elevation / 2}px)`,
                  boxShadow: '0 0 12px rgba(0, 240, 255, 0.2)',
                }}
              >
                <span className="text-[8px] font-black text-cyan-200 tracking-wider font-mono uppercase">{b.label}</span>
                <span className="text-[7px] text-cyan-400 font-bold">{b.elevation}m</span>
              </div>

              {/* Front Facade */}
              <div 
                className="absolute left-0 right-0 bottom-0 bg-gradient-to-b from-[#16273d] to-[#0c1624] border-x border-b border-[#234168]"
                style={{
                  height: `${b.elevation}px`,
                  transform: 'rotateX(-90deg)',
                  transformOrigin: 'bottom',
                }}
              />

              {/* Side Facade */}
              <div 
                className="absolute top-0 bottom-0 right-0 bg-gradient-to-b from-[#111f31] to-[#080f1a] border-y border-r border-[#1e385c]"
                style={{
                  width: `${b.elevation}px`,
                  transform: 'rotateY(90deg)',
                  transformOrigin: 'right',
                }}
              />
            </div>
          ))}

          {/* Tactical Overlay: Burning Structure Sector 5C */}
          <div 
            className="absolute top-[45px] left-[350px] pointer-events-none"
            style={{ transform: 'translateZ(135px)' }}
          >
            <div className="bg-red-950/95 border-2 border-red-500 text-white font-black text-[9px] px-2 py-1 rounded shadow-red-glow flex items-center space-x-1 animate-pulse font-mono">
              <Flame size={13} className="text-red-400 animate-bounce" />
              <span>BURNING Sector 5C</span>
            </div>
          </div>

          {/* Tactical Overlay: Burning Structure Sector 6B */}
          <div 
            className="absolute top-[260px] left-[380px] pointer-events-none"
            style={{ transform: 'translateZ(155px)' }}
          >
            <div className="bg-red-950/95 border-2 border-red-500 text-white font-black text-[9px] px-2 py-1 rounded shadow-red-glow flex items-center space-x-1 animate-pulse font-mono">
              <Flame size={13} className="text-red-400 animate-bounce" />
              <span>BURNING Sector 6B</span>
            </div>
          </div>

          {/* Evacuation Label */}
          <div 
            className="absolute top-[280px] left-[220px] pointer-events-none"
            style={{ transform: 'translateZ(20px)' }}
          >
            <div className="bg-[#1e150a] border border-amber-500/80 text-amber-300 font-mono text-[9px] px-2 py-1 rounded font-black shadow-lg">
              EVACUATION ZONE — Sector 5
            </div>
          </div>

          {/* 3D Units on Ground */}
          {/* POL-02 */}
          <div 
            className="absolute top-[135px] left-[260px]"
            style={{ transform: 'translateZ(10px)' }}
          >
            <div className="bg-blue-900 border border-blue-400 text-blue-200 px-1.5 py-0.5 rounded text-[8px] font-black font-mono shadow-lg flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></div>
              <span>POL-02</span>
            </div>
          </div>

          {/* FIRE-03 */}
          <div 
            className="absolute top-[270px] left-[330px]"
            style={{ transform: 'translateZ(10px)' }}
          >
            <div className="bg-red-900 border border-red-400 text-red-200 px-1.5 py-0.5 rounded text-[8px] font-black font-mono shadow-lg flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></div>
              <span>FIRE-03</span>
            </div>
          </div>

          {/* AMB-07 */}
          <div 
            className="absolute top-[370px] left-[240px]"
            style={{ transform: 'translateZ(10px)' }}
          >
            <div className="bg-cyan-950 border border-cyan-400 text-cyan-200 px-1.5 py-0.5 rounded text-[8px] font-black font-mono shadow-lg flex items-center space-x-1">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></div>
              <span>AMB-07</span>
            </div>
          </div>

        </div>
      </div>

      {/* Perspective & 3D Tilt Controls */}
      <div className="absolute bottom-2 right-2 flex items-center space-x-2 bg-[#0c1726]/90 border border-[#1e3452] px-2.5 py-1 rounded text-[9px] font-mono text-cyan-300">
        <span className="text-gray-400 font-bold uppercase">3D Camera:</span>
        <button 
          onClick={() => setPitch((p) => Math.min(p + 6, 75))}
          className="px-1.5 py-0.5 bg-[#172b47] hover:bg-[#223f66] rounded font-bold border border-cyan-800"
          title="Tilt Up"
        >
          ▲ TILT
        </button>
        <button 
          onClick={() => setPitch((p) => Math.max(p - 6, 20))}
          className="px-1.5 py-0.5 bg-[#172b47] hover:bg-[#223f66] rounded font-bold border border-cyan-800"
          title="Tilt Down"
        >
          ▼ FLAT
        </button>
        <button 
          onClick={() => setRotation((r) => r - 15)}
          className="px-1.5 py-0.5 bg-[#172b47] hover:bg-[#223f66] rounded font-bold border border-cyan-800"
          title="Rotate Left"
        >
          ↺ ROT
        </button>
      </div>

      {/* Grid Coordinates HUD Indicator */}
      <div className="absolute top-2 left-2 bg-[#071322]/80 border border-cyan-900/60 px-2 py-0.5 rounded text-[8px] font-mono text-cyan-400">
        SECTOR COORD: [40.7128° N, 74.0060° W] • ELEVATION MATRIX: ACTIVE
      </div>
    </div>
  );
};