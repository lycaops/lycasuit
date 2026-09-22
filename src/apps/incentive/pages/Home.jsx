'use client';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@incentive/components/Layout';
import RetailerTable from '@incentive/components/RetailerTable';
import Dashboard from '@incentive/components/Dashboard';
import { useApp } from '@incentive/lib/AppContext';
import { Search, Database, Filter } from 'lucide-react';
import Loader from '@/components/Loader';

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
  } = useApp();
  const navigate = useNavigate();
  const [month, setMonth] = useState('');
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');

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
                  setBranchFilter('');
                  setZoneFilter('');
                  setGroupFilter('');
                }}
                className="w-full sm:w-auto rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#006AE0] bg-white sm:min-w-[180px]"
              >
                <option value="">{t('select_incentive_month')}</option>
                {months.map((value) => <option key={value} value={value}>{formatIncentiveMonth(value)}</option>)}
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

            {records.length > 0 && (
              <>
                <Dashboard records={filteredRecords} />
                <div>
                  <div className="sticky top-[env(safe-area-inset-top)] z-20 -mx-3 mb-3 border-b border-[#E4E9F1] bg-[#f4f7fb]/95 px-3 py-2.5 backdrop-blur-sm md:top-0 md:-mx-8 md:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold text-slate-700">
                        {t('search_retailer')} ({filteredRecords.length}{groupFilter ? ` / ${records.length}` : ''})
                      </h2>
                      <div className="inline-flex items-center gap-1 rounded-lg bg-[#21254F] p-1">
                        {groupOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setGroupFilter(opt.value)}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                              groupFilter === opt.value
                                ? 'bg-[#006AE0] text-white'
                                : 'text-white/75 hover:bg-white/10 hover:text-white'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <RetailerTable records={filteredRecords} onSelect={handleSelect} />
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
