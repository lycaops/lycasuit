'use client';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@incentive/components/Layout';
import RetailerTable from '@incentive/components/RetailerTable';
import Loader from '@/components/Loader';
import { useApp } from '@incentive/lib/AppContext';
import { useAuth } from '@incentive/lib/AuthContext';
import { getNumber } from '@incentive/lib/csvUtils';
import { ArrowDownWideNarrow, ArrowLeft, Filter, Search } from 'lucide-react';

function formatIncentiveMonth(value, lang) {
  const match = /^(\d{4})-(\d{2})$/.exec(value || '');
  if (!match) return value;
  return new Intl.DateTimeFormat(lang === 'it' ? 'it-IT' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1)));
}

export default function RetailerSearch() {
  const {
    t,
    lang,
    selectedMonth,
    records,
    setRecords,
    setSelectedRetailer,
    setScheme,
    loadingRecords,
    loadRecords,
    recordsError,
    setRecordsError,
    filterOptions,
    loadFilterOptions,
  } = useApp();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const role = String(user?.role || '').toUpperCase();
  const isZoneManager = role === 'ZONE-MANAGER';
  const isFixedBranchRole = ['ASM', 'FSE'].includes(role);
  const [query, setQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [sortByTotalPaid, setSortByTotalPaid] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filterError, setFilterError] = useState('');
  const [searchValidationError, setSearchValidationError] = useState('');

  useEffect(() => {
    if (!selectedMonth) return;
    setFilterError('');
    loadFilterOptions(selectedMonth, branchFilter).catch((error) => {
      setFilterError(error?.message || 'Failed to load territory filters');
    });
  }, [selectedMonth, branchFilter, loadFilterOptions]);

  const effectiveBranchFilter = branchFilter || (
    !isZoneManager && filterOptions.branches.length === 1 ? filterOptions.branches[0] : ''
  );
  const effectiveZoneFilter = zoneFilter || (
    isZoneManager && filterOptions.zones.length === 1 ? filterOptions.zones[0] : ''
  );

  const resetResults = () => {
    setRecords([]);
    setRecordsError(null);
    setHasSearched(false);
    setSearchValidationError('');
  };

  const runSearch = async () => {
    if (!selectedMonth) return;
    if (!query.trim() && !effectiveBranchFilter && !effectiveZoneFilter) {
      setHasSearched(false);
      setSearchValidationError(t('search_criteria_required'));
      return;
    }
    setSearchValidationError('');
    setHasSearched(true);
    await loadRecords({
      month: selectedMonth,
      retailerId: query.trim() || null,
      branch: effectiveBranchFilter || null,
      zone: effectiveZoneFilter || null,
    });
  };

  const handleSelect = (row) => {
    if (row?._scheme) setScheme(row._scheme);
    setSelectedRetailer(row);
    navigate('/statement');
  };

  const groupOptions = [
    { value: '', label: t('incentive_group_all') },
    { value: 'normal', label: t('incentive_group_normal') },
    { value: 'special', label: t('incentive_group_special') },
  ];
  const filteredRecords = groupFilter
    ? records.filter((row) => row._incentiveGroup === groupFilter)
    : records;
  const sortedRecords = sortByTotalPaid
    ? [...filteredRecords].sort((a, b) =>
        (getNumber(b, 'TOTAL PAID (SBT+BT+VOU)') ?? Number.NEGATIVE_INFINITY)
        - (getNumber(a, 'TOTAL PAID (SBT+BT+VOU)') ?? Number.NEGATIVE_INFINITY))
    : filteredRecords;
  const showBranchFilter = !isZoneManager && !isFixedBranchRole && filterOptions.branches.length > 1;
  const showZoneFilter = !isZoneManager && filterOptions.zones.length > 1;
  const showFixedBranchScope = isFixedBranchRole || (!isZoneManager && filterOptions.branches.length === 1);
  const scopeDescription = isZoneManager
    ? `${t('zone')}: ${user?.zone_name || user?.zone || profile?.territory || '—'}`
    : isFixedBranchRole
      ? `${t('branch')}: ${user?.branch_name || user?.branches?.join(', ') || profile?.territory || '—'}`
      : profile?.territory || user?.branch_name || t('allocated_territory');

  return (
    <Layout>
      <main className="mx-auto max-w-7xl space-y-5 px-3 pb-24 pt-5 md:px-8 md:pb-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#006AE0]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {t('back_to_dashboard')}
            </button>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#006AE0]">{formatIncentiveMonth(selectedMonth, lang)}</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#21264e]">{t('retailer_search_title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('retailer_search_desc')}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{user?.role || t('allocated_territory')}</span>
            <span className="mx-2 text-slate-300">/</span>
            {scopeDescription}
          </div>
        </header>

        {!selectedMonth ? (
          <section className="border-y border-slate-200 py-12 text-center">
            <h2 className="text-base font-semibold text-slate-800">{t('choose_month_title')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('choose_month_desc')}</p>
            <button type="button" onClick={() => navigate('/')} className="mt-4 rounded-lg bg-[#006AE0] px-4 py-2.5 text-sm font-semibold text-white">
              {t('back_to_dashboard')}
            </button>
          </section>
        ) : (
          <>
            <section className="space-y-4 border-b border-slate-200 pb-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      resetResults();
                    }}
                    onKeyDown={(event) => { if (event.key === 'Enter') runSearch(); }}
                    placeholder={t('search_retailer_id_placeholder')}
                    className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#006AE0] focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={runSearch}
                  disabled={loadingRecords}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#006AE0] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#0058be] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Search className="h-4 w-4" /> {t('search_retailer')}
                </button>
              </div>

              {(showBranchFilter || showZoneFilter || isFixedBranchRole || isZoneManager) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 pr-2 text-xs font-semibold uppercase text-slate-500">
                    <Filter className="h-3.5 w-3.5" /> {t('filter_by')}
                  </span>
                  {showBranchFilter && (
                    <select
                      value={branchFilter}
                      onChange={(event) => {
                        setBranchFilter(event.target.value);
                        setZoneFilter('');
                        resetResults();
                      }}
                      aria-label={t('branch')}
                      className="min-w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#006AE0]"
                    >
                      <option value="">{t('all_branches')}</option>
                      {filterOptions.branches.map((branch) => <option key={branch} value={branch}>{branch}</option>)}
                    </select>
                  )}
                  {showZoneFilter && (
                    <select
                      value={zoneFilter}
                      onChange={(event) => {
                        setZoneFilter(event.target.value);
                        resetResults();
                      }}
                      aria-label={t('zone')}
                      className="min-w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#006AE0]"
                    >
                      <option value="">{t('all_zones')}</option>
                      {filterOptions.zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
                    </select>
                  )}
                  {(showFixedBranchScope || isZoneManager) && (
                    <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600">
                      {isZoneManager ? `${t('zone')}: ${effectiveZoneFilter || scopeDescription.split(': ').at(-1)}` : `${t('branch')}: ${effectiveBranchFilter || scopeDescription.split(': ').at(-1)}`}
                    </span>
                  )}
                  {(branchFilter || zoneFilter) && (
                    <button type="button" onClick={() => { setBranchFilter(''); setZoneFilter(''); resetResults(); }} className="px-2 py-2 text-xs font-medium text-slate-500 hover:text-slate-800">
                      {t('clear_filters')}
                    </button>
                  )}
                </div>
              )}
              {filterError && <p role="alert" className="text-sm text-red-700">{filterError}</p>}
              {searchValidationError && <p role="alert" className="text-sm text-red-700">{searchValidationError}</p>}
            </section>

            {recordsError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <p className="font-semibold">{recordsError}</p>
                {recordsError.toLowerCase().includes('timeout') && <p className="mt-1">{t('search_timeout_hint')}</p>}
              </div>
            )}
            {loadingRecords && (
              <div role="status" className="flex items-center gap-2 py-4 text-sm text-slate-600">
                <Loader size={22} weight={6} inherit /> {t('searching_retailers')}
              </div>
            )}

            {hasSearched && !loadingRecords && !recordsError && sortedRecords.length > 0 && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-800">
                    {t('search_results')} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{sortedRecords.length}</span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSortByTotalPaid((current) => !current)}
                      aria-pressed={sortByTotalPaid}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${sortByTotalPaid ? 'border-[#21264e] bg-[#21264e] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                    >
                      <ArrowDownWideNarrow className="h-3.5 w-3.5" /> {t('sort_total_paid_desc')}
                    </button>
                    <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
                      {groupOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setGroupFilter(option.value)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium ${groupFilter === option.value ? 'bg-[#21264e] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <RetailerTable records={sortedRecords} onSelect={handleSelect} />
              </section>
            )}
            {hasSearched && !loadingRecords && !recordsError && sortedRecords.length === 0 && (
              <div className="border-y border-slate-200 py-10 text-center">
                <p className="text-sm font-semibold text-slate-700">{t('no_results')}</p>
              </div>
            )}
          </>
        )}
      </main>
    </Layout>
  );
}
