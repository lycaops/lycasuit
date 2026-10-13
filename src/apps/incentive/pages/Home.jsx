'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@incentive/components/Layout';
import RetailerTable from '@incentive/components/RetailerTable';
import Dashboard from '@incentive/components/Dashboard';
import { useApp } from '@incentive/lib/AppContext';
import { useAuth } from '@incentive/lib/AuthContext';
import { formatCurrency, formatNumber, formatPercent, getNumber, normalizePercent } from '@incentive/lib/csvUtils';
import { Search, Database, Filter, ArrowDownWideNarrow, ChevronDown } from 'lucide-react';
import Loader from '@/components/Loader';

const ZONE_DETAIL_FIELDS = [
  ['retailer_count', 'Retailers', 'count'],
  ['normal_retailer_count', 'Normal retailers', 'count'],
  ['special_retailer_count', 'Special retailers', 'count'],
  ['total_noofactivations', 'Total activations', 'count'],
  ['total_topup_less_6_portin', 'Port-in top-ups <= 6', 'count'],
  ['total_topup_great_6_portin', 'Port-in top-ups > 6', 'count'],
  ['total_topup_less_6', 'Top-ups <= 6', 'count'],
  ['total_topup_great_6', 'Top-ups > 6', 'count'],
  ['blocked_noofactivations', 'Blocked activations', 'count'],
  ['total_portout', 'Port-outs', 'count'],
  ['bundle1_comm', 'Bundle commission', 'currency'],
  ['quality_bonus_m_1', 'Quality bonus M-1', 'currency'],
  ['volume_bonus_m_1', 'Volume bonus M-1', 'currency'],
  ['portout_deduction', 'Port-out deduction', 'currency'],
  ['portin_comm', 'Port-in commission', 'currency'],
  ['onboarding_comm', 'Onboarding commission', 'currency'],
  ['nonhp_comm', 'Non-HP commission', 'currency'],
  ['gara_comm', 'GARA commission', 'currency'],
  ['usage_clawback', 'Usage clawback', 'currency'],
  ['usage_refund', 'Usage refund', 'currency'],
  ['t3ren_bonus', 'T3 renewal bonus', 'currency'],
  ['total_comm', 'Total commission', 'currency'],
  ['opening_balance', 'Opening balance', 'currency'],
  ['total_paid_sbt_bt_vou', 'Total paid', 'currency'],
  ['new_act_cnt', 'New activations count', 'count'],
  ['new_act_renewal_cnt', 'New activation renewals', 'count'],
  ['new_activations', 'New activations', 'count'],
  ['portin_act_cnt', 'Port-in activation count', 'count'],
  ['portin_act_renewal_cnt', 'Port-in activation renewals', 'count'],
  ['port_in', 'Port-ins', 'count'],
  ['total_bundle_act', 'Bundle activations', 'count'],
  ['bundle_act_not_eligible', 'Ineligible bundle activations', 'count'],
  ['t1_bonus', 'T1 bonus', 'currency'],
  ['t2_bonus', 'T2 bonus', 'currency'],
  ['t1_renewal', 'T1 renewals', 'count'],
  ['t2_renewal', 'T2 renewals', 'count'],
  ['usage_percentage_avg', 'Average usage percentage', 'percent'],
  ['fake_port_out_pct_avg', 'Average fake port-out percentage', 'percent'],
];

function formatIncentiveMonth(value) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;

  const [, year, month] = match;
  const monthName = new Date(Date.UTC(Number(year), Number(month) - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    timeZone: 'UTC',
  });
  return `${monthName}-${year.slice(-2)}`;
}

export default function Home() {
  const {
    t,
    lang,
    records,
    setRecords,
    setSelectedRetailer,
    setScheme,
    loadingRecords,
    loadRecords,
    recordsError,
    months,
    filterOptions,
    loadFilterOptions,
    zoneSummaries,
    loadingZoneSummaries,
    zoneSummariesError,
    loadZoneSummaries,
  } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentYear = String(new Date().getFullYear());
  const [month, setMonth] = useState('');
  const [query, setQuery] = useState('');
  const assignedBranch = user?.role === 'ASM'
    ? String(user.branches?.[0] || user.branch || '')
    : '';
  const [branchFilter, setBranchFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sortByTotalPaid, setSortByTotalPaid] = useState(false);
  const [expandedZones, setExpandedZones] = useState({});
  const currentYearMonths = months.filter((value) => value.startsWith(`${currentYear}-`));
  const monthZoneSummaries = zoneSummaries.filter((row) =>
    row.month === month && (!branchFilter || row.accmgrid === branchFilter) && (!zoneFilter || row.hotspotid === zoneFilter),
  );

  useEffect(() => {
    loadZoneSummaries(currentYear).catch((error) => console.error('Failed to load zone summaries:', error));
  }, [currentYear, loadZoneSummaries]);

  useEffect(() => {
    if (assignedBranch) setBranchFilter(assignedBranch);
  }, [assignedBranch]);

  const handleSelect = (row) => {
    if (row?._scheme) setScheme(row._scheme);
    setSelectedRetailer(row);
    navigate('/statement');
  };

  useEffect(() => {
    loadFilterOptions(month, branchFilter).catch((e) => console.error('Failed to load filter options:', e));
  }, [month, branchFilter, loadFilterOptions]);

  const runSearch = async () => {
    if (!month) return;
    await loadRecords({ month, retailerId: query, branch: branchFilter, zone: zoneFilter });
  };

  const hasBranchData = filterOptions.branches.length > 0;
  const hasZoneData = filterOptions.zones.length > 0;
  const showFilters = hasBranchData || hasZoneData;

  const groupOptions = [
    { value: '', label: t('incentive_group_all') },
    { value: 'normal', label: t('incentive_group_normal') },
    { value: 'special', label: t('incentive_group_special') },
  ];

  const filteredRecords = groupFilter
    ? records.filter((r) => r._incentiveGroup === groupFilter)
    : records;

  // Highest → lowest Total Paid. Retailers without a Total Paid value stay at the bottom.
  const sortedRecords = sortByTotalPaid
    ? [...filteredRecords].sort(
        (a, b) =>
          (getNumber(b, 'TOTAL PAID (SBT+BT+VOU)') ?? Number.NEGATIVE_INFINITY) -
          (getNumber(a, 'TOTAL PAID (SBT+BT+VOU)') ?? Number.NEGATIVE_INFINITY),
      )
    : filteredRecords;

  return (
    <Layout>
      <div className="p-3 pb-24 md:p-8 md:pb-8 max-w-7xl mx-auto space-y-4 md:space-y-6">
        {recordsError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3 text-sm text-red-700">
            <Database className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Failed to load data from Supabase</p>
              <p className="text-red-600 mt-0.5">{recordsError}</p>
              <p className="mt-2 text-red-600/80">
                Make sure your <code>VITE_SUPABASE_URL</code> and{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> env vars are set correctly and the SQL
                migration has been applied.
              </p>
            </div>
          </div>
        )}

        {loadingRecords && (
          <div className="lo-screen" style={{ '--lo-screen-bg': 'rgba(244, 247, 251, 0.75)' }}>
            <Loader size={64} weight={8} />
          </div>
        )}

        <>
          <>
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch gap-3">
              <select
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setRecords([]);
                  setQuery('');
                  setBranchFilter(assignedBranch);
                  setZoneFilter('');
                  setGroupFilter('');
                }}
                className="w-full sm:w-auto rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#006AE0] bg-white sm:min-w-[180px]"
                disabled={loadingZoneSummaries}
              >
                <option value="">{t('select_incentive_month')}</option>
                {currentYearMonths.map((value) => <option key={value} value={value}>{formatIncentiveMonth(value)}</option>)}
              </select>
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('search_retailer_id_placeholder')}
                  onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#006AE0] bg-white"
                />
              </div>
              <button
                onClick={runSearch}
                disabled={!month || loadingRecords}
                className="inline-flex w-full sm:w-auto items-center gap-2 justify-center rounded-lg bg-[#006AE0] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                <Search className="w-4 h-4" /> {t('search_retailer')}
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-1.5 text-sm text-slate-500 px-1 w-full sm:w-auto">
                  <Filter className="w-4 h-4" /> {t('filter_by')}
                </div>
                {hasBranchData && (
                  <select
                    value={branchFilter}
                    onChange={(e) => {
                      setBranchFilter(e.target.value);
                      setZoneFilter('');
                    }}
                    className="w-full sm:w-auto rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#006AE0] bg-white sm:min-w-[140px]"
                  >
                    <option value="">{t('all_branches')}</option>
                    {filterOptions.branches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                )}
                {hasZoneData && (
                  <select
                    value={zoneFilter}
                    onChange={(e) => setZoneFilter(e.target.value)}
                    className="w-full sm:w-auto rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#006AE0] bg-white sm:min-w-[140px]"
                  >
                    <option value="">{t('all_zones')}</option>
                    {filterOptions.zones.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                )}
                {(branchFilter || zoneFilter) && (
                  <button
                    onClick={() => {
                      setBranchFilter('');
                      setZoneFilter('');
                    }}
                    className="text-xs font-medium text-slate-500 hover:text-slate-700 hover:underline sm:ml-auto w-full sm:w-auto text-center sm:text-right"
                  >
                    {t('clear_filters')}
                  </button>
                )}
              </div>
            )}

            {month && monthZoneSummaries.length > 0 && (
              <Dashboard records={filteredRecords} summaryRows={monthZoneSummaries} />
            )}
            {zoneSummariesError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {zoneSummariesError}
              </div>
            )}
            {month && !loadingZoneSummaries && monthZoneSummaries.length > 0 && (
              <section aria-labelledby="zone-summary-heading" className="space-y-3">
                <h2 id="zone-summary-heading" className="text-sm font-semibold text-slate-700">{t('zone_month_summary')}</h2>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="min-w-[900px] w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">{t('branch')}</th>
                        <th className="px-4 py-3">{t('zone')}</th>
                        <th className="px-4 py-3 text-right">{t('total_retailers')}</th>
                        <th className="px-4 py-3 text-right">{t('activations')}</th>
                        <th className="px-4 py-3 text-right">{t('total_commission')}</th>
                        <th className="px-4 py-3 text-right">{t('total_bonuses')}</th>
                        <th className="px-4 py-3 text-right">{t('total_deductions')}</th>
                        <th className="px-4 py-3 text-right">{t('total_paid')}</th>
                        <th className="px-4 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthZoneSummaries.map((row) => {
                        const key = `${row.month}-${row.accmgrid}-${row.hotspotid}`;
                        const expanded = Boolean(expandedZones[key]);
                        return (
                          <React.Fragment key={key}>
                            <tr>
                              <td className="px-4 py-3 font-medium text-slate-800">{row.accmgrid || '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{row.hotspotid || '—'}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{Number(row.retailer_count || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{Number(row.total_noofactivations || 0).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(row.total_comm || 0), lang)}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(row.quality_bonus_m_1 || 0) + Number(row.volume_bonus_m_1 || 0) + Number(row.t3ren_bonus || 0), lang)}</td>
                              <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(Number(row.portout_deduction || 0) + Number(row.usage_clawback || 0), lang)}</td>
                              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCurrency(Number(row.total_paid_sbt_bt_vou || 0), lang)}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setExpandedZones((current) => ({ ...current, [key]: !current[key] }))}
                                  aria-expanded={expanded}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[#006AE0] hover:underline"
                                >
                                  <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                  {expanded ? 'Hide metrics' : 'All metrics'}
                                </button>
                              </td>
                            </tr>
                            {expanded && (
                              <tr>
                                <td colSpan={9} className="bg-slate-50 px-4 py-4">
                                  <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
                                    {ZONE_DETAIL_FIELDS.map(([field, label, kind]) => {
                                      const value = Number(row[field] || 0);
                                      const formatted = kind === 'currency'
                                        ? formatCurrency(value, lang)
                                        : kind === 'percent'
                                          ? formatPercent(normalizePercent(value))
                                          : formatNumber(value, lang);
                                      return (
                                        <div key={field} className="min-w-0">
                                          <dt className="text-[10px] uppercase text-slate-500">{label}</dt>
                                          <dd className="mt-0.5 truncate text-sm font-medium tabular-nums text-slate-800">{formatted}</dd>
                                        </div>
                                      );
                                    })}
                                  </dl>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {records.length > 0 && (
              <>
                <div>
                  <div className="sticky top-0 z-20 -mx-3 mb-3 border-b border-[#E4E9F1] bg-[#f4f7fb]/95 px-3 py-2.5 backdrop-blur-sm md:-mx-8 md:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-slate-700">
                        {t('search_retailer')} ({filteredRecords.length}{groupFilter ? ` / ${records.length}` : ''})
                      </h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSortByTotalPaid((current) => !current)}
                          aria-pressed={sortByTotalPaid}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                            sortByTotalPaid
                              ? 'border-[#21264E] bg-[#21264E] text-white'
                              : 'border-[#E4E9F1] bg-white text-[#21264E] hover:bg-[#21264E]/10'
                          }`}
                        >
                          <ArrowDownWideNarrow className="h-3.5 w-3.5" />
                          {t('sort_total_paid_desc')}
                        </button>
                        <div className="inline-flex items-center gap-1 rounded-lg border border-[#E4E9F1] bg-white p-1">
                          {groupOptions.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setGroupFilter(opt.value)}
                              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                groupFilter === opt.value
                                  ? 'bg-[#21264E] text-white'
                                  : 'text-[#21264E] hover:bg-[#21264E]/10'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <RetailerTable records={sortedRecords} onSelect={handleSelect} />
                  {filteredRecords.length === 0 && (
                    <div className="rounded-[12px] border border-[#E4E9F1] bg-white p-8 text-center text-sm text-slate-400">
                      {t('no_results')}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        </>
      </div>
    </Layout>
  );
}
