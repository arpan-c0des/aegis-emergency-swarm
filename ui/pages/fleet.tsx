import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { 
  Truck, Navigation, AlertTriangle, Fuel, ArrowRight, MapPin, 
  ShieldAlert, Sparkles, Shield, Clock, Activity, Check, ExternalLink, Radio, CloudSun,
  Zap, CornerDownRight, RotateCcw, Layers, Droplets, Wind, RefreshCw, Lock, Volume2, Siren, Flame, Ambulance
} from 'lucide-react';
import { 
  computeBidirectionalAStar, 
  KOLKATA_FLEET_NODES, 
  BidiRouteResult,
  KOLKATA_EDGES
} from '../utils/bidirectionalAStar';
import { 
  fetchKolkataLiveWeather, 
  LiveWeatherData, 
  getSimulatedWeatherScenario 
} from '../utils/liveWeather';
import { useAuth } from '../contexts/AuthContext';
import { TacticalAuthBadge } from '../components/TacticalAuthBadge';
import { ROLE_CONFIGS, UserRole } from '../utils/auth';

// Dynamically import Kolkata Leaflet Fleet Map to prevent SSR window issues
const KolkataFleetMap = dynamic(() => import('../components/KolkataFleetMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[460px] rounded-2xl bg-[#09090B] border border-[#27272A] flex flex-col items-center justify-center text-[#71717A] gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-[#3B82F6] border-t-transparent animate-spin" />
      <span className="font-mono text-xs text-[#A1A1AA]">Initializing Kolkata Tactical Leaflet Engine…</span>
    </div>
  )
});

export default function FleetPage() {
  const router = useRouter();
  const { user } = useAuth();

  const isOperator = user?.role === 'fleet_operator';
  const isCommander = user?.role === 'incident_commander';

  // Automatically clean residual driver query from URL for Fleet Operator so it always opens fresh with all vehicles
  useEffect(() => {
    if (isOperator && router.query.driver) {
      router.replace('/fleet', undefined, { shallow: true });
    }
  }, [isOperator, router.query.driver]);

  // Detect Driver Mode either from logged-in user role or URL query parameter
  const driverQuery = router.query.driver as string | undefined;
  
  const activeDriverRole: 'driver_police' | 'driver_fire' | 'driver_ambulance' | null = useMemo(() => {
    // Fleet Operator has full access to all vehicles and is NEVER locked into driver mode
    if (isOperator) {
      return null;
    }
    // Field Driver roles are strictly locked to their driver cockpit
    if (user?.role === 'driver_police') return 'driver_police';
    if (user?.role === 'driver_fire') return 'driver_fire';
    if (user?.role === 'driver_ambulance') return 'driver_ambulance';

    // For Commander (or unauthenticated preview), activate driver mode only if query param is set
    if (driverQuery === 'police') return 'driver_police';
    if (driverQuery === 'fire') return 'driver_fire';
    if (driverQuery === 'ambulance') return 'driver_ambulance';

    return null;
  }, [user?.role, driverQuery, isOperator]);

  const isDriverMode = Boolean(activeDriverRole);

  // Default unit assignment based on driver role
  const lockedUnitForDriver = useMemo(() => {
    if (activeDriverRole === 'driver_police') return 'POL-02';
    if (activeDriverRole === 'driver_fire') return 'FIRE-03';
    if (activeDriverRole === 'driver_ambulance') return 'AMB-07';
    return 'AMB-07';
  }, [activeDriverRole]);

  const [selectedUnit, setSelectedUnit] = useState<string>(lockedUnitForDriver);
  const [destination, setDestination] = useState<string>('H1_Central');
  const [blockedRoads, setBlockedRoads] = useState<string[]>(['Road_B2']);
  const [routeResult, setRouteResult] = useState<BidiRouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fleetUnits, setFleetUnits] = useState<any>({});
  const [clock, setClock] = useState('');
  const [backendOnline, setBackendOnline] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Keep selectedUnit synchronized if driver mode is active
  useEffect(() => {
    if (isDriverMode) {
      setSelectedUnit(lockedUnitForDriver);
    }
  }, [isDriverMode, lockedUnitForDriver]);

  // Live Adaptive Weather State
  const [weatherData, setWeatherData] = useState<LiveWeatherData | null>(null);
  const [selectedWeatherScenario, setSelectedWeatherScenario] = useState<'live' | 'monsoon_rain' | 'cyclone_storm' | 'river_fog'>('live');
  const [isRefreshingWeather, setIsRefreshingWeather] = useState(false);

  const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://aegis-backend-5fx3.onrender.com').replace(/\/$/, '');

  // Fetch Live Weather for Kolkata Region
  const loadKolkataWeather = async (scenario: 'live' | 'monsoon_rain' | 'cyclone_storm' | 'river_fog' = selectedWeatherScenario) => {
    setIsRefreshingWeather(true);
    try {
      if (scenario === 'live') {
        const live = await fetchKolkataLiveWeather();
        setWeatherData(live);
      } else {
        const base = await fetchKolkataLiveWeather();
        const sim = getSimulatedWeatherScenario(scenario);
        setWeatherData({ ...base, ...sim, roadImpact: sim.roadImpact || base.roadImpact });
      }
    } catch (e) {
      console.error('Weather load error:', e);
    } finally {
      setIsRefreshingWeather(false);
    }
  };

  useEffect(() => {
    loadKolkataWeather(selectedWeatherScenario);
    const interval = setInterval(() => {
      if (selectedWeatherScenario === 'live') loadKolkataWeather('live');
    }, 180000);
    return () => clearInterval(interval);
  }, [selectedWeatherScenario]);

  // Determine origin depot node based on selected vehicle
  const getUnitOrigin = (unitId: string): string => {
    if (unitId === 'AMB-12' || unitId === 'POL-02') {
      return 'Station_South'; // Alipore Command Depot
    }
    return 'Station_North';   // Shyambazar Command Depot
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString('en-GB'));
    }, 1000);
    setClock(new Date().toLocaleTimeString('en-GB'));
    return () => clearInterval(timer);
  }, []);

  // Fetch backend status and initial state
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/state`)
      .then((res) => res.json())
      .then((data) => {
        if (data.units) setFleetUnits(data.units);
        if (data.roads) {
          const blocked = Object.entries(data.roads)
            .filter(([_, status]) => status === 'blocked')
            .map(([roadId]) => roadId);
          if (blocked.length > 0) setBlockedRoads(blocked);
        }
        setBackendOnline(true);
      })
      .catch(() => setBackendOnline(false));
  }, []);

  // Compute Bidirectional A* route whenever unit, destination, roadblocks, or weather change
  const computeRoute = async () => {
    setLoading(true);
    const effectiveUnit = isDriverMode ? lockedUnitForDriver : selectedUnit;
    const origin = getUnitOrigin(effectiveUnit);

    // 1. Instant local Bidirectional A* calculation with adaptive weather physics
    try {
      const localResult = computeBidirectionalAStar(origin, destination, blockedRoads, weatherData?.roadImpact);
      setRouteResult(localResult);
    } catch (err) {
      console.error('Local Bidirectional A* calculation error:', err);
    }

    // 2. Concurrently reconcile with backend /api/fleet/route
    try {
      const res = await fetch(`${BACKEND_URL}/api/fleet/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unit_id: effectiveUnit, destination: destination })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.routing) {
          if (data.routing.distance_km !== undefined) {
            setRouteResult((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                distanceKm: data.routing.distance_km ?? prev.distanceKm,
                etaMinutes: data.routing.eta_minutes ?? prev.etaMinutes,
                waypoints: data.routing.waypoints ?? prev.waypoints,
                metrics: {
                  ...prev.metrics,
                  meetingNode: data.routing.metrics?.meeting_node ?? prev.metrics.meetingNode,
                  nodesExpandedForward: data.routing.metrics?.nodes_expanded_forward ?? prev.metrics.nodesExpandedForward,
                  nodesExpandedBackward: data.routing.metrics?.nodes_expanded_backward ?? prev.metrics.nodesExpandedBackward,
                  totalNodesExpanded: data.routing.metrics?.total_nodes_expanded ?? prev.metrics.totalNodesExpanded
                }
              };
            });
          }
        }
      }
    } catch (e) {
      // Backend offline fallback handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    computeRoute();
  }, [selectedUnit, destination, blockedRoads, weatherData?.roadImpact, lockedUnitForDriver, isDriverMode]);

  // Toggle road blockage (Restricted to non-drivers)
  const toggleRoadblock = (roadId: string) => {
    if (isDriverMode) return; // Drivers cannot toggle roadblocks
    setBlockedRoads((prev) => 
      prev.includes(roadId) ? prev.filter((r) => r !== roadId) : [...prev, roadId]
    );
  };

  // Play synthetic or dynamic voice dispatch instruction
  const handlePlayVoiceInstructions = () => {
    if (typeof window === 'undefined') return;
    setIsPlayingAudio(true);

    const destNode = KOLKATA_FLEET_NODES[destination];
    const destName = destNode ? destNode.name.split('(')[0].trim() : destination;
    
    let speechText = '';
    if (activeDriverRole === 'driver_police') {
      speechText = `Attention Police Interceptor 0 2. Dispatch directive: Clear priority arterial corridor to ${destName}. Distance ${routeResult?.distanceKm || '9'} kilometers. Maintain high visibility siren escort.`;
    } else if (activeDriverRole === 'driver_fire') {
      speechText = `Attention Fire Engine 0 3. Dispatch directive: Proceed immediately to ${destName}. Distance ${routeResult?.distanceKm || '11'} kilometers. Establish water supply and cooling perimeter on arrival.`;
    } else {
      speechText = `Attention Paramedic Ambulance 0 7. Dispatch directive: Expedite trauma transport to ${destName}. Distance ${routeResult?.distanceKm || '8'} kilometers. SSKM and Apollo trauma bays alerted.`;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingAudio(false), 2000);
    }
  };

  // Tailored Tactical Instructions for Driver Cockpits
  const driverInstructions = useMemo(() => {
    const destNode = KOLKATA_FLEET_NODES[destination];
    const destName = destNode ? destNode.name.split('(')[0].trim() : destination;

    if (activeDriverRole === 'driver_police') {
      return {
        unitTag: 'POL-02 · RAPID INTERCEPTOR',
        badgeColor: '#6366F1',
        icon: '🚓',
        orders: [
          `Maintain primary siren corridor toward ${destName}.`,
          `Reroute civilian traffic away from ${blockedRoads.join(', ') || 'congested sectors'}.`,
          `Coordinate with Lalbazar Traffic Police HQ at B.B.D. Bagh intersection.`,
          `Verify clear lane passage for following heavy fire and trauma units.`
        ],
        caution: 'High-speed interceptor mode active. Monitor wet asphalt surface traction.'
      };
    }
    if (activeDriverRole === 'driver_fire') {
      return {
        unitTag: 'FIRE-03 · HEAVY PUMPER ENGINE',
        badgeColor: '#EF4444',
        icon: '🚒',
        orders: [
          `Proceed with 4,000-liter water tender toward ${destName}.`,
          `Avoid low-clearance pedestrian overpasses near Strand Road.`,
          `Stand by for thermal suppression and perimeter gas isolation.`,
          `Hook up to primary hydrant manifold upon staging at target coordinate.`
        ],
        caution: 'Heavy vehicle inertia. Maintain extra braking distance on wet road segments.'
      };
    }
    return {
      unitTag: 'AMB-07 · ADVANCED LIFE SUPPORT',
      badgeColor: '#EC4899',
      icon: '🚑',
      orders: [
        `Transport critical triage cases directly to ${destName}.`,
        `Direct priority green wave requested across AJC Bose Road Flyover.`,
        `Transmit patient vitals to SSKM Trauma Bay (H1) and Apollo Clinic (H2).`,
        `Bypass ground waterlogging via elevated Maa Flyover ramps if directed.`
      ],
      caution: 'Patient stability priority. Smooth braking curves required in rain.'
    };
  }, [activeDriverRole, destination, blockedRoads]);

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col font-sans selection:bg-[#3B82F6]/30">
      <Head>
        <title>
          {isDriverMode 
            ? `${ROLE_CONFIGS[activeDriverRole!].shortTitle} Cockpit | Aegis Kolkata Fleet` 
            : 'Fleet Uber Kolkata | Bidirectional A* Emergency Routing'}
        </title>
        <meta name="description" content="Kolkata tactical emergency fleet routing with Bidirectional A* shortest road distance" />
      </Head>

      {/* Tactical Top Header Bar */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-[#27272A] bg-[#0E0E11]/90 px-3 sm:px-6 backdrop-blur-md">
        
        {/* Brand & Sector Header */}
        <div className="flex items-center gap-3">
          <div 
            className="flex h-9 w-9 items-center justify-center rounded-xl border"
            style={{
              backgroundColor: isDriverMode ? `${driverInstructions.badgeColor}20` : '#3B82F615',
              borderColor: isDriverMode ? `${driverInstructions.badgeColor}50` : '#3B82F640',
              color: isDriverMode ? driverInstructions.badgeColor : '#3B82F6'
            }}
          >
            {isDriverMode ? (
              <span className="text-lg">{driverInstructions.icon}</span>
            ) : (
              <Truck size={18} />
            )}
          </div>
          <div>
            <div className="font-bold tracking-[0.16em] text-[14px] sm:text-[15px] text-white flex items-center gap-1.5">
              <span>{isDriverMode ? driverInstructions.unitTag : 'AEGIS FLEET UBER'}</span>
              <span 
                className="text-[9px] px-1.5 py-0.5 rounded border font-mono font-bold"
                style={{
                  backgroundColor: isDriverMode ? `${driverInstructions.badgeColor}20` : '#3B82F620',
                  color: isDriverMode ? driverInstructions.badgeColor : '#60A5FA',
                  borderColor: isDriverMode ? `${driverInstructions.badgeColor}40` : '#3B82F630'
                }}
              >
                {isDriverMode ? 'FIELD COCKPIT' : 'KOLKATA SECTOR'}
              </span>
            </div>
            <div className="text-[10px] text-[#A1A1AA] hidden sm:flex items-center gap-2">
              <span>{isDriverMode 
                ? 'Field Driver Display • Vehicle Locked by Dispatch • Destination Authority Active'
                : 'Tactical Emergency Uber • Bidirectional A* Real Road Routing'}</span>
              {isCommander && isDriverMode && (
                <Link href="/fleet" className="text-[10px] font-bold text-[#F59E0B] hover:underline">
                  [Exit Cockpit Mode]
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Global Navigation Tabs (Filtered for non-command roles) */}
        {(!isDriverMode || isCommander) && (
          <div className="hidden md:flex items-center gap-1.5 font-mono">
            {(!user || user.role === 'incident_commander') && (
              <Link 
                href="/"
                className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition"
              >
                [01] C2 Swarm
              </Link>
            )}
            <Link 
              href="/fleet"
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition shadow-sm ${
                !isDriverMode ? "bg-[#3B82F6] text-white" : "text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B]"
              }`}
            >
              [02] Fleet Uber
            </Link>
            {(!user || user.role === 'incident_commander' || user.role === 'hospital_staff') && (
              <Link 
                href="/hospitals"
                className="px-2.5 py-1 rounded-md text-[10px] text-[#A1A1AA] hover:text-white border border-[#27272A] hover:bg-[#17171B] transition"
              >
                [03] Bed Intake
              </Link>
            )}
          </div>
        )}

        {/* Auth Badge, Clock & Field Launcher */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-right leading-none pr-1">
            <div className="mono text-[12px] font-semibold text-white">{clock || '14:35:12'}</div>
            <div className="text-[9px] text-[#71717A] mt-0.5">KOLKATA • IST</div>
          </div>

          <TacticalAuthBadge showDriverLauncher={!isDriverMode} />
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 p-3 sm:p-5 max-w-[1560px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* =================================================================== */}
          {/* LEFT COLUMN: VEHICLE & DESTINATION SELECTOR + BIDI-A* PARAMS (4 cols) */}
          {/* =================================================================== */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            
            {/* Card 1: Dispatch Controls */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#27272A]">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">
                    {isDriverMode ? 'FIELD NAVIGATION DIRECTIVE' : 'TACTICAL DISPATCH CONTROLS'}
                  </p>
                  <h2 className="text-[14px] font-bold text-white mt-0.5">
                    {isDriverMode ? 'Assigned Vehicle & Destination' : 'Emergency Unit & Target'}
                  </h2>
                </div>
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#3B82F6]/15 text-[#3B82F6]">
                  <Navigation size={16} />
                </span>
              </div>

              {/* Select Responding Unit (LOCKED FOR FIELD DRIVERS) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#A1A1AA]">
                    Responding Emergency Unit
                  </label>
                  {isDriverMode && (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-[#F59E0B] px-1.5 py-0.5 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/30">
                      <Lock size={10} />
                      <span>LOCKED TO OPERATOR</span>
                    </span>
                  )}
                </div>

                {isDriverMode ? (
                  /* Read-only locked badge for driver */
                  <div className="w-full rounded-xl bg-[#18181D] border border-[#3F3F46] p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{driverInstructions.icon}</span>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {lockedUnitForDriver} · {driverInstructions.unitTag.split('·')[1]?.trim()}
                        </div>
                        <div className="text-[10px] text-[#A1A1AA]">
                          Depot: {getUnitOrigin(lockedUnitForDriver) === 'Station_North' ? 'Shyambazar (North)' : 'Alipore (South)'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#10B981] font-bold">ONLINE</span>
                  </div>
                ) : (
                  /* Full dropdown for Commander / Fleet Operator */
                  <select 
                    value={selectedUnit} 
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full rounded-xl bg-[#17171B] border border-[#27272A] p-2.5 text-[12px] font-semibold text-white outline-none focus:border-[#3B82F6] transition"
                  >
                    <option value="AMB-07">🚑 AMB-07 (Paramedic Ambulance · Shyambazar Depot North)</option>
                    <option value="AMB-12">🚑 AMB-12 (Critical Trauma Transport · Alipore Depot South)</option>
                    <option value="FIRE-03">🚒 FIRE-03 (Pumper Engine · Shyambazar Depot North)</option>
                    <option value="POL-02">🚓 POL-02 (Rapid Interceptor · Alipore Depot South)</option>
                  </select>
                )}

                <div className="mt-1 text-[10px] text-[#71717A] flex items-center justify-between">
                  <span>Origin Depot Node:</span>
                  <span className="text-[#3B82F6] font-mono font-bold">
                    {getUnitOrigin(isDriverMode ? lockedUnitForDriver : selectedUnit) === 'Station_North' ? 'Shyambazar (North Depot)' : 'Alipore (South Depot)'}
                  </span>
                </div>
              </div>

              {/* Select Target Destination (ACTIVE FOR EVERYONE INCLUDING DRIVERS!) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#A1A1AA]">
                    Target Destination Landmark
                  </label>
                  {isDriverMode && (
                    <span className="text-[9px] font-mono text-[#10B981] font-bold">
                      DRIVER AUTHORIZED TO CHANGE
                    </span>
                  )}
                </div>
                <select 
                  value={destination} 
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded-xl bg-[#17171B] border border-[#27272A] p-2.5 text-[12px] font-semibold text-[#F59E0B] outline-none focus:border-[#F59E0B] transition"
                >
                  <option value="H1_Central">🏥 SSKM Hospital Central Trauma Bay (IPGMER - H1)</option>
                  <option value="H2_West">🏥 St. Luke's Clinic / Apollo Trauma (EM Bypass - H2)</option>
                  <option value="Sector_5C">⚠️ Sector 5C Salt Lake (IT & Electronics Complex)</option>
                  <option value="Sector_6B">🚇 Sector 6B Esplanade Metro Concourse (Dharmatala)</option>
                  <option value="Evac_Zone">🛡️ Maidan Evacuation Holding Zone (Red Road)</option>
                  <option value="BBD_Bagh">🏢 B.B.D. Bagh / Lalbazar Police HQ</option>
                  <option value="Park_Circus_7Point">📍 Park Circus 7-Point Crossing</option>
                  <option value="Karunamoyee_Hub">📍 Karunamoyee Central Park (Salt Lake)</option>
                </select>
              </div>

              {/* Trigger Recompute Button */}
              <button 
                onClick={computeRoute}
                disabled={loading}
                className="w-full rounded-xl py-3 font-bold text-xs bg-[#3B82F6] text-white flex items-center justify-center gap-2 transition hover:bg-[#2563EB] active:scale-95 shadow-md shadow-[#3B82F6]/20 disabled:opacity-50"
              >
                <Navigation size={14} className={loading ? "animate-spin" : ""} />
                <span>{loading ? "Computing Bidirectional A* Corridor…" : "RECOMPUTE SHORTEST PATH"}</span>
              </button>
            </div>

            {/* Field Driver Specialized Instructions Panel */}
            {isDriverMode && (
              <div 
                className="rounded-2xl border p-4 shadow-sm space-y-3"
                style={{
                  backgroundColor: `${driverInstructions.badgeColor}0D`,
                  borderColor: `${driverInstructions.badgeColor}40`
                }}
              >
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Radio size={14} style={{ color: driverInstructions.badgeColor }} className="animate-pulse" />
                    <span className="text-xs font-bold text-white">LIVE DISPATCH INSTRUCTIONS</span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePlayVoiceInstructions}
                    disabled={isPlayingAudio}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white transition active:scale-95"
                    style={{ backgroundColor: driverInstructions.badgeColor }}
                  >
                    <Volume2 size={12} className={isPlayingAudio ? 'animate-bounce' : ''} />
                    <span>{isPlayingAudio ? 'BROADCASTING…' : 'VOICE ORDER'}</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {driverInstructions.orders.map((order, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-[#E4E4E7]">
                      <span className="text-[#A1A1AA] font-mono shrink-0">0{i + 1}.</span>
                      <span>{order}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-white/10 text-[10px] font-mono text-[#F59E0B] flex items-center gap-1.5">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{driverInstructions.caution}</span>
                </div>
              </div>
            )}

            {/* Card: Live Weather & Adaptive Road Impact */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{weatherData?.conditionIcon || '☁️'}</span>
                  <span className="text-[11px] font-bold text-white">
                    {weatherData?.conditionText || 'Live Weather'} · {weatherData?.temperatureC ?? 27.1}°C
                  </span>
                </div>
                {!isDriverMode && (
                  <button
                    onClick={() => loadKolkataWeather(selectedWeatherScenario)}
                    disabled={isRefreshingWeather}
                    className="text-[#71717A] hover:text-white transition p-0.5"
                    title="Refresh live Kolkata weather"
                  >
                    <RefreshCw size={11} className={isRefreshingWeather ? "animate-spin text-[#3B82F6]" : ""} />
                  </button>
                )}
              </div>

              {/* Surface Status Badge & Traction Gauge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#71717A] uppercase font-bold">Road Surface Grip</span>
                  <span 
                    className="font-mono font-bold px-1.5 py-0.5 rounded text-[9px] border"
                    style={{
                      color: weatherData?.roadImpact.surfaceColor || '#10B981',
                      backgroundColor: (weatherData?.roadImpact.surfaceColor || '#10B981') + '15',
                      borderColor: (weatherData?.roadImpact.surfaceColor || '#10B981') + '35'
                    }}
                  >
                    {weatherData?.roadImpact.surfaceStatusLabel || 'DRY ASPHALT · OPTIMAL'}
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-[#27272A]">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${weatherData?.roadImpact.tractionPct || 96}%`,
                      backgroundColor: weatherData?.roadImpact.surfaceColor || '#10B981'
                    }} 
                  />
                </div>

                <div className="flex justify-between text-[9px] font-mono text-[#71717A]">
                  <span>Traction: <b className="text-white">{weatherData?.roadImpact.tractionPct ?? 96}%</b></span>
                  <span>Safe Speed: <b className="text-white">{weatherData?.roadImpact.speedPenaltyPct ? `-${weatherData.roadImpact.speedPenaltyPct}%` : 'Nominal'}</b></span>
                  <span>Braking: <b className="text-white">{weatherData?.roadImpact.brakingDistanceMult ?? 1.0}x</b></span>
                </div>
              </div>

              {/* Weather Drill Simulator Selector (OPERATOR ONLY) */}
              {!isDriverMode ? (
                <div className="pt-2 border-t border-[#27272A]/70">
                  <span className="text-[8px] uppercase font-bold text-[#71717A] tracking-wider block mb-1.5">
                    Weather Drill Simulator
                  </span>
                  <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
                    {[
                      { id: 'live', label: '🛰️ Live', title: 'Real-Time Open-Meteo Kolkata Telemetry' },
                      { id: 'monsoon_rain', label: '🌧️ Rain', title: 'Simulate Heavy Monsoon Rainfall' },
                      { id: 'cyclone_storm', label: '⛈️ Storm', title: 'Simulate Severe Cyclone Gale & Flood Risk' },
                      { id: 'river_fog', label: '🌫️ Fog', title: 'Simulate Dense Hooghly River Fog' }
                    ].map((sc) => (
                      <button
                        key={sc.id}
                        onClick={() => setSelectedWeatherScenario(sc.id as any)}
                        className={`py-1 px-1 rounded-md text-center font-bold border transition truncate ${
                          selectedWeatherScenario === sc.id
                            ? "bg-[#3B82F6] text-white border-[#3B82F6] shadow-sm"
                            : "bg-[#17171B] text-[#A1A1AA] border-[#27272A] hover:text-white"
                        }`}
                        title={sc.title}
                      >
                        {sc.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-[#27272A]/70 text-[10px] text-[#71717A]">
                  Weather telemetry synchronized via Kolkata regional Doppler feed.
                </div>
              )}
            </div>

            {/* Card 2: Dynamic Hazard Roadblocks Switcher */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-[#EF4444]" />
                  <span className="text-[11px] font-bold text-white">Dynamic Roadblocks & Hazards</span>
                </div>
                <span className="text-[9px] font-mono text-[#A1A1AA]">
                  {blockedRoads.length} BLOCKED
                </span>
              </div>
              <p className="text-[10px] text-[#71717A] leading-relaxed">
                {isDriverMode 
                  ? 'Active road closures managed by Dispatch EOC. Bidirectional A* automatically diverts around hazards:'
                  : 'Toggle road segments to watch Bidirectional A* discover alternate shortest paths avoiding blockages:'}
              </p>
              
              <div className="space-y-1.5">
                {[
                  { id: "Road_B2", label: "Road B2: AJC Bose Road / SSKM Access" },
                  { id: "Road_D4", label: "Road D4: CR Avenue Central Arterial" },
                  { id: "Road_A1", label: "Road A1: EM Bypass North Corridor" },
                  { id: "Road_E5", label: "Road E5: Maa Flyover Connector" }
                ].map((road) => {
                  const isBlocked = blockedRoads.includes(road.id);
                  return (
                    <button
                      key={road.id}
                      onClick={() => toggleRoadblock(road.id)}
                      disabled={isDriverMode}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border text-[11px] font-mono transition text-left ${
                        isBlocked 
                          ? "bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]" 
                          : "bg-[#17171B] border-[#27272A] text-[#A1A1AA] hover:text-white"
                      } ${isDriverMode ? 'cursor-default' : ''}`}
                    >
                      <span className="truncate pr-2">{road.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isBlocked ? "bg-[#EF4444] text-white" : "bg-[#27272A] text-[#71717A]"}`}>
                        {isBlocked ? "BLOCKED" : "OPEN"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 3: Bidirectional A* Algorithmic Diagnostics */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 shadow-sm space-y-2.5 font-mono text-[11px]">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                <span className="text-[10px] font-bold tracking-wider text-[#71717A]">ALGORITHM METRICS</span>
                <span className="px-2 py-0.5 rounded bg-[#8B5CF6]/15 text-[#C4B5FD] text-[9px] font-bold border border-[#8B5CF6]/30">
                  BIDIRECTIONAL A*
                </span>
              </div>
              
              <div className="flex justify-between items-center text-[#A1A1AA]">
                <span>Heuristic:</span>
                <span className="text-white font-bold">Haversine Great-Circle</span>
              </div>
              <div className="flex justify-between items-center text-[#A1A1AA]">
                <span>Frontier Intersection:</span>
                <span className="text-[#C4B5FD] font-bold">
                  {routeResult?.metrics?.meetingNode || "Pending"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#A1A1AA]">
                <span>Forward Expansions:</span>
                <span className="text-white font-bold">{routeResult?.metrics?.nodesExpandedForward ?? 0}</span>
              </div>
              <div className="flex justify-between items-center text-[#A1A1AA]">
                <span>Backward Expansions:</span>
                <span className="text-white font-bold">{routeResult?.metrics?.nodesExpandedBackward ?? 0}</span>
              </div>
              <div className="flex justify-between items-center text-[#A1A1AA]">
                <span>Computation Latency:</span>
                <span className="text-[#10B981] font-bold">{routeResult?.metrics?.searchTimeMs ?? 0.1} ms</span>
              </div>
            </div>

          </div>

          {/* =================================================================== */}
          {/* RIGHT COLUMN: INTERACTIVE LEAFLET MAP & TACTICAL GUIDANCE (8 cols)  */}
          {/* =================================================================== */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            {/* Header Banner & Real Shortest Distance Metric */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] text-[#71717A]">
                    {isDriverMode ? 'ACTIVE DRIVER RUN' : 'TURN-BY-TURN TACTICAL NAVIGATOR'}
                  </p>
                  <h2 className="text-[15px] font-bold text-white mt-0.5">
                    {isDriverMode 
                      ? `${driverInstructions.unitTag} ➔ ${KOLKATA_FLEET_NODES[destination]?.name.split('(')[0].trim() || destination}`
                      : 'Kolkata Emergency Safe Corridor'}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 text-[10px] font-bold font-mono">
                    GPS: KOLKATA GRID
                  </span>
                  <span className="px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold">
                    OPTIMAL CORRIDOR CLEARED
                  </span>
                </div>
              </div>

              {/* Main Metric Cards: Real Shortest Road Distance & ETA */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-[#17171B] border border-[#27272A]">
                  <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block">
                    Real Road Distance
                  </span>
                  <div className="mono text-2xl font-bold text-[#10B981] mt-0.5">
                    {routeResult?.distanceKm ?? "--"} <span className="text-xs text-[#A1A1AA]">KM</span>
                  </div>
                  <span className="text-[9px] text-[#71717A] mt-0.5 block">Via actual Kolkata roads</span>
                </div>

                <div className="p-3 rounded-xl bg-[#17171B] border border-[#27272A]">
                  <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block">
                    Estimated Travel Time
                  </span>
                  <div className="mono text-2xl font-bold text-[#F59E0B] mt-0.5">
                    {routeResult?.etaMinutes ?? "--"} <span className="text-xs text-[#A1A1AA]">MINS</span>
                  </div>
                  <span className="text-[9px] text-[#71717A] mt-0.5 block truncate">
                    {routeResult?.weatherTelemetry?.speedPenaltyPct ? `Weather: -${routeResult.weatherTelemetry.speedPenaltyPct}% Speed` : '@ 42 km/h priority'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#17171B] border border-[#27272A]">
                  <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block">
                    Meeting Frontier
                  </span>
                  <div className="mono text-sm font-bold text-[#C4B5FD] mt-1.5 truncate">
                    {routeResult?.metrics?.meetingNode ?? "N/A"}
                  </div>
                  <span className="text-[9px] text-[#71717A] mt-0.5 block">Bidi-A* Intersection</span>
                </div>

                <div className="p-3 rounded-xl bg-[#17171B] border border-[#27272A]">
                  <span className="text-[9px] uppercase font-bold text-[#71717A] tracking-wider block">
                    Road Surface Traction
                  </span>
                  <div className="mono text-2xl font-bold mt-0.5" style={{ color: weatherData?.roadImpact.surfaceColor || '#10B981' }}>
                    {weatherData?.roadImpact.tractionPct ?? 96}<span className="text-xs text-[#A1A1AA]">% GRIP</span>
                  </div>
                  <span className="text-[9px] text-[#71717A] mt-0.5 block truncate">
                    Braking: {weatherData?.roadImpact.brakingDistanceMult ?? 1.0}x buffer
                  </span>
                </div>
              </div>
            </div>

            {/* Real Kolkata Leaflet Interactive Map Container */}
            <div className="w-full h-[480px] sm:h-[540px] rounded-2xl overflow-hidden shadow-lg border border-[#27272A]">
              <KolkataFleetMap 
                selectedUnit={isDriverMode ? lockedUnitForDriver : selectedUnit}
                destination={destination}
                routeResult={routeResult}
                blockedRoads={blockedRoads}
                weatherData={weatherData}
                onSelectNode={(nodeId) => setDestination(nodeId)}
              />
            </div>

            {/* Turn-by-Turn Road Guidance Corridor */}
            <div className="rounded-2xl border border-[#27272A] bg-[#131316] p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#27272A]">
                <div className="flex items-center gap-2">
                  <CornerDownRight size={14} className="text-[#3B82F6]" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                    Turn-By-Turn Arterial Corridors ({routeResult?.waypoints?.length || 0} Waypoints)
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#A1A1AA]">
                  {routeResult?.roadNames?.length || 0} ROAD SEGMENTS
                </span>
              </div>

              {/* Waypoints Sequence Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {routeResult?.waypoints?.map((wp, idx) => {
                  const node = KOLKATA_FLEET_NODES[wp];
                  const isOrigin = idx === 0;
                  const isDest = idx === routeResult.waypoints.length - 1;
                  const isMeeting = wp === routeResult.metrics.meetingNode && !isOrigin && !isDest;

                  return (
                    <React.Fragment key={idx}>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border flex items-center gap-1.5 shadow-sm ${
                        isOrigin 
                          ? "bg-[#3B82F6]/20 border-[#3B82F6] text-white" 
                          : isDest 
                          ? "bg-[#10B981]/20 border-[#10B981] text-[#10B981]" 
                          : isMeeting 
                          ? "bg-[#8B5CF6]/20 border-[#8B5CF6] text-[#C4B5FD]" 
                          : "bg-[#17171B] border-[#27272A] text-[#D4D4D8]"
                      }`}>
                        <span>{isOrigin ? (isDriverMode ? driverInstructions.icon : "🚑") : isDest ? "🎯" : isMeeting ? "⚡" : "📍"}</span>
                        <span>{node ? node.name.split('(')[0].trim() : wp}</span>
                      </span>

                      {idx < routeResult.waypoints.length - 1 && (
                        <ArrowRight size={13} className="text-[#52525B] shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Road Segments Traversed */}
              {routeResult?.roadNames && routeResult.roadNames.length > 0 && (
                <div className="pt-2 border-t border-[#27272A] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  {routeResult.roadNames.map((name, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-[#17171B] border border-[#27272A] text-[#A1A1AA]">
                      <span className="h-5 w-5 rounded-md bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span className="text-white truncate">{name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Hazards Bypassed Alert Card */}
              {blockedRoads.length > 0 && (
                <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-3 mt-2">
                  <div className="text-xs font-bold text-[#EF4444] flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={14} />
                    <span>Active Hazard Avoidance Confirmed</span>
                  </div>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Bidirectional A* successfully navigated away from: <b className="text-[#F59E0B] font-mono">{blockedRoads.join(", ")}</b>. No emergency vehicles will enter quarantined or blocked roads.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Global Tactical Footer */}
      <footer className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#27272A] px-3 py-2 text-[9px] text-[#71717A] lg:px-5">
        <span>AEGIS FLEET TACTICAL DISPATCH</span>
        <span>BIDIRECTIONAL A* (HAVERSINE ADMISSIBLE HEURISTIC)</span>
        <span>KOLKATA EMERGENCY DEFENSE GRID</span>
        <span className="ml-auto mono">REAL ROAD DISTANCE OPTIMIZATION ACTIVE</span>
      </footer>
    </div>
  );
}
