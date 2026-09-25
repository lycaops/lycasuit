'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ZoneCoverageSummary } from '@fieldiq/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import * as echarts from 'echarts';

const GEOJSON_URL = '/maps/italy-provinces.json';
let provinceGeoJsonPromise: Promise<any> | null = null;

const normalizeName = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[’'`]/g, '')
  .replace(/\s*\/\s*.*/g, '')
  .replace(/[^a-z0-9]+/gi, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase();

const NAME_ALIASES: Record<string, string> = {
  [normalizeName('Trentino-Alto Adige/Südtirol')]: normalizeName('Trentino-Alto Adige'),
  [normalizeName('Bolzano/Bozen')]: normalizeName('Bolzano'),
  [normalizeName('Forlì-Cesena')]: normalizeName('Forli-Cesena'),
  [normalizeName('Pesaro and Urbino')]: normalizeName('Pesaro-Urbino'),
  [normalizeName('Monza-Brianza')]: normalizeName('Monza e della Brianza'),
};

const provinceKey = (value: unknown) => {
  const normalized = normalizeName(value);
  return NAME_ALIASES[normalized] ?? normalized;
};

const getCoverageColor = (coverage: number | null) => {
  if (coverage === null) return '#e2e8f0';
  if (coverage < 20) return '#c2413b';
  if (coverage < 40) return '#f28c28';
  if (coverage < 60) return '#f4c95d';
  if (coverage < 80) return '#69b578';
  return '#1f7a58';
};

// Map province codes to names, zones, and branches (from the HTML provided)
const PROVINCES_MAP = [
  {code:"BA",zone:"HS BARI ZONE 1",branch:"LMIT-HS-BARI",name:"Bari"},
  {code:"MT",zone:"HS BARI ZONE 1",branch:"LMIT-HS-BARI",name:"Matera"},
  {code:"BT",zone:"HS BARI ZONE 2",branch:"LMIT-HS-BARI",name:"Barletta-Andria-Trani"},
  {code:"FG",zone:"HS BARI ZONE 2",branch:"LMIT-HS-BARI",name:"Foggia"},
  {code:"BR",zone:"HS BARI ZONE 3",branch:"LMIT-HS-BARI",name:"Brindisi"},
  {code:"LE",zone:"HS BARI ZONE 3",branch:"LMIT-HS-BARI",name:"Lecce"},
  {code:"TA",zone:"HS BARI ZONE 3",branch:"LMIT-HS-BARI",name:"Taranto"},
  {code:"FE",zone:"HS BOLOGNA ZONE 1",branch:"LMIT-HS-BOLOGNA",name:"Ferrara"},
  {code:"FC",zone:"HS BOLOGNA ZONE 1",branch:"LMIT-HS-BOLOGNA",name:"Forlì-Cesena"},
  {code:"RA",zone:"HS BOLOGNA ZONE 1",branch:"LMIT-HS-BOLOGNA",name:"Ravenna"},
  {code:"RE",zone:"HS BOLOGNA ZONE 1",branch:"LMIT-HS-BOLOGNA",name:"Reggio Emilia"},
  {code:"BO",zone:"HS BOLOGNA ZONE 1",branch:"LMIT-HS-BOLOGNA",name:"Bologna"},
  {code:"MO",zone:"HS BOLOGNA ZONE 1",branch:"LMIT-HS-BOLOGNA",name:"Modena"},
  {code:"RN",zone:"HS BOLOGNA ZONE 2",branch:"LMIT-HS-BOLOGNA",name:"Rimini"},
  {code:"AN",zone:"HS BOLOGNA ZONE 2",branch:"LMIT-HS-BOLOGNA",name:"Ancona"},
  {code:"FM",zone:"HS BOLOGNA ZONE 2",branch:"LMIT-HS-BOLOGNA",name:"Fermo"},
  {code:"MC",zone:"HS BOLOGNA ZONE 2",branch:"LMIT-HS-BOLOGNA",name:"Macerata"},
  {code:"PU",zone:"HS BOLOGNA ZONE 2",branch:"LMIT-HS-BOLOGNA",name:"Pesaro and Urbino"},
  {code:"FI",zone:"HS BOLOGNA ZONE 3",branch:"LMIT-HS-BOLOGNA",name:"Florence"},
  {code:"LI",zone:"HS BOLOGNA ZONE 3",branch:"LMIT-HS-BOLOGNA",name:"Livorno"},
  {code:"LU",zone:"HS BOLOGNA ZONE 3",branch:"LMIT-HS-BOLOGNA",name:"Lucca"},
  {code:"MS",zone:"HS BOLOGNA ZONE 3",branch:"LMIT-HS-BOLOGNA",name:"Massa-Carrara"},
  {code:"PI",zone:"HS BOLOGNA ZONE 3",branch:"LMIT-HS-BOLOGNA",name:"Pisa"},
  {code:"PT",zone:"HS BOLOGNA ZONE 3",branch:"LMIT-HS-BOLOGNA",name:"Pistoia"},
  {code:"PO",zone:"HS BOLOGNA ZONE 3",branch:"LMIT-HS-BOLOGNA",name:"Prato"},
  {code:"MI",zone:"HS MILANO ZONE 1",branch:"LMIT-HS-MILAN",name:"Milan"},
  {code:"CO",zone:"HS MILANO ZONE 2",branch:"LMIT-HS-MILAN",name:"Como"},
  {code:"LC",zone:"HS MILANO ZONE 2",branch:"LMIT-HS-MILAN",name:"Lecco"},
  {code:"MB",zone:"HS MILANO ZONE 2",branch:"LMIT-HS-MILAN",name:"Monza-Brianza"},
  {code:"VA",zone:"HS MILANO ZONE 2",branch:"LMIT-HS-MILAN",name:"Varese"},
  {code:"SO",zone:"HS MILANO ZONE 2",branch:"LMIT-HS-MILAN",name:"Sondrio"},
  {code:"AL",zone:"HS MILANO ZONE 2",branch:"LMIT-HS-MILAN",name:"Alessandria"},
  {code:"NO",zone:"HS MILANO ZONE 2",branch:"LMIT-HS-MILAN",name:"Novara"},
  {code:"VC",zone:"HS MILANO ZONE 2",branch:"LMIT-HS-MILAN",name:"Vercelli"},
  {code:"VB",zone:"HS MILANO ZONE 2",branch:"LMIT-HS-MILAN",name:"Verbano-Cusio-Ossola"},
  {code:"BG",zone:"HS MILANO ZONE 3",branch:"LMIT-HS-MILAN",name:"Bergamo"},
  {code:"BS",zone:"HS MILANO ZONE 3",branch:"LMIT-HS-MILAN",name:"Brescia"},
  {code:"PR",zone:"HS MILANO ZONE 4",branch:"LMIT-HS-MILAN",name:"Parma"},
  {code:"PC",zone:"HS MILANO ZONE 4",branch:"LMIT-HS-MILAN",name:"Piacenza"},
  {code:"CR",zone:"HS MILANO ZONE 4",branch:"LMIT-HS-MILAN",name:"Cremona"},
  {code:"LO",zone:"HS MILANO ZONE 4",branch:"LMIT-HS-MILAN",name:"Lodi"},
  {code:"MN",zone:"HS MILANO ZONE 4",branch:"LMIT-HS-MILAN",name:"Mantua"},
  {code:"PV",zone:"HS MILANO ZONE 4",branch:"LMIT-HS-MILAN",name:"Pavia"},
  {code:"NA",zone:"HS NAPOLI ZONE 1",branch:"LMIT-HS-NAPLES",name:"Naples"},
  {code:"CE",zone:"HS NAPOLI ZONE 2",branch:"LMIT-HS-NAPLES",name:"Caserta"},
  {code:"SA",zone:"HS NAPOLI ZONE 3",branch:"LMIT-HS-NAPLES",name:"Salerno"},
  {code:"AV",zone:"HS NAPOLI ZONE 4",branch:"LMIT-HS-NAPLES",name:"Avellino"},
  {code:"BN",zone:"HS NAPOLI ZONE 4",branch:"LMIT-HS-NAPLES",name:"Benevento"},
  {code:"PZ",zone:"HS NAPOLI ZONE 5",branch:"LMIT-HS-NAPLES",name:"Potenza"},
  {code:"CZ",zone:"HS NAPOLI ZONE 6",branch:"LMIT-HS-NAPLES",name:"Catanzaro"},
  {code:"CS",zone:"HS NAPOLI ZONE 6",branch:"LMIT-HS-NAPLES",name:"Cosenza"},
  {code:"KR",zone:"HS NAPOLI ZONE 6",branch:"LMIT-HS-NAPLES",name:"Crotone"},
  {code:"RC",zone:"HS NAPOLI ZONE 7",branch:"LMIT-HS-NAPLES",name:"Reggio Calabria"},
  {code:"VV",zone:"HS NAPOLI ZONE 7",branch:"LMIT-HS-NAPLES",name:"Vibo Valentia"},
  {code:"GO",zone:"HS PADOVA ZONE 1",branch:"LMIT-HS-PADOVA",name:"Gorizia"},
  {code:"PN",zone:"HS PADOVA ZONE 1",branch:"LMIT-HS-PADOVA",name:"Pordenone"},
  {code:"TS",zone:"HS PADOVA ZONE 1",branch:"LMIT-HS-PADOVA",name:"Trieste"},
  {code:"UD",zone:"HS PADOVA ZONE 1",branch:"LMIT-HS-PADOVA",name:"Udine"},
  {code:"PD",zone:"HS PADOVA ZONE 1",branch:"LMIT-HS-PADOVA",name:"Padua"},
  {code:"RO",zone:"HS PADOVA ZONE 1",branch:"LMIT-HS-PADOVA",name:"Rovigo"},
  {code:"TV",zone:"HS PADOVA ZONE 1",branch:"LMIT-HS-PADOVA",name:"Treviso"},
  {code:"VE",zone:"HS PADOVA ZONE 1",branch:"LMIT-HS-PADOVA",name:"Venice"},
  {code:"VI",zone:"HS PADOVA ZONE 1",branch:"LMIT-HS-PADOVA",name:"Vicenza"},
  {code:"BZ",zone:"HS PADOVA ZONE 2",branch:"LMIT-HS-PADOVA",name:"South Tyrol"},
  {code:"TN",zone:"HS PADOVA ZONE 2",branch:"LMIT-HS-PADOVA",name:"Trento"},
  {code:"BL",zone:"HS PADOVA ZONE 2",branch:"LMIT-HS-PADOVA",name:"Belluno"},
  {code:"VR",zone:"HS PADOVA ZONE 2",branch:"LMIT-HS-PADOVA",name:"Verona"},
  {code:"PA",zone:"HS PALERMO ZONE 1",branch:"LMIT-HS-PALERMO",name:"Palermo"},
  {code:"TP",zone:"HS PALERMO ZONE 1",branch:"LMIT-HS-PALERMO",name:"Trapani"},
  {code:"AG",zone:"HS PALERMO ZONE 2",branch:"LMIT-HS-PALERMO",name:"Agrigento"},
  {code:"CL",zone:"HS PALERMO ZONE 2",branch:"LMIT-HS-PALERMO",name:"Caltanissetta"},
  {code:"CT",zone:"HS PALERMO ZONE 3",branch:"LMIT-HS-PALERMO",name:"Catania"},
  {code:"EN",zone:"HS PALERMO ZONE 3",branch:"LMIT-HS-PALERMO",name:"Enna"},
  {code:"ME",zone:"HS PALERMO ZONE 3",branch:"LMIT-HS-PALERMO",name:"Messina"},
  {code:"RG",zone:"HS PALERMO ZONE 3",branch:"LMIT-HS-PALERMO",name:"Ragusa"},
  {code:"SR",zone:"HS PALERMO ZONE 3",branch:"LMIT-HS-PALERMO",name:"Syracuse"},
  {code:"RM",zone:"HS ROMA ZONE 1",branch:"LMIT-HS-ROME",name:"Rome"},
  {code:"CA",zone:"HS ROMA ZONE 2",branch:"LMIT-HS-ROME",name:"Cagliari"},
  {code:"NU",zone:"HS ROMA ZONE 2",branch:"LMIT-HS-ROME",name:"Nuoro"},
  {code:"OR",zone:"HS ROMA ZONE 2",branch:"LMIT-HS-ROME",name:"Oristano"},
  {code:"SS",zone:"HS ROMA ZONE 2",branch:"LMIT-HS-ROME",name:"Sassari"},
  {code:"SU",zone:"HS ROMA ZONE 2",branch:"LMIT-HS-ROME",name:"Sud Sardegna"},
  {code:"RI",zone:"HS ROMA ZONE 3",branch:"LMIT-HS-ROME",name:"Rieti"},
  {code:"VT",zone:"HS ROMA ZONE 3",branch:"LMIT-HS-ROME",name:"Viterbo"},
  {code:"SI",zone:"HS ROMA ZONE 3",branch:"LMIT-HS-ROME",name:"Siena"},
  {code:"AR",zone:"HS ROMA ZONE 3",branch:"LMIT-HS-ROME",name:"Arezzo"},
  {code:"GR",zone:"HS ROMA ZONE 3",branch:"LMIT-HS-ROME",name:"Grosseto"},
  {code:"PG",zone:"HS ROMA ZONE 3",branch:"LMIT-HS-ROME",name:"Perugia"},
  {code:"TR",zone:"HS ROMA ZONE 3",branch:"LMIT-HS-ROME",name:"Terni"},
  {code:"FR",zone:"HS ROMA ZONE 4",branch:"LMIT-HS-ROME",name:"Frosinone"},
  {code:"LT",zone:"HS ROMA ZONE 4",branch:"LMIT-HS-ROME",name:"Latina"},
  {code:"CH",zone:"HS ROMA ZONE 5",branch:"LMIT-HS-ROME",name:"Chieti"},
  {code:"AQ",zone:"HS ROMA ZONE 5",branch:"LMIT-HS-ROME",name:"L'Aquila"},
  {code:"PE",zone:"HS ROMA ZONE 5",branch:"LMIT-HS-ROME",name:"Pescara"},
  {code:"TE",zone:"HS ROMA ZONE 5",branch:"LMIT-HS-ROME",name:"Teramo"},
  {code:"AP",zone:"HS ROMA ZONE 5",branch:"LMIT-HS-ROME",name:"Ascoli Piceno"},
  {code:"CB",zone:"HS ROMA ZONE 5",branch:"LMIT-HS-ROME",name:"Campobasso"},
  {code:"IS",zone:"HS ROMA ZONE 5",branch:"LMIT-HS-ROME",name:"Isernia"},
  {code:"TO",zone:"HS TORINOO ZONE 1",branch:"LMIT-HS-TORINO",name:"Turin"},
  {code:"AO",zone:"HS TORINOO ZONE 2",branch:"LMIT-HS-TORINO",name:"Aosta"},
  {code:"AT",zone:"HS TORINOO ZONE 2",branch:"LMIT-HS-TORINO",name:"Asti"},
  {code:"BI",zone:"HS TORINOO ZONE 2",branch:"LMIT-HS-TORINO",name:"Biella"},
  {code:"CN",zone:"HS TORINOO ZONE 2",branch:"LMIT-HS-TORINO",name:"Cuneo"},
  {code:"SV",zone:"HS TORINOO ZONE 3",branch:"LMIT-HS-TORINO",name:"Savona"},
  {code:"GE",zone:"HS TORINOO ZONE 3",branch:"LMIT-HS-TORINO",name:"Genoa"},
  {code:"IM",zone:"HS TORINOO ZONE 3",branch:"LMIT-HS-TORINO",name:"Imperia"},
  {code:"SP",zone:"HS TORINOO ZONE 3",branch:"LMIT-HS-TORINO",name:"La Spezia"},
];

const BY_CODE = Object.fromEntries(PROVINCES_MAP.map(p => [p.code, p]));

const BRANCH_TO_REGION: Record<string, string> = {
  'LMIT-HS-BARI': 'SOUTH',
  'LMIT-HS-BOLOGNA': 'NORTH',
  'LMIT-HS-MILAN': 'NORTH',
  'LMIT-HS-NAPLES': 'SOUTH',
  'LMIT-HS-PADOVA': 'NORTH',
  'LMIT-HS-PALERMO': 'SOUTH',
  'LMIT-HS-ROME': 'SOUTH',
  'LMIT-HS-TORINO': 'NORTH'
};

interface CoverageMapProps {
  zoneSummaries: ZoneCoverageSummary[];
  selectedZone: string;
  selectedRegion: string;
  selectedBranch: string;
  onSelectBranch: (branch: string) => void;
  onSelectZone: (zone: string) => void;
}

export default function CoverageMap({
  zoneSummaries,
  selectedZone,
  selectedRegion,
  selectedBranch,
  onSelectBranch,
  onSelectZone
}: CoverageMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const geoJsonRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Filter zone summaries based on selections
  const filteredZoneSummaries = useMemo(() => {
    let filtered = zoneSummaries;
    if (selectedRegion !== 'ALL ITALY') {
      filtered = filtered.filter(summary => summary.region === selectedRegion);
    }
    if (selectedBranch !== 'ALL') {
      filtered = filtered.filter(summary => summary.branch === selectedBranch);
    }
    if (selectedZone !== 'ALL') {
      filtered = filtered.filter(summary => summary.zone === selectedZone);
    }
    return filtered;
  }, [zoneSummaries, selectedRegion, selectedBranch, selectedZone]);

  // Calculate summary statistics
  const filteredSummaryStats = useMemo(() => {
    const totalRetailers = filteredZoneSummaries.reduce((sum, summary) => sum + summary.total_retailers, 0);
    const uaoRetailers = filteredZoneSummaries.reduce((sum, summary) => sum + summary.uao, 0);
    const coveredRetailers = filteredZoneSummaries.reduce((sum, summary) => sum + summary.covered_retailers, 0);
    const notCoveredRetailers = filteredZoneSummaries.reduce((sum, summary) => sum + summary.not_covered_retailers, 0);
    const redFlaggedRetailers = filteredZoneSummaries.reduce((sum, summary) => sum + summary.red_flagged_retailers, 0);
    const logicFollowed = filteredZoneSummaries.reduce((sum, summary) => {
      const v = (summary as any).logic_followed ?? (summary as any).LOGIC_FOLLOWED ?? 0;
      return sum + (typeof v === 'number' ? v : Number(v) || 0);
    }, 0);
    const asmCovered = filteredZoneSummaries.reduce((sum, summary) => {
      const v = (summary as any).ASM_visits ?? (summary as any).asm_visits ?? 0;
      return sum + (typeof v === 'number' ? v : Number(v) || 0);
    }, 0);

    const uniqueBranches = new Set(filteredZoneSummaries.map(summary => summary.branch));
    const uniqueZones = new Set(filteredZoneSummaries.map(summary => summary.zone));

    const coveragePercent = totalRetailers > 0 ? (coveredRetailers / totalRetailers) * 100 : 0;
    const asmCoveragePercent = totalRetailers > 0 ? (asmCovered / totalRetailers) * 100 : 0;
    const logicFollowedPercent = totalRetailers > 0 ? (logicFollowed / totalRetailers) * 100 : 0;

    return {
      total: totalRetailers,
      uao: uaoRetailers,
      covered: coveredRetailers,
      notCovered: notCoveredRetailers,
      logicFollowed,
      logicFollowedPercent,
      asmCovered,
      asmCoveragePercent,
      redFlagged: redFlaggedRetailers,
      branches: uniqueBranches.size,
      zones: uniqueZones.size,
      coveragePercent: coveragePercent,
    };
  }, [filteredZoneSummaries]);

  const logicFollowedDonutData = useMemo(() => {
    const total = filteredSummaryStats.total;
    const followed = Math.min(filteredSummaryStats.logicFollowed, total);
    const notFollowed = Math.max(0, total - followed);
    return [
      { name: 'Logic Followed', value: followed, color: '#46286E' },
      { name: 'Not Followed', value: notFollowed, color: '#E5E7EB' },
    ];
  }, [filteredSummaryStats.total, filteredSummaryStats.logicFollowed]);

  const asmCoverageDonutData = useMemo(() => {
    const total = filteredSummaryStats.total;
    const covered = Math.min(filteredSummaryStats.asmCovered, total);
    const notCovered = Math.max(0, total - covered);
    return [
      { name: 'ASM Covered', value: covered, color: '#006AE0' },
      { name: 'Not Covered', value: notCovered, color: '#E5E7EB' },
    ];
  }, [filteredSummaryStats.total, filteredSummaryStats.asmCovered]);

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) {
      // Green variants
      if (coverage >= 100) return '#065f46';
      if (coverage >= 95) return '#08a35e';
      if (coverage >= 90) return '#58D56D';
      return '#7CDE8D';
    } else if (coverage >= 50) {
      // Yellow/Amber variants
      if (coverage >= 70) return '#FFDF20';
      if (coverage >= 60) return '#FFD230';
      return '#FF8904';
    } else {
      // Red variants
      if (coverage >= 30) return '#F54927 ';
      if (coverage >= 15) return '#FB2C36';
      return '#C11007';
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadChart = async () => {
      if (!mapRef.current) return;
      provinceGeoJsonPromise ??= fetch(GEOJSON_URL).then((response) => {
        if (!response.ok) throw new Error('Failed to load province map');
        return response.json();
      });
      const geoJson = await provinceGeoJsonPromise;
      if (cancelled || !mapRef.current) return;

      geoJsonRef.current = geoJson;
      echarts.registerMap('italy-provinces', geoJson);
      const chart = echarts.init(mapRef.current);
      chartRef.current = chart;
      setMapError(null);
      setMapReady(true);
      chart.on('click', (params: any) => {
        const province = BY_CODE[params.data?.code || params.name] ?? Object.values(BY_CODE).find((item) => provinceKey(item.name) === provinceKey(params.name));
        if (province) {
          onSelectBranch(province.branch);
          onSelectZone(province.zone);
        }
      });

      const resizeObserver = new ResizeObserver(() => chart.resize());
      resizeObserver.observe(mapRef.current);
      chartRef.current.resizeObserver = resizeObserver;
    };

    loadChart().catch((error: unknown) => {
      if (!cancelled) {
        setMapError(error instanceof Error ? error.message : 'Unable to load the coverage map');
      }
    });

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.resizeObserver?.disconnect();
        chartRef.current.dispose();
        chartRef.current = null;
      }
      setMapReady(false);
    };
  }, [onSelectBranch, onSelectZone]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mapReady) return;

    const summaryByAssignment = new Map(
      zoneSummaries.map((summary) => [`${summary.branch}|${summary.zone}`, summary]),
    );
    const visibleProvinces = PROVINCES_MAP.filter((province) => (
      (selectedRegion === 'ALL ITALY' || BRANCH_TO_REGION[province.branch] === selectedRegion)
      && (selectedBranch === 'ALL' || province.branch === selectedBranch)
      && (selectedZone === 'ALL' || province.zone === selectedZone)
    ));

    const data = PROVINCES_MAP.map((province) => {
      const summary = summaryByAssignment.get(`${province.branch}|${province.zone}`);
      const isVisible = visibleProvinces.some((item) => item.code === province.code);
      const coverage = summary ? Number(summary.coverage_percentage) : null;

      return {
        name: province.name,
        code: province.code,
        value: coverage,
        branch: province.branch,
        zone: province.zone,
        summary,
        coverage,
        itemStyle: { areaColor: isVisible ? getCoverageColor(coverage) : '#f1f5f9' },
      };
    });

    chart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const province = BY_CODE[params.data?.code || params.name] ?? Object.values(BY_CODE).find((item) => provinceKey(item.name) === provinceKey(params.name));
          if (!province) return params.name;
          const summary = summaryByAssignment.get(`${province.branch}|${province.zone}`);
          if (!summary) return `<strong>${province.name} (${province.code})</strong><br/>No Data`;
          const metric = (value: unknown) => Number(value ?? 0).toLocaleString();
          return `<strong>${province.name} (${province.code})</strong><br/>Coverage: ${Number(summary.coverage_percentage).toFixed(1)}%<br/>Covered retailers: ${metric(summary.covered_retailers)}<br/>Total retailers: ${metric(summary.total_retailers)}<br/>UAO: ${metric(summary.uao)}<br/>Not covered: ${metric(summary.not_covered_retailers)}<br/>Red flagged: ${metric(summary.red_flagged_retailers)}`;
        },
      },
      visualMap: {
        show: false,
      },
      geo: {
        map: 'italy-provinces',
        roam: true,
        itemStyle: { borderColor: '#ffffff', borderWidth: 0.8 },
        emphasis: { itemStyle: { borderColor: '#21264e', borderWidth: 1.5 } },
      },
      series: [{
        name: 'Coverage percentage',
        type: 'map',
        map: 'italy-provinces',
        geoIndex: 0,
        roam: true,
        data,
        emphasis: { label: { show: false } },
      }],
    }, true);

    if (visibleProvinces.length > 0) {
      const features = geoJsonRef.current?.features ?? [];
      const points = features
        .filter((feature: any) => {
          const featureName = feature.properties?.name ?? feature.properties?.NAME_2 ?? feature.properties?.prov_name;
          const featureCode = feature.properties?.code ?? feature.properties?.prov_istat_code ?? feature.properties?.id;
          return visibleProvinces.some((province) => province.code === featureCode || provinceKey(province.name) === provinceKey(featureName));
        })
        .flatMap((feature: any) => {
          const coordinates = feature.geometry?.coordinates?.flat(Infinity) ?? [];
          const result: number[][] = [];
          for (let index = 0; index < coordinates.length - 1; index += 2) {
            if (typeof coordinates[index] === 'number' && typeof coordinates[index + 1] === 'number') result.push([coordinates[index], coordinates[index + 1]]);
          }
          return result;
        });
      if (points.length > 0) {
        const xs = points.map((point) => point[0]);
        const ys = points.map((point) => point[1]);
        chart.setOption({ geo: { boundingCoords: [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]] } });
      }
    }
  }, [mapReady, zoneSummaries, selectedZone, selectedRegion, selectedBranch]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6 relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#21264E]">Territory Coverage Map</h3>
            <p className="text-sm text-gray-500">Provinces colored by coverage percentage</p>
          </div>
          
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {[
              ['#c2413b', '0-20% Very Low'],
              ['#f28c28', '20-40% Low'],
              ['#f4c95d', '40-60% Medium'],
              ['#69b578', '60-80% Good'],
              ['#1f7a58', '80-100% High'],
              ['#e2e8f0', 'No Data'],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs font-medium text-gray-600">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div ref={containerRef} className="relative min-h-[600px] flex justify-center bg-gray-50 rounded-xl overflow-hidden">
          <div ref={mapRef} className="h-[min(75vw,760px)] min-h-[600px] w-full" />
          {mapError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-6 text-center text-sm text-red-600">
              {mapError}
            </div>
          ) : null}
        </div>
      </div>

      {/* Summary Panel */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-[#21264E] mb-4">Summary</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-semibold mb-1">Total Retailers</p>
              <p className="text-xl font-bold text-[#21264E]">
                {filteredSummaryStats.total}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-semibold mb-1">UAO</p>
              <p className="text-xl font-bold text-blue-600">
                {filteredSummaryStats.uao}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-semibold mb-1">Covered</p>
              <p className="text-xl font-bold text-emerald-600">
                {filteredSummaryStats.covered}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-semibold mb-1">Not Covered</p>
              <p className="text-xl font-bold text-orange-600">
                {filteredSummaryStats.notCovered}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-semibold mb-1">Red Flagged</p>
              <p className="text-xl font-bold text-red-600">
                {filteredSummaryStats.redFlagged}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-2">Coverage Rate</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{
                  width: `${filteredSummaryStats.coveragePercent}%`,
                }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {Math.round(filteredSummaryStats.coveragePercent)}%
            </p>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 font-semibold">Branches</p>
                <p className="font-bold text-[#21264E]">{filteredSummaryStats.branches}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold">Zones</p>
                <p className="font-bold text-[#21264E]">{filteredSummaryStats.zones}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-[#21264E] mb-4">Logic Followed</h3>
          <div className="relative w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={logicFollowedDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {logicFollowedDonutData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[28px] font-bold text-[#21264E] leading-none">
                {Math.round(filteredSummaryStats.logicFollowedPercent)}%
              </div>
              <div className="text-[11px] font-semibold text-gray-500 mt-1">
                {filteredSummaryStats.logicFollowed} / {filteredSummaryStats.total}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs flex-wrap text-[#21264E]">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#46286E' }} />
              Logic Followed
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E5E7EB' }} />
              Not Followed
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-[#21264E] mb-4">ASM Coverage</h3>
          <div className="relative w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={asmCoverageDonutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {asmCoverageDonutData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-[28px] font-bold text-[#21264E] leading-none">
                {Math.round(filteredSummaryStats.asmCoveragePercent)}%
              </div>
              <div className="text-[11px] font-semibold text-gray-500 mt-1">
                {filteredSummaryStats.asmCovered} / {filteredSummaryStats.total}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs flex-wrap text-[#21264E]">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#006AE0' }} />
              ASM Covered
            </span>
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E5E7EB' }} />
              Not Covered
            </span>
          </div>
        </div>
      </div>

      {/* Coverage Summary Table */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-[#21264E] mb-4">Coverage Details by Zone</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-[#21264E]">Branch</th>
                <th className="text-left py-3 px-4 font-semibold text-[#21264E]">Zone</th>
                <th className="text-left py-3 px-4 font-semibold text-[#21264E]">Region</th>
                <th className="text-right py-3 px-4 font-semibold text-[#21264E]">Total Retailers</th>
                <th className="text-right py-3 px-4 font-semibold text-[#21264E]">UAO</th>
                <th className="text-right py-3 px-4 font-semibold text-[#21264E]">Covered</th>
                <th className="text-right py-3 px-4 font-semibold text-[#21264E]">Not Covered</th>
                <th className="text-right py-3 px-4 font-semibold text-[#21264E]">Red Flagged</th>
                <th className="text-right py-3 px-4 font-semibold text-[#21264E]">Coverage %</th>
              </tr>
            </thead>
            <tbody>
              {filteredZoneSummaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-500">No data available</td>
                </tr>
              ) : (
                filteredZoneSummaries.map((summary, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-[#21264E] font-medium">
                      {summary.branch.replace('LMIT-HS-', '')}
                    </td>
                    <td className="py-3 px-4 text-[#21264E]">{summary.zone}</td>
                    <td className="py-3 px-4 text-[#21264E]">{summary.region}</td>
                    <td className="py-3 px-4 text-right text-[#21264E]">{summary.total_retailers}</td>
                    <td className="py-3 px-4 text-right text-[#21264E]">{summary.uao}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-medium">{summary.covered_retailers}</td>
                    <td className="py-3 px-4 text-right text-orange-600">{summary.not_covered_retailers}</td>
                    <td className="py-3 px-4 text-right text-red-600">{summary.red_flagged_retailers}</td>
                    <td className="py-3 px-4 text-right text-[#21264E] font-medium">
                      {summary.coverage_percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
