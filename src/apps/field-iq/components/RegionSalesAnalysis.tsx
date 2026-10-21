'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  branch: string;
  zone: string;
  year: number;
  ga_cnt: number;
  port_in: number;
  port_out: number;
  add_gara: number;
  incentive: number;
  postcode: string;
  city: string;
  province: string;
  region: string;
  retailer_count: number;
}

type MetricKey = 'ga_cnt' | 'port_in' | 'port_out' | 'add_gara' | 'incentive';
type GeographyLevel = 'city' | 'province' | 'postcode';

const METRICS: { key: MetricKey; label: string }[] = [
  { key: 'ga_cnt', label: 'Gross activations' },
  { key: 'port_in', label: 'Port-ins' },
  { key: 'port_out', label: 'Port-outs' },
  { key: 'add_gara', label: 'Add-ons' },
  { key: 'incentive', label: 'Incentive' },
];

const NUMBER_FIELDS: MetricKey[] = ['ga_cnt', 'port_in', 'port_out', 'add_gara', 'incentive'];
const ALL_BRANCH_ROLES = ['HS-ADMIN', 'PM-ADMIN', 'COUNTRY-MANAGER', 'UK-ADMIN'];
const COLORS = ['#245bc1', '#08a884', '#f59e0b', '#7c3aed', '#e11d48', '#0891b2', '#65a30d', '#ea580c', '#4f46e5', '#0f766e'];
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
  italyProvinceAllocations.features.map((feature) => [feature.properties.code, feature.properties]),
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
  if (level === 'province') return row.province || 'Unspecified province';
  if (level === 'postcode') return row.postcode || 'Unspecified postcode';
  return row.city || 'Unspecified city';
};

function ProvinceSalesMap({ rows, metric }: { rows: RegionMonthlyRow[]; metric: MetricKey }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const mapDataRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');

  const provinceData = useMemo(() => {
    const grouped = new Map<string, { value: number; region: string; zones: Map<string, number> }>();
    rows.forEach((row) => {
      const key = textKey(row.province);
      if (!key) return;
      const entry = grouped.get(key) ?? { value: 0, region: row.region || '', zones: new Map<string, number>() };
      entry.value += numberValue(row[metric]);
      if (row.zone) entry.zones.set(row.zone, (entry.zones.get(row.zone) ?? 0) + numberValue(row[metric]));
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
          name: feature.properties?.prov_name ?? feature.properties?.name ?? '',
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
        const code = String(properties.prov_acr ?? properties.code ?? '');
        const province = provinceData.get(textKey(provinceName)) ?? provinceData.get(textKey(code));
        const allocation = zoneAllocations.get(code);
        const topZone = [...(province?.zones.entries() ?? [])].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'No zone data';
        return {
          name: provinceName,
          value: province?.value ?? 0,
          region: province?.region ? regionLabel(province.region) : properties.reg_name || 'Unknown',
          branch: allocation?.branch ?? 'Unassigned',
          allocatedZone: allocation?.zone ?? 'Unassigned',
          zone: topZone,
          code,
        };
      });

      chart.setOption({
        tooltip: {
          trigger: 'item',
          confine: true,
          formatter: (params: any) => {
            const item = params.data ?? {};
            return `<strong>${escapeHtml(params.name)}</strong><br/>Province: ${escapeHtml(item.code || '—')}<br/>Region: ${escapeHtml(item.region)}<br/>Allocated branch / zone: ${escapeHtml(item.branch)} / ${escapeHtml(item.allocatedZone)}<br/>Top sales zone: ${escapeHtml(item.zone)}<br/>${escapeHtml(METRICS.find((entry) => entry.key === metric)?.label)}: ${escapeHtml(formatValue(numberValue(item.value), metric))}`;
          },
        },
        visualMap: {
          min: 0,
          max: Math.max(1, ...data.map((item: any) => numberValue(item.value))),
          left: 16,
          bottom: 12,
          calculable: true,
          textStyle: { color: '#ffffff' },
          inRange: { color: ['#dbeafe', '#60a5fa', '#1d4ed8', '#172554'] },
        },
        geo: {
          map: 'italy-region-sales',
          roam: true,
          itemStyle: { areaColor: '#e2e8f0', borderColor: '#ffffff', borderWidth: 0.7 },
          emphasis: { itemStyle: { areaColor: '#fbbf24' } },
        },
        series: [{
          name: METRICS.find((entry) => entry.key === metric)?.label,
          type: 'map',
          map: 'italy-region-sales',
          geoIndex: 0,
          data,
          emphasis: { label: { show: true, color: '#ffffff', fontSize: 9 } },
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
      <div ref={mapRef} className="h-[420px] rounded-2xl bg-[#21264e] sm:h-[520px]" />
    </section>
  );
}

export default function RegionSalesAnalysis({ user, region, branch, zone }: RegionSalesAnalysisProps) {
  const [rows, setRows] = useState<RegionMonthlyRow[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loadingYears, setLoadingYears] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [mapMetric, setMapMetric] = useState<MetricKey>('port_in');
  const [geographyLevel, setGeographyLevel] = useState<GeographyLevel>('city');
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

      let scopedBranches: string[] | null = ALL_BRANCH_ROLES.includes(user.role) ? null : allowedBranches;
      if (region === 'NORTH' || region === 'SOUTH') {
        const regionBranches = region === 'NORTH' ? NORTH_REGION : SOUTH_REGION;
        scopedBranches = scopedBranches
          ? scopedBranches.filter((assigned) => regionBranches.includes(assigned))
          : regionBranches;
      }

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
      if (!selectedYear || loadingYears || loadError) {
        setLoading(false);
        return;
      }

      const allowedBranches = (user.branches ?? []).map(normalizeBranch).filter(Boolean);
      let scopedBranches: string[] | null = ALL_BRANCH_ROLES.includes(user.role) ? null : allowedBranches;
      if (region === 'NORTH' || region === 'SOUTH') {
        const regionBranches = region === 'NORTH' ? NORTH_REGION : SOUTH_REGION;
        scopedBranches = scopedBranches
          ? scopedBranches.filter((assigned) => regionBranches.includes(assigned))
          : regionBranches;
      }

      let query = supabase
        .from('retailer_region_yearly')
        .select('branch, zone, year, ga_cnt, port_in, port_out, add_gara, incentive, postcode, city, province, region')
        .eq('year', Number(selectedYear))
        .order('branch', { ascending: true })
        .order('zone', { ascending: true })
        .order('province', { ascending: true })
        .order('city', { ascending: true })
        .order('postcode', { ascending: true })
        .order('region', { ascending: true });
      if (scopedBranches) query = query.in('branch', scopedBranches);
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
      if (cancelled) return;
      setRows(result);
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

  const filteredRows = useMemo(
    () => rows.filter((row) => !selectedYear || String(row.year) === selectedYear),
    [rows, selectedYear],
  );

  const totals = useMemo(() => filteredRows.reduce((result, row) => {
    NUMBER_FIELDS.forEach((field) => { result[field] += numberValue(row[field]); });
    return result;
  }, { ga_cnt: 0, port_in: 0, port_out: 0, add_gara: 0, incentive: 0 }), [filteredRows]);

  const cityPerformance = useMemo(() => {
    const grouped = new Map<string, number>();
    filteredRows.forEach((row) => {
      const city = row.city?.trim() || 'Unspecified city';
      grouped.set(city, (grouped.get(city) ?? 0) + numberValue(row.ga_cnt));
    });
    return [...grouped.entries()]
      .map(([city, ga_cnt]) => ({ city, ga_cnt }))
      .sort((a, b) => b.ga_cnt - a.ga_cnt)
      .slice(0, 10);
  }, [filteredRows]);

  const regionalPerformance = useMemo(() => {
    const grouped = new Map<string, { region: string; ga_cnt: number; port_in: number; port_out: number; incentive: number }>();
    filteredRows.forEach((row) => {
      const code = row.region?.trim().toUpperCase() || '';
      const name = regionLabel(code);
      const result = grouped.get(name) ?? { region: name, ga_cnt: 0, port_in: 0, port_out: 0, incentive: 0 };
      result.ga_cnt += numberValue(row.ga_cnt);
      result.port_in += numberValue(row.port_in);
      result.port_out += numberValue(row.port_out);
      result.incentive += numberValue(row.incentive);
      grouped.set(name, result);
    });
    return [...grouped.values()].sort((a, b) => b.ga_cnt - a.ga_cnt);
  }, [filteredRows]);

  const locationRows = useMemo(() => {
    const grouped = new Map<string, RegionMonthlyRow & { label: string }>();
    filteredRows.forEach((row) => {
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
      if (current.branch !== row.branch) current.branch = 'Multiple branches';
      if (current.zone !== row.zone) current.zone = 'Multiple zones';
      NUMBER_FIELDS.forEach((field) => { current[field] += numberValue(row[field]); });
      current.retailer_count += numberValue(row.retailer_count);
      grouped.set(key, current);
    });
    return [...grouped.values()]
      .filter((row) => [row.label, row.city, row.postcode, row.province, row.region, row.branch, row.zone]
        .some((value) => String(value ?? '').toLowerCase().includes(search.trim().toLowerCase())))
      .sort((a, b) => b.ga_cnt - a.ga_cnt);
  }, [filteredRows, geographyLevel, search]);

  const hasData = !loading && !loadError && filteredRows.length > 0;
  const metricLabel = METRICS.find((entry) => entry.key === mapMetric)?.label ?? 'Metric';

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#245bc1]">Field IQ / Geography</p>
            <h1 className="mt-2 text-2xl font-bold text-[#21264E]">Region & City Sales Analysis</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Explore activations, MNP activity, add-ons and incentives by Italian region, province, city and postcode.</p>
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Gross activations', value: totals.ga_cnt.toLocaleString() },
              { label: 'Port-ins', value: totals.port_in.toLocaleString() },
              { label: 'Port-outs', value: totals.port_out.toLocaleString() },
              { label: 'Incentive', value: `€${totals.incentive.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[#21264E]/10 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</p>
                <p className="mt-3 text-2xl font-bold text-[#21264E]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#21264E]">Best GA performing cities</h2>
                <p className="text-sm text-slate-500">Top cities by gross activations in {selectedYear}.</p>
              </div>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityPerformance} layout="vertical" margin={{ left: 10, right: 24 }}>
                    <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="city" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => Number(value).toLocaleString()} />
                    <Bar dataKey="ga_cnt" name="Gross activations" radius={[0, 6, 6, 0]}>
                      {cityPerformance.map((item, index) => <Cell key={item.city} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-[#21264E]">Regional performance</h2>
                <p className="text-sm text-slate-500">Sales and MNP activity by administrative region.</p>
              </div>
              <div className="max-h-[360px] overflow-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Region</th>
                      <th className="px-3 py-2 text-right">GA</th>
                      <th className="px-3 py-2 text-right">Port-in</th>
                      <th className="px-3 py-2 text-right">Port-out</th>
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
                        <td className="px-3 py-2.5 text-right">€{item.incentive.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className="rounded-3xl border border-[#21264E]/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#21264E]">MNP & sales activity heatmap</h2>
                <p className="text-sm text-slate-500">Province shading updates to the selected activity; hover for region and allocated coverage zone.</p>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-[#21264E]">
                Map metric
                <select value={mapMetric} onChange={(event) => setMapMetric(event.target.value as MetricKey)} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                  {METRICS.map((metric) => <option key={metric.key} value={metric.key}>{metric.label}</option>)}
                </select>
              </label>
            </div>
            <ProvinceSalesMap rows={filteredRows} metric={mapMetric} />
            <p className="mt-2 text-xs text-slate-500">Current map metric: {metricLabel}. Source zone allocation is shown for provinces with reported activity.</p>
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
                  <select value={geographyLevel} onChange={(event) => setGeographyLevel(event.target.value as GeographyLevel)} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <option value="province">Province</option>
                    <option value="city">City</option>
                    <option value="postcode">Postcode</option>
                  </select>
                </label>
                <label className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search location…" className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm sm:w-56" />
                </label>
              </div>
            </div>
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Province / region</th>
                    <th className="px-4 py-3">Branch / zone</th>
                    <th className="px-4 py-3 text-right">GA</th>
                    <th className="px-4 py-3 text-right">Port-in</th>
                    <th className="px-4 py-3 text-right">Port-out</th>
                    <th className="px-4 py-3 text-right">Add-ons</th>
                    <th className="px-4 py-3 text-right">Incentive</th>
                  </tr>
                </thead>
                <tbody>
                  {locationRows.map((row, index) => (
                    <tr key={`${row.label}-${row.city}-${row.province}-${row.branch}-${row.zone}-${index}`} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-[#21264E]">{row.label}</td>
                      <td className="px-4 py-3">{row.city || '—'}{row.postcode ? ` (${row.postcode})` : ''}</td>
                      <td className="px-4 py-3">{row.province?.trim().toUpperCase() || '—'} / {regionLabel(row.region)}</td>
                      <td className="px-4 py-3">{row.branch.replace('LMIT-HS-', '')} / {row.zone || '—'}</td>
                      <td className="px-4 py-3 text-right">{row.ga_cnt.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.port_in.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.port_out.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{row.add_gara.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">€{row.incentive.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                  {locationRows.length === 0 && (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">No matching locations.</td></tr>
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
