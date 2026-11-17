/**
 * Live Adaptive Weather & Road Infrastructure Engine for Kolkata Emergency Defense Grid
 * 
 * Fetches real-time atmospheric telemetry from Open-Meteo API for Kolkata (22.5726° N, 88.3639° E)
 * and dynamically calculates road surface friction, transit speed penalties, braking multipliers,
 * and corridor throughput capacity.
 */

export interface LiveWeatherData {
  region: string;
  coordinates: { lat: number; lng: number };
  timestamp: string;
  temperatureC: number;
  apparentC: number;
  humidityPct: number;
  precipitationMm: number;
  rainMm: number;
  weatherCode: number;
  conditionText: string;
  conditionIcon: string;
  cloudCoverPct: number;
  windSpeedKmh: number;
  windGustsKmh: number;
  
  // Dynamic Road Infrastructure Impacts
  roadImpact: {
    surfaceStatus: 'DRY_OPTIMAL' | 'DAMP_CAUTION' | 'WET_SLIPPERY' | 'HEAVY_SPRAY' | 'WATERLOGGED_RISK';
    surfaceStatusLabel: string;
    surfaceColor: string;
    frictionCoefficient: number; // 0.40 to 0.98
    tractionPct: number;          // 40% to 98%
    brakingDistanceMult: number; // 1.0x to 2.2x
    speedPenaltyPct: number;     // 0% to 35%
    estimatedThroughputPct: number; // 40% to 95%
    waterloggingRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    vulnerableCorridors: string[];
    advisory: string;
  };

  // Hourly Throughput Curve Data for SVG Visualizer
  hourlyTrend: {
    time: string;
    temperature: number;
    precipitation: number;
    throughputPct: number;
  }[];
}

// WMO Weather Interpretation Codes (World Meteorological Organization)
const WMO_CODE_MAP: Record<number, { text: string; icon: string }> = {
  0: { text: "Clear Sky", icon: "☀️" },
  1: { text: "Mainly Clear", icon: "🌤️" },
  2: { text: "Partly Cloudy", icon: "⛅" },
  3: { text: "Overcast", icon: "☁️" },
  45: { text: "Fog / Haze", icon: "🌫️" },
  48: { text: "Depositing Rime Fog", icon: "🌫️" },
  51: { text: "Light Drizzle", icon: "🌦️" },
  53: { text: "Moderate Drizzle", icon: "🌦️" },
  55: { text: "Dense Drizzle", icon: "🌧️" },
  61: { text: "Slight Rain", icon: "🌧️" },
  63: { text: "Moderate Rain", icon: "🌧️" },
  65: { text: "Heavy Rain", icon: "⛈️" },
  80: { text: "Rain Showers", icon: "🌦️" },
  81: { text: "Heavy Showers", icon: "🌧️" },
  82: { text: "Violent Showers", icon: "⛈️" },
  95: { text: "Thunderstorm", icon: "⛈️" },
  96: { text: "Thunderstorm with Hail", icon: "⛈️" },
  99: { text: "Severe Thunderstorm", icon: "⚡" },
};

/**
 * Computes road infrastructure physics and throughput based on live atmospheric variables
 */
export function calculateRoadInfrastructureImpact(
  tempC: number,
  humidityPct: number,
  precipMm: number,
  weatherCode: number,
  windGustsKmh: number
): LiveWeatherData['roadImpact'] {
  // 1. Extreme Rain / Waterlogging Condition
  if (precipMm >= 7.5 || [65, 82, 95, 96, 99].includes(weatherCode)) {
    return {
      surfaceStatus: 'WATERLOGGED_RISK',
      surfaceStatusLabel: 'WATERLOGGED · SEVERE FLOOD RISK',
      surfaceColor: '#EF4444',
      frictionCoefficient: 0.52,
      tractionPct: 52,
      brakingDistanceMult: 2.1,
      speedPenaltyPct: 35,
      estimatedThroughputPct: 48,
      waterloggingRisk: 'CRITICAL',
      vulnerableCorridors: [
        'Road_D4: CR Avenue (Low-Lying Drainage)',
        'Road_C3: Strand Road (Hooghly High Tide)',
        'Road_J10: APC Road / Rajabazar'
      ],
      advisory: 'Emergency vehicles must exercise extreme caution. Reduced traction and water sheeting along low-lying central corridors.'
    };
  }

  // 2. Moderate to Heavy Rain Condition
  if (precipMm >= 2.0 || [61, 63, 80, 81].includes(weatherCode)) {
    return {
      surfaceStatus: 'HEAVY_SPRAY',
      surfaceStatusLabel: 'HEAVY WET · REDUCED TIRE TRACTION',
      surfaceColor: '#F59E0B',
      frictionCoefficient: 0.68,
      tractionPct: 68,
      brakingDistanceMult: 1.65,
      speedPenaltyPct: 22,
      estimatedThroughputPct: 64,
      waterloggingRisk: 'HIGH',
      vulnerableCorridors: [
        'Road_A1: EM Bypass (High-Speed Hydroplaning)',
        'Road_E5: Maa Flyover (Crosswind Spray)'
      ],
      advisory: 'Road spray impairs visibility. High-speed corridors require 1.65x braking buffers for trauma transports.'
    };
  }

  // 3. Light Rain or Drizzle Condition
  if (precipMm > 0.1 || [51, 53, 55].includes(weatherCode)) {
    return {
      surfaceStatus: 'WET_SLIPPERY',
      surfaceStatusLabel: 'WET ASPHALT · REDUCED GRIP',
      surfaceColor: '#F59E0B',
      frictionCoefficient: 0.78,
      tractionPct: 78,
      brakingDistanceMult: 1.35,
      speedPenaltyPct: 14,
      estimatedThroughputPct: 74,
      waterloggingRisk: 'MODERATE',
      vulnerableCorridors: [
        'Road_B2: AJC Bose Flyover',
        'Road_F6: Cathedral Road'
      ],
      advisory: 'Damp surface film active. Minor speed reductions advised across elevated flyovers.'
    };
  }

  // 4. Fog or Extreme Humidity / River Mist Condition
  if ([45, 48].includes(weatherCode) || (humidityPct >= 88 && tempC <= 23)) {
    return {
      surfaceStatus: 'DAMP_CAUTION',
      surfaceStatusLabel: 'RIVER MIST & FOG · DAMP SURFACE',
      surfaceColor: '#3B82F6',
      frictionCoefficient: 0.85,
      tractionPct: 85,
      brakingDistanceMult: 1.25,
      speedPenaltyPct: 10,
      estimatedThroughputPct: 80,
      waterloggingRisk: 'LOW',
      vulnerableCorridors: [
        'Road_C3: Strand Road (Hooghly Riverbank)',
        'Vidyasagar Setu Corridor'
      ],
      advisory: 'Riverine humidity and morning mist near Hooghly. Engage fog strobes on emergency ambulances.'
    };
  }

  // 5. High Wind Gust Advisory on Elevated Flyovers
  if (windGustsKmh >= 35) {
    return {
      surfaceStatus: 'DAMP_CAUTION',
      surfaceStatusLabel: 'HIGH CROSSWINDS · ELEVATED FLYOVERS',
      surfaceColor: '#F59E0B',
      frictionCoefficient: 0.88,
      tractionPct: 88,
      brakingDistanceMult: 1.2,
      speedPenaltyPct: 12,
      estimatedThroughputPct: 82,
      waterloggingRisk: 'LOW',
      vulnerableCorridors: [
        'Road_E5: Maa Flyover (Crosswind Shear)',
        'AJC Bose Road Flyover'
      ],
      advisory: 'High-profile emergency fire engines should maintain caution on Maa and AJC Bose flyovers.'
    };
  }

  // 6. Optimal Dry Surface Condition (Default)
  return {
    surfaceStatus: 'DRY_OPTIMAL',
    surfaceStatusLabel: 'DRY ASPHALT · OPTIMAL TRACTION',
    surfaceColor: '#10B981',
    frictionCoefficient: 0.96,
    tractionPct: 96,
    brakingDistanceMult: 1.0,
    speedPenaltyPct: 0,
    estimatedThroughputPct: 92,
    waterloggingRisk: 'LOW',
    vulnerableCorridors: [],
    advisory: 'Atmospheric conditions nominal. All Kolkata arterial road corridors cleared for standard emergency speeds.'
  };
}

/**
 * Fetches real-time live weather for Kolkata from Open-Meteo API
 */
export async function fetchKolkataLiveWeather(): Promise<LiveWeatherData> {
  const latitude = 22.5726;
  const longitude = 88.3639;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,precipitation,precipitation_probability&timezone=Asia%2FKolkata&forecast_days=1`;

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }

    const data = await res.json();
    const curr = data.current || {};
    const hourly = data.hourly || {};

    const tempC = Number(curr.temperature_2m ?? 27.0);
    const apparentC = Number(curr.apparent_temperature ?? tempC);
    const humidity = Number(curr.relative_humidity_2m ?? 65);
    const precip = Number(curr.precipitation ?? 0.0);
    const rain = Number(curr.rain ?? 0.0);
    const weatherCode = Number(curr.weather_code ?? 0);
    const cloudCover = Number(curr.cloud_cover ?? 40);
    const windSpeed = Number(curr.wind_speed_10m ?? 8.0);
    const windGusts = Number(curr.wind_gusts_10m ?? 14.0);

    const condition = WMO_CODE_MAP[weatherCode] || { text: "Nominal", icon: "🌤️" };
    const roadImpact = calculateRoadInfrastructureImpact(tempC, humidity, precip, weatherCode, windGusts);

    // Build hourly throughput trend curve (next 8 hours)
    const currentHourIndex = new Date().getHours();
    const hourlyTrend: LiveWeatherData['hourlyTrend'] = [];
    
    if (hourly.time && Array.isArray(hourly.time)) {
      for (let i = Math.max(0, currentHourIndex - 4); i < Math.min(hourly.time.length, currentHourIndex + 5); i++) {
        const hTime = hourly.time[i] ? hourly.time[i].split('T')[1] : `${i}:00`;
        const hTemp = Number(hourly.temperature_2m?.[i] ?? tempC);
        const hPrecip = Number(hourly.precipitation?.[i] ?? 0);
        
        // Dynamic throughput based on hourly rain
        let hThroughput = 92;
        if (hPrecip > 5) hThroughput = 50;
        else if (hPrecip > 1) hThroughput = 68;
        else if (hPrecip > 0.1) hThroughput = 78;

        hourlyTrend.push({
          time: hTime,
          temperature: Math.round(hTemp),
          precipitation: hPrecip,
          throughputPct: hThroughput
        });
      }
    }

    return {
      region: "Kolkata Metropolitan Area",
      coordinates: { lat: latitude, lng: longitude },
      timestamp: curr.time || new Date().toISOString(),
      temperatureC: Math.round(tempC * 10) / 10,
      apparentC: Math.round(apparentC * 10) / 10,
      humidityPct: Math.round(humidity),
      precipitationMm: precip,
      rainMm: rain,
      weatherCode,
      conditionText: condition.text,
      conditionIcon: condition.icon,
      cloudCoverPct: Math.round(cloudCover),
      windSpeedKmh: Math.round(windSpeed * 10) / 10,
      windGustsKmh: Math.round(windGusts * 10) / 10,
      roadImpact,
      hourlyTrend: hourlyTrend.length > 0 ? hourlyTrend : [
        { time: "06:00", temperature: 24, precipitation: 0, throughputPct: 90 },
        { time: "10:00", temperature: 27, precipitation: 0, throughputPct: 88 },
        { time: "14:00", temperature: 31, precipitation: 0, throughputPct: 85 },
        { time: "18:00", temperature: 28, precipitation: 0, throughputPct: 84 },
        { time: "22:00", temperature: 25, precipitation: 0, throughputPct: 90 }
      ]
    };

  } catch (err) {
    console.warn("Failed to fetch Open-Meteo live weather; using realistic Kolkata baseline:", err);

    // Fallback baseline for Kolkata (Late autumn / daytime)
    const fallbackTemp = 27.2;
    const fallbackHumidity = 66;
    const fallbackPrecip = 0.0;
    const fallbackCode = 3; // Overcast
    const fallbackImpact = calculateRoadInfrastructureImpact(fallbackTemp, fallbackHumidity, fallbackPrecip, fallbackCode, 12.0);

    return {
      region: "Kolkata Metropolitan Area",
      coordinates: { lat: latitude, lng: longitude },
      timestamp: new Date().toISOString(),
      temperatureC: fallbackTemp,
      apparentC: 30.1,
      humidityPct: fallbackHumidity,
      precipitationMm: fallbackPrecip,
      rainMm: 0.0,
      weatherCode: fallbackCode,
      conditionText: "Overcast",
      conditionIcon: "☁️",
      cloudCoverPct: 85,
      windSpeedKmh: 6.8,
      windGustsKmh: 14.2,
      roadImpact: fallbackImpact,
      hourlyTrend: [
        { time: "06:00", temperature: 23, precipitation: 0, throughputPct: 92 },
        { time: "10:00", temperature: 27, precipitation: 0, throughputPct: 88 },
        { time: "14:00", temperature: 30, precipitation: 0, throughputPct: 84 },
        { time: "18:00", temperature: 27, precipitation: 0, throughputPct: 86 },
        { time: "22:00", temperature: 25, precipitation: 0, throughputPct: 90 }
      ]
    };
  }
}

/**
 * Creates simulated weather scenarios for emergency drill testing
 */
export function getSimulatedWeatherScenario(
  scenario: 'live' | 'monsoon_rain' | 'cyclone_storm' | 'river_fog'
): Partial<LiveWeatherData> {
  if (scenario === 'monsoon_rain') {
    const impact = calculateRoadInfrastructureImpact(25.5, 92, 4.2, 63, 24.0);
    return {
      temperatureC: 25.5,
      apparentC: 28.0,
      humidityPct: 92,
      precipitationMm: 4.2,
      rainMm: 4.2,
      weatherCode: 63,
      conditionText: "Monsoon Rain",
      conditionIcon: "🌧️",
      windSpeedKmh: 18.5,
      windGustsKmh: 28.0,
      roadImpact: impact
    };
  }

  if (scenario === 'cyclone_storm') {
    const impact = calculateRoadInfrastructureImpact(24.0, 96, 12.5, 95, 48.0);
    return {
      temperatureC: 24.0,
      apparentC: 27.0,
      humidityPct: 96,
      precipitationMm: 12.5,
      rainMm: 12.5,
      weatherCode: 95,
      conditionText: "Severe Cyclone Storm",
      conditionIcon: "⛈️",
      windSpeedKmh: 36.0,
      windGustsKmh: 54.0,
      roadImpact: impact
    };
  }

  if (scenario === 'river_fog') {
    const impact = calculateRoadInfrastructureImpact(21.0, 94, 0.0, 45, 4.0);
    return {
      temperatureC: 21.0,
      apparentC: 21.0,
      humidityPct: 94,
      precipitationMm: 0.0,
      rainMm: 0.0,
      weatherCode: 45,
      conditionText: "Hooghly River Fog",
      conditionIcon: "🌫️",
      windSpeedKmh: 4.0,
      windGustsKmh: 8.0,
      roadImpact: impact
    };
  }

  return {};
}
