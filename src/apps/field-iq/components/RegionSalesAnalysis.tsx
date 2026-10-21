'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, MapPinned, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@fieldiq/lib/supabase';
import type { RpaUser } from '@fieldiq/types';
import { normalizeBranch, NORTH_REGION, SOUTH_REGION } from '@fieldiq/data/mockData';
import italyProvinceAllocations from '@fieldiq/data/italy-provinces.json';

interface RegionSalesAnalysisProps {
  user: RpaUser;
  region: string;
  branch: string;
  zone: string;
}

interface RegionMonthlyRow {
  branch?: string;
  zone?: string;
  year: number;
  ga_cnt: number;
  port_in: number;
  port_out: number;
  add_gara: number;
  incentive: number;
  postcode?: string;
  city?: string;
  province: string;
  region: string;
  retailer_count?: number;
}

type MetricKey = 'ga_cnt' | 'port_in' | 'port_out' | 'add_gara' | 'incentive';
type GeographyLevel = 'city' | 'province' | 'postcode';
interface CityPerformanceRow {
  city: string;
  province: string;
  ga_cnt: number;
  port_in: number;
  port_out: number;
}
interface AreaPerformanceRow {
  label: string;
  ga_cnt: number;
  port_in: number;
  port_out: number;
}

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'ga_cnt', label: 'Gross activations' },
  { key: 'port_in', label: 'Port-ins' },
  { key: 'port_out', label: 'Port-outs' },
  { key: 'add_gara', label: 'GARA' },
  { key: 'incentive', label: 'Incentive' },
];

const NUMBER_FIELDS: MetricKey[] = ['ga_cnt', 'port_in', 'port_out', 'add_gara', 'incentive'];
const ALL_BRANCH_ROLES = ['HS-ADMIN', 'PM-ADMIN', 'COUNTRY-MANAGER', 'UK-ADMIN'];
const METRIC_COLORS: Record<MetricKey, { primary: string; scale: string[] }> = {
  ga_cnt: { primary: '#006AE0', scale: ['#EFF6FF', '#BFDBFE', '#60A5FA', '#006AE0'] },
  port_in: { primary: '#08DC7D', scale: ['#ECFDF5', '#A7F3D0', '#34D399', '#08DC7D'] },
  port_out: { primary: '#F04438', scale: ['#FEF2F2', '#FECACA', '#F87171', '#F04438'] },
  add_gara: { primary: '#46286E', scale: ['#F5F3FF', '#DDD6FE', '#A78BFA', '#46286E'] },
  incentive: { primary: '#FFD54F', scale: ['#FFFBEB', '#FDE68A', '#FCD34D', '#FFD54F'] },
};
let provinceMapPromise: Promise<any> | null = null;
const REGION_NAMES: Record<string, string> = {
  ABR: 'Abruzzo',
  BAS: 'Basilicata',
  CAL: 'Calabria',
  CAM: 'Campania',
  EMR: 'Emilia-Romagna',
  FVG: 'Friuli-Venezia Giulia',
  LAZ: 'Lazio',
  LIG: 'Liguria',
  LOM: 'Lombardia',
  MAR: 'Marche',
  MOL: 'Molise',
  PIE: 'Piemonte',
  PUG: 'Puglia',
  SAR: 'Sardegna',
  SIC: 'Sicilia',
  TAA: 'Trentino-Alto Adige',
  TOS: 'Toscana',
  UMB: 'Umbria',
  VDA: "Valle d'Aosta",
  VEN: 'Veneto',
};
const zoneAllocations = new Map(
  italyProvinceAllocations.features.map((feature) => [String(feature.properties.code ?? '').trim().toUpperCase(), feature.properties]),
);
const provinceNames = new Map(
  italyProvinceAllocations.features.map((feature) => [String(feature.properties.code ?? '').trim().toUpperCase(), feature.properties.name]),
);

const loadProvinceMap = () => {
  provinceMapPromise ??= fetch('/maps/italy-provinces.json').then((response) => {
    if (!response.ok) throw new Error(`Map data request failed (${response.status})`);
    return response.json();
  });
  return provinceMapPromise;
};

const numberValue = (value: unknown) => {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
};

const textKey = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/[^a-z0-9]+/gi, '')
  .toLowerCase();

const provinceCodeKey = (value: unknown) => String(value ?? '').trim().toUpperCase();

const provinceLabel = (code: unknown) => {
  const provinceCode = provinceCodeKey(code);
  return provinceNames.get(provinceCode) ? `${provinceNames.get(provinceCode)} (${provinceCode})` : provinceCode || 'Unspecified province';
};

const regionLabel = (value: unknown) => {
  const code = String(value ?? '').trim().toUpperCase();
  if (!code) return 'Unspecified region';
  return REGION_NAMES[code] ? `${REGION_NAMES[code]} (${code})` : code;
};

const escapeHtml = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatValue = (value: number, metric: MetricKey) => metric === 'incentive'
  ? `€${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  : value.toLocaleString(undefined, { maximumFractionDigits: 0 });

const getLocationLabel = (row: RegionMonthlyRow, level: GeographyLevel) => {
  if (level === 'province') return provinceLabel(row.province);
  if (level === 'postcode') return row.postcode || 'Unspecified postcode';
  return row.city || 'Unspecified city';
};

const getScopedBranches = (user: RpaUser, region: string) => {
  const assignedBranches = (user.branches ?? []).map(normalizeBranch).filter(Boolean);
  let scopedBranches: string[] | null = ALL_BRANCH_ROLES.includes(user.role) ? null : assignedBranches;
  if (region === 'NORTH' || region === 'SOUTH') {
    const regionBranches = region === 'NORTH' ? NORTH_REGION : SOUTH_REGION;
    scopedBranches = scopedBranches
      ? scopedBranches.filter((assigned) => regionBranches.includes(assigned))
      : regionBranches;
  }
  return scopedBranches;
};

const getMapBounds = (features: any[]) => {
  let minLongitude = Infinity;
  let minLatitude = Infinity;
  let maxLongitude = -Infinity;
  let maxLatitude = -Infinity;

  const visitCoordinates = (coordinates: any): void => {
    if (!Array.isArray(coordinates)) return;
    if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      minLongitude = Math.min(minLongitude, coordinates[0]);
      minLatitude = Math.min(minLatitude, coordinates[1]);
      maxLongitude = Math.max(maxLongitude, coordinates[0]);
      maxLatitude = Math.max(maxLatitude, coordinates[1]);
      return;
    }
    coordinates.forEach(visitCoordinates);
  };

  features.forEach((feature) => visitCoordinates(feature.geometry?.coordinates));
  if (!Number.isFinite(minLongitude) || !Number.isFinite(minLatitude)) return null;

  const longitudePadding = Math.max((maxLongitude - minLongitude) * 0.08, 0.12);
  const latitudePadding = Math.max((maxLatitude - minLatitude) * 0.08, 0.12);
  return [
    [minLongitude - longitudePadding, maxLatitude + latitudePadding],
    [maxLongitude + longitudePadding, minLatitude - latitudePadding],
  ];
};

function ProvinceSalesMap({ rows, metric }: { rows: RegionMonthlyRow[]; metric: MetricKey }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const mapDataRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');

  const provinceData = useMemo(() => {
    const grouped = new Map<string, { value: number; region: string }>();
    rows.forEach((row) => {
      const key = provinceCodeKey(row.province);
      if (!key) return;
      const entry = grouped.get(key) ?? { value: 0, region: row.region || '' };
      entry.value += numberValue(row[metric]);
      if (!entry.region && row.region) entry.region = row.region;
      grouped.set(key, entry);
    });
    return grouped;
  }, [rows, metric]);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    const loadMap = async () => {
      if (!mapRef.current) return;
      const echartsModule = await import('echarts');
      const echarts = (echartsModule as any).default ?? echartsModule;
      const geoJson = await loadProvinceMap();
      if (cancelled || !mapRef.current) return;

      const features = (geoJson.features ?? []).map((feature: any) => ({
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
          name: feature.properties?.prov_name ?? feature.properties?.name ?? feature.properties?.prov_acr ?? feature.properties?.code ?? '',
        },
      }));
      echarts.registerMap('italy-region-sales', { ...geoJson, features });
      mapDataRef.current = { ...geoJson, features };
      const chart = echarts.init(mapRef.current);
      chartRef.current = chart;
      resizeObserver = new ResizeObserver(() => chart.resize());
      resizeObserver.observe(mapRef.current);
      setMapError('');
      setMapReady(true);
    };

    loadMap().catch((error: unknown) => {
      if (!cancelled) setMapError(error instanceof Error ? error.message : 'Unable to load province map.');
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const geoJson = mapDataRef.current;
    if (!chart || !mapReady || !geoJson) return;
    try {
      const data = (geoJson.features ?? []).map((feature: any) => {
        const properties = feature.properties ?? {};
        const provinceName = String(properties.prov_name ?? properties.name ?? '');
        const code = provinceCodeKey(properties.prov_acr ?? properties.code);
        const province = provinceData.get(code) ?? provinceData.get(textKey(provinceName));
        const allocation = zoneAllocations.get(code);
        return {
          name: provinceName,
          value: province?.value ?? 0,
          region: province?.region ? regionLabel(province.region) : properties.reg_name || 'Unknown',
          branch: allocation?.branch ?? 'Unassigned',
          allocatedZone: allocation?.zone ?? 'Unassigned',
          code,
        };
      });
      const activeCodes = new Set(provinceData.keys());
      const scopedFeatures = (geoJson.features ?? []).filter((feature: any) => (
        activeCodes.has(provinceCodeKey(feature.properties?.prov_acr ?? feature.properties?.code))
        || activeCodes.has(textKey(feature.properties?.prov_name ?? feature.properties?.name))
      ));
      const bounds = getMapBounds(scopedFeatures);
      const color = METRIC_COLORS[metric];

      chart.setOption({
        tooltip: {
          trigger: 'item',
          confine: true,
          backgroundColor: '#ffffff',
          borderColor: '#dbe3ef',
          borderWidth: 1,
          textStyle: { color: '#21264E' },
          formatter: (params: any) => {
            const item = params.data ?? {};
            return `<strong>${escapeHtml(params.name)}</strong><br/>Province: ${escapeHtml(item.code || '—')}<br/>Region: ${escapeHtml(item.region)}<br/>Allocated branch / zone: ${escapeHtml(item.branch)} / ${escapeHtml(item.allocatedZone)}<br/>${escapeHtml(METRICS.find((entry) => entry.key === metric)?.label)}: ${escapeHtml(formatValue(numberValue(item.value), metric))}`;
          },
        },
        visualMap: {
          min: 0,
          max: Math.max(1, ...data.map((item: any) => numberValue(item.value))),
          left: 16,
          bottom: 12,
          calculable: true,
          textStyle: { color: '#21264E' },
          inRange: { color: color.scale },
        },
        geo: {
          map: 'italy-region-sales',
          roam: true,
          ...(bounds ? { boundingCoords: bounds } : {}),
          scaleLimit: { min: 1, max: 12 },
          itemStyle: { areaColor: '#e8edf5', borderColor: '#ffffff', borderWidth: 1 },
          emphasis: {
            itemStyle: { areaColor: color.primary, borderColor: '#21264E', borderWidth: 1.5, shadowBlur: 8, shadowColor: '#21264E33' },
            label: { show: true, color: '#21264E', fontSize: 9 },
          },
        },
        series: [{
          name: METRICS.find((entry) => entry.key === metric)?.label,
          type: 'map',
          map: 'italy-region-sales',
          geoIndex: 0,
          data,
          emphasis: {
            itemStyle: { areaColor: color.primary, borderColor: '#21264E', borderWidth: 1.5, shadowBlur: 8, shadowColor: 'rgba(33, 38, 78, 0.2)' },
            label: { show: true, color: '#21264E', fontSize: 9 },
          },
        }],
      }, true);
    } catch (error) {
      setMapError(error instanceof Error ? error.message : 'Unable to render province sales data.');
    }
  }, [mapReady, metric, provinceData]);

  return (
    <section className="rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#21264E]">Italy province heatmap</h2>
        <p className="text-sm text-slate-500">Select a sales or MNP metric. Hover over a province to see its region and retailer-coverage zone.</p>
      </div>
      {mapError && <p className="mb-3 text-sm text-red-700" role="alert">{mapError}</p>}
      <div ref={mapRef} className="h-[360px] rounded-2xl bg-slate-50 sm:h-[460px] lg:h-[520px]" />
    </section>
  );
}

export default function RegionSalesAnalysis({ user, region, branch, zone }: RegionSalesAnalysisProps) {
  const [rows, setRows] = useState<RegionMonthlyRow[]>([]);
  const [detailRows, setDetailRows] = useState<RegionMonthlyRow[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [cityRows, setCityRows] = useState<CityPerformanceRow[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [cityError, setCityError] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [mapMetric, setMapMetric] = useState<MetricKey>('ga_cnt');
  const [geographyLevel, setGeographyLevel] = useState<GeographyLevel>('province');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [search, setSearch] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchYears = async () => {
      setLoadingYears(true);
      setLoadError('');

      const allowedBranches = (user.branches ?? []).map(normalizeBranch).filter(Boolean);
      if (user.role === 'ZONE-MANAGER' && (!branch || !zone)) {
        setLoadError('This Zone Manager account does not have a complete branch and zone assignment.');
        setAvailableYears([]);
        setSelectedYear('');
        setLoadingYears(false);
        return;
      }
      if (!ALL_BRANCH_ROLES.includes(user.role) && allowedBranches.length === 0) {
        setLoadError('No branch assignment is available for this account.');
        setAvailableYears([]);
        setSelectedYear('');
        setLoadingYears(false);
        return;
      }

      const scopedBranches = getScopedBranches(user, region);

      const { data, error } = await supabase.rpc('retailer_region_years', {
        p_branches: scopedBranches,
        p_branch: branch || null,
        p_zone: zone || null,
      });
      if (error) throw new Error(error.message);
      if (cancelled) return;
      const years = (data ?? []).map((item: { year: number }) => String(item.year));
      setAvailableYears(years);
      setSelectedYear((current) => (current && years.includes(current) ? current : years[0] ?? ''));
      setLoadingYears(false);
    };

    fetchYears().catch((error: unknown) => {
      if (!cancelled) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load region sales data.');
        setLoadingYears(false);
      }
    });

    return () => { cancelled = true; };
  }, [user, region, branch, zone, reloadKey]);

  useEffect(() => {
    let cancelled = false;

    const fetchRows = async () => {
      setLoading(true);
      setRows([]);
      setDetailRows([]);
      if (!selectedYear || loadingYears || loadError) {
        setLoading(false);
        return;
      }

      const scopedBranches = getScopedBranches(user, region);

      const { data, error } = await supabase.rpc('retailer_region_province_report', {
        p_year: Number(selectedYear),
        p_branches: scopedBranches,
        p_branch: branch || null,
        p_zone: zone || null,
      });
      if (error) throw new Error(error.message);
      if (cancelled) return;
      setRows((data ?? []).map((row: Omit<RegionMonthlyRow, 'year'>) => ({ ...row, year: Number(selectedYear) })));
      setLoading(false);
    };

    fetchRows().catch((error: unknown) => {
      if (!cancelled) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load region sales data.');
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user, region, branch, zone, selectedYear, loadingYears, loadError, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const fetchCities = async () => {
      setCityRows([]);
      setCityError('');
      if (!selectedYear || loadingYears) {
        setLoadingCities(false);
        return;
      }
      setLoadingCities(true);
      const { data, error } = await supabase.rpc('retailer_region_city_report', {
        p_year: Number(selectedYear),
        p_branches: getScopedBranches(user, region),
        p_branch: branch || null,
        p_zone: zone || null,
      });
      if (error) throw new Error(error.message);
      if (cancelled) return;
      setCityRows(((data ?? []) as CityPerformanceRow[]).map((row) => ({
        ...row,
        ga_cnt: numberValue(row.ga_cnt),
        port_in: numberValue(row.port_in),
        port_out: numberValue(row.port_out),
      })));
      setLoadingCities(false);
    };
    fetchCities().catch((error: unknown) => {
      if (!cancelled) {
        setCityError(error instanceof Error ? error.message : 'Unable to load city performance.');
        setLoadingCities(false);
      }
    });
    return () => { cancelled = true; };
  }, [user, region, branch, zone, selectedYear, loadingYears, reloadKey]);

  useEffect(() => {
    let cancelled = false;
    const fetchDetailRows = async () => {
      setDetailRows([]);
      if (geographyLevel === 'province' || !selectedProvince || !selectedYear || loading || loadError) {
        setLoadingDetails(false);
        return;
      }
      setLoadingDetails(true);

      let query = supabase
        .from('retailer_region_yearly')
        .select('branch, zone, year, ga_cnt, port_in, port_out, add_gara, incentive, postcode, city, province, region')
        .eq('year', Number(selectedYear))
        .eq('province', selectedProvince)
        .order('city', { ascending: true })
        .order('postcode', { ascending: true });

      const scopedBranches = getScopedBranches(user, region);
      if (scopedBranches) query = query.in('branch', scopedBranches);
      if (region === 'NORTH') query = query.in('branch', NORTH_REGION);
      if (region === 'SOUTH') query = query.in('branch', SOUTH_REGION);
      if (branch) query = query.eq('branch', branch);
      if (zone) query = query.eq('zone', zone);
      if (user.role === 'ZONE-MANAGER') query = query.eq('zone', zone);

      const result: RegionMonthlyRow[] = [];
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await query.range(offset, offset + pageSize - 1);
        if (error) throw new Error(error.message);
        const page = (data ?? []) as RegionMonthlyRow[];
        result.push(...page);
        if (page.length < pageSize) break;
      }
      if (!cancelled) {
        setDetailRows(result);
        setLoadingDetails(false);
      }
    };

    fetchDetailRows().catch((error: unknown) => {
      if (!cancelled) {
        setLoadError(error instanceof Error ? error.message : 'Unable to load location detail.');
        setLoadingDetails(false);
      }
    });
    return () => { cancelled = true; };
  }, [user, region, branch, zone, selectedYear, geographyLevel, selectedProvince, loading, loadError]);

  const filteredRows = useMemo(
    () => rows.filter((row) => !selectedYear || String(row.year) === selectedYear),
    [rows, selectedYear],
  );
  const filteredDetailRows = useMemo(
    () => detailRows.filter((row) => !selectedYear || String(row.year) === selectedYear),
    [detailRows, selectedYear],
  );
  const provinceOptions = useMemo(() => [...new Set(filteredRows.map((row) => row.province).filter(Boolean))]
    .sort((a, b) => provinceLabel(a).localeCompare(provinceLabel(b))), [filteredRows]);

  const totals = useMemo(() => filteredRows.reduce((result, row) => {
    NUMBER_FIELDS.forEach((field) => { result[field] += numberValue(row[field]); });
    return result;
  }, { ga_cnt: 0, port_in: 0, port_out: 0, add_gara: 0, incentive: 0 }), [filteredRows]);

  const regionalPerformance = useMemo(() => {
    const grouped = new Map<string, { region: string; ga_cnt: number; port_in: number; port_out: number; add_gara: number; incentive: number }>();
    filteredRows.forEach((row) => {
      const code = row.region?.trim().toUpperCase() || '';
      const name = regionLabel(code);
      const result = grouped.get(name) ?? { region: name, ga_cnt: 0, port_in: 0, port_out: 0, add_gara: 0, incentive: 0 };
      result.ga_cnt += numberValue(row.ga_cnt);
      result.port_in += numberValue(row.port_in);
      result.port_out += numberValue(row.port_out);
      result.add_gara += numberValue(row.add_gara);
      result.incentive += numberValue(row.incentive);
      grouped.set(name, result);
    });
    return [...grouped.values()]
      .filter((item) => [item.ga_cnt, item.port_in, item.port_out, item.add_gara, item.incentive].some((value) => value !== 0))
      .sort((a, b) => b.ga_cnt - a.ga_cnt);
  }, [filteredRows]);

  const rankingsByCity = Boolean(branch || zone);
  const areaPerformance = useMemo<AreaPerformanceRow[]>(() => rankingsByCity
    ? cityRows.map((row) => ({
      label: `${row.city} (${row.province || '—'})`,
      ga_cnt: numberValue(row.ga_cnt),
      port_in: numberValue(row.port_in),
      port_out: numberValue(row.port_out),
    }))
    : filteredRows.map((row) => ({
      label: provinceLabel(row.province),
      ga_cnt: numberValue(row.ga_cnt),
      port_in: numberValue(row.port_in),
      port_out: numberValue(row.port_out),
    })), [cityRows, filteredRows, rankingsByCity]);

  const topGaAreas = useMemo(() => [...areaPerformance]
    .filter((row) => row.ga_cnt > 0)
    .sort((a, b) => b.ga_cnt - a.ga_cnt)
    .slice(0, 15), [areaPerformance]);
  const topPortInAreas = useMemo(() => [...areaPerformance]
    .filter((row) => row.port_in > 0)
    .sort((a, b) => b.port_in - a.port_in)
    .slice(0, 15), [areaPerformance]);
  const netMnpAreas = useMemo(() => [...areaPerformance]
    .map((row) => ({ ...row, net_mnp: row.port_in - row.port_out }))
    .filter((row) => row.net_mnp !== 0)
    .sort((a, b) => Math.abs(b.net_mnp) - Math.abs(a.net_mnp))
    .slice(0, 15), [areaPerformance]);
  const topCityRows = useMemo(() => [...cityRows]
    .filter((row) => row.ga_cnt > 0)
    .sort((a, b) => b.ga_cnt - a.ga_cnt)
    .slice(0, 20), [cityRows]);
  const maxCityGa = Math.max(1, ...topCityRows.map((row) => row.ga_cnt));
  const formatAreaTick = (label: string) => label.length > 19 ? `${label.slice(0, 17)}…` : label;

  const locationRows = useMemo(() => {
    const grouped = new Map<string, RegionMonthlyRow & { label: string }>();
    const sourceRows = geographyLevel === 'province' ? filteredRows : filteredDetailRows;
    sourceRows.forEach((row) => {
      const label = getLocationLabel(row, geographyLevel);
      const key = geographyLevel === 'postcode'
        ? `${textKey(row.postcode)}|${textKey(row.city)}|${textKey(row.province)}`
        : geographyLevel === 'city'
          ? `${textKey(row.city)}|${textKey(row.province)}`
          : textKey(row.province);
      const current = grouped.get(key) ?? {
        ...row,
        label,
        ga_cnt: 0,
        port_in: 0,
        port_out: 0,
        add_gara: 0,
        incentive: 0,
        retailer_count: 0,
      };
      NUMBER_FIELDS.forEach((field) => { current[field] += numberValue(row[field]); });
      current.retailer_count += numberValue(row.retailer_count);
      grouped.set(key, current);
    });
    return [...grouped.values()]
      .filter((row) => [row.label, row.city, row.postcode, row.province, row.region]
        .some((value) => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())))
      .sort((a, b) => b.ga_cnt - a.ga_cnt);
  }, [filteredRows, filteredDetailRows, geographyLevel, search]);

  const hasData = !loading && !loadError && filteredRows.length > 0;
  const metricLabel = METRICS.find((entry) => entry.key === mapMetric)?.label ?? 'Metric';

  return (
    <div className="space-y-5 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      <section className="rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#245bc1]">Field IQ / Geography</p>
            <h1 className="mt-2 text-2xl font-bold text-[#21264E]">Region & City Sales Analysis</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Explore activations, MNP activity, GARA and incentives by Italian region, province, city and postcode. Monthly averages use the selected year total divided by 12.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#21264E]">
            Analysis year
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              disabled={loading || loadingYears || availableYears.length === 0}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 disabled:bg-gray-50"
            >
              {availableYears.length === 0 && <option value="">No years</option>}
              {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </label>
        </div>
      </section>

      {loadError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1">{loadError}</div>
          <button onClick={() => setReloadKey((current) => current + 1)} className="inline-flex items-center gap-1 font-semibold">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-slate-500">Loading scoped regional sales data…</div>
      ) : loadError ? null : !hasData ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <MapPinned className="mx-auto text-slate-400" size={28} />
          <h2 className="mt-3 font-semibold text-[#21264E]">No location sales data found</h2>
          <p className="mt-1 text-sm text-slate-500">There are no retailer monthly records for this year and territory. Check the source location fields and import.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {[
              { label: 'Gross activations', total: totals.ga_cnt, average: totals.ga_cnt / 12, currency: false },
              { label: 'Port-ins', total: totals.port_in, average: totals.port_in / 12, currency: false },
              { label: 'Port-outs', total: totals.port_out, average: totals.port_out / 12, currency: false },
              { label: 'GARA', total: totals.add_gara, average: totals.add_gara / 12, currency: false },
              { label: 'Incentive', total: totals.incentive, average: totals.incentive / 12, currency: true },
            ].map((item) => (
              <div key={item.label} className="min-w-0 rounded-2xl border border-[#21264E]/10 bg-white p-4 shadow-sm sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-3 truncate text-2xl font-bold text-[#21264E]">
                  {item.currency ? '€' : ''}{item.total.toLocaleString(undefined, { maximumFractionDigits: item.currency ? 0 : 1 })}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Monthly avg: {item.currency ? '€' : ''}{item.average.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </p>
              </div>
            ))}
          </div>

          <div className="grid min-w-0 gap-5 lg:grid-cols-2">
            <section className="min-w-0 rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#21264E]">Top 20 GA performing cities</h2>
                  <p className="text-sm text-slate-500">Top cities in the selected territory. Monthly average is annual GA divided by 12.</p>
                </div>
                <span className="shrink-0 rounded-full bg-[#006AE0]/10 px-3 py-1 text-xs font-bold text-[#006AE0]">
                  {topCityRows.length} / {cityRows.length.toLocaleString()} cities
                </span>
              </div>
              {cityError ? (
                <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">{cityError}</p>
              ) : loadingCities ? (
                <p className="flex h-[360px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500" role="status">Loading city summaries…</p>
              ) : topCityRows.length ? (
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 sm:pr-2">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(36px,1fr)_auto_auto] gap-2 border-b border-slate-100 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:grid-cols-[minmax(100px,1fr)_minmax(60px,1.5fr)_auto_auto]">
                    <span>City</span><span aria-label="GA comparison" /><span className="text-right">GA</span><span className="text-right">Avg/mo</span>
                  </div>
                  {topCityRows.map((item, index) => (
                    <div key={`${item.province}-${item.city}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(36px,1fr)_auto_auto] items-center gap-2 text-xs sm:grid-cols-[minmax(100px,1fr)_minmax(60px,1.5fr)_auto_auto] sm:gap-3 sm:text-sm">
                      <span className="truncate font-medium text-[#21264E]" title={`${item.city} (${provinceLabel(item.province)})`}>
                        {item.city} <span className="text-xs text-slate-400">{item.province}</span>
                      </span>
                      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-[#006AE0]" style={{ width: `${Math.max(1, item.ga_cnt / maxCityGa * 100)}%` }} />
                      </div>
                      <span className="text-right font-semibold tabular-nums text-[#21264E]">{item.ga_cnt.toLocaleString()}</span>
                      <span className="text-right tabular-nums text-slate-600">{(item.ga_cnt / 12).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="flex h-[360px] items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">No city records for this territory and year.</p>
              )}
            </section>

            <section className="min-w-0 rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#21264E]">Regional performance</h2>
                <p className="text-sm text-slate-500">Sales and MNP activity by administrative region.</p>
              </div>
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Region</th>
                      <th className="px-3 py-2 text-right">GA</th>
                      <th className="px-3 py-2 text-right">Port-in</th>
                      <th className="px-3 py-2 text-right">Port-out</th>
                      <th className="px-3 py-2 text-right">GARA</th>
                      <th className="px-3 py-2 text-right">Incentive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regionalPerformance.map((item) => (
                      <tr key={item.region} className="border-t border-slate-100">
                        <td className="px-3 py-2.5 font-medium text-[#21264E]">{item.region}</td>
                        <td className="px-3 py-2.5 text-right">{item.ga_cnt.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right">{item.port_in.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right">{item.port_out.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right">{item.add_gara.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-right">€{item.incentive.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                    {regionalPerformance.length === 0 && (
                      <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No regions have reported activity.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="grid min-w-0 gap-5 lg:grid-cols-2">
            <section className="rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#21264E]">Leading {rankingsByCity ? 'cities' : 'provinces'} by GA</h2>
                <p className="text-sm text-slate-500">Top 15 {rankingsByCity ? 'cities' : 'provinces'} for {selectedYear}.</p>
              </div>
              <div className="h-[360px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topGaAreas} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fill: '#21264E', fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" tickFormatter={formatAreaTick} width={115} tick={{ fill: '#21264E', fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => Number(value).toLocaleString()} />
                    <Bar dataKey="ga_cnt" name="GA" fill="#006AE0" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#21264E]">Leading {rankingsByCity ? 'cities' : 'provinces'} by Port-in</h2>
                <p className="text-sm text-slate-500">Top 15 {rankingsByCity ? 'cities' : 'provinces'} for {selectedYear}.</p>
              </div>
              <div className="h-[360px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topPortInAreas} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fill: '#21264E', fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" tickFormatter={formatAreaTick} width={115} tick={{ fill: '#21264E', fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => Number(value).toLocaleString()} />
                    <Bar dataKey="port_in" name="Port-in" fill="#08DC7D" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#21264E]">Net MNP balance by {rankingsByCity ? 'city' : 'province'}</h2>
                <p className="text-sm text-slate-500">Top 15 by absolute activity. Positive values mean more port-ins; negative values mean more port-outs.</p>
              </div>
              <div className="h-[360px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={netMnpAreas} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis type="number" domain={['dataMin', 'dataMax']} tick={{ fill: '#21264E', fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" tickFormatter={formatAreaTick} width={115} tick={{ fill: '#21264E', fontSize: 10 }} />
                    <Tooltip formatter={(value: number) => Number(value).toLocaleString()} />
                    <Bar dataKey="net_mnp" name="Port-in minus Port-out" fill="#46286E" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#21264E]">MNP & sales activity heatmap</h2>
                <p className="text-sm text-slate-500">Province shading updates to the selected activity; hover for region and allocated coverage zone.</p>
              </div>
              <label className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#21264E]">
                Map metric
                <select value={mapMetric} onChange={(event) => setMapMetric(event.target.value as MetricKey)} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                  {METRICS.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}
                </select>
              </label>
            </div>
            <ProvinceSalesMap rows={filteredRows} metric={mapMetric} />
            <p className="mt-2 text-xs text-slate-500">Current map metric: {metricLabel}. The map refits to the provinces in the selected territory.</p>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[#21264E]/10 bg-white shadow-sm">
            <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#21264E]">Location detail</h2>
                <p className="text-sm text-slate-500">Compare performance by province, city or postcode.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label className="flex items-center gap-2 text-sm text-[#21264E]">
                  Group by
                  <select
                    value={geographyLevel}
                    onChange={(event) => {
                      setGeographyLevel(event.target.value as GeographyLevel);
                      setSelectedProvince('');
                      setSearch('');
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2"
                  >
                    <option value="province">Province</option>
                    <option value="city">City</option>
                    <option value="postcode">Postcode</option>
                  </select>
                </label>
                {geographyLevel !== 'province' && (
                  <label className="flex items-center gap-2 text-sm text-[#21264E]">
                    Province
                    <select
                      value={selectedProvince}
                      onChange={(event) => setSelectedProvince(event.target.value)}
                      className="max-w-[220px] rounded-lg border border-gray-200 bg-white px-3 py-2"
                    >
                      <option value="">Select province</option>
                      {provinceOptions.map((code) => (
                        <option key={code} value={code}>{provinceLabel(code)}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search location…"
                    disabled={geographyLevel !== 'province' && (!selectedProvince || loadingDetails)}
                    className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm disabled:bg-slate-50 sm:w-56"
                  />
                </label>
              </div>
            </div>
            {geographyLevel !== 'province' && !selectedProvince && (
              <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                Select a province to fetch city or postcode rows for that province only.
              </p>
            )}
            {loadingDetails && (
              <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500" role="status">
                Loading details for {provinceLabel(selectedProvince)}…
              </p>
            )}
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Province / region</th>
                    <th className="px-4 py-3 text-right">GA</th>
                    <th className="px-4 py-3 text-right">Port-in</th>
                    <th className="px-4 py-3 text-right">Port-out</th>
                    <th className="px-4 py-3 text-right">GARA</th>
                    <th className="px-4 py-3 text-right">Incentive</th>
                  </tr>
                </thead>
                <tbody>
                  {locationRows.map((row, index) => (
                    <tr key={`${row.label}-${row.city}-${row.province}-${index}`} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-[#21264E]">{row.label}</td>
                      <td className="px-4 py-3">{row.city || '—'}{row.postcode ? ` (${row.postcode})` : ''}</td>
                      <td className="px-4 py-3">{row.province?.trim().toUpperCase() || '—'} / {regionLabel(row.region)}</td>
                      <td className="px-4 py-3 text-right">{row.ga_cnt.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.port_in.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.port_out.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.add_gara.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">€{row.incentive.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                  {locationRows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">No matching locations.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
