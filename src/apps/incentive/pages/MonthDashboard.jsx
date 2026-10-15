'use client';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@incentive/components/Layout';
import Dashboard from '@incentive/components/Dashboard';
import Loader from '@/components/Loader';
import { useApp } from '@incentive/lib/AppContext';
import { formatCurrency, formatNumber, formatPercent, normalizePercent } from '@incentive/lib/csvUtils';
import { Activity, ArrowRight, Building2, ChevronDown, MapPin, Users } from 'lucide-react';

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

function getMonthOptions(year, lang) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, index, 1));
    return {
      value: `${year}-${String(index + 1).padStart(2, '0')}`,
      label: new Intl.DateTimeFormat(lang === 'it' ? 'it-IT' : 'en-GB', { month: 'short', timeZone: 'UTC' }).format(date),
      fullLabel: new Intl.DateTimeFormat(lang === 'it' ? 'it-IT' : 'en-GB', { month: 'long', timeZone: 'UTC' }).format(date),
    };
  });
}

export default function MonthDashboard() {
  const {
    t,
    lang,
    months,
    selectedMonth,
    setSelectedMonth,
    setRecords,
    setSelectedRetailer,
    zoneSummaries,
    loadingZoneSummaries,
    zoneSummariesError,
    loadZoneSummaries,
  } = useApp();
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const monthOptions = getMonthOptions(currentYear, lang);
  const monthRows = zoneSummaries.filter((row) => row.month === selectedMonth);
  const [expandedZones, setExpandedZones] = useState({});

  useEffect(() => {
    if (selectedMonth && !selectedMonth.startsWith(`${currentYear}-`)) {
      setSelectedMonth('');
      return;
    }
    loadZoneSummaries(selectedMonth).catch((error) => console.error('Failed to load monthly zone details:', error));
  }, [currentYear, selectedMonth, setSelectedMonth, loadZoneSummaries]);

  const chooseMonth = (month) => {
    setSelectedMonth(month);
    setRecords([]);
    setSelectedRetailer(null);
    setExpandedZones({});
  };

  const openRetailerSearch = () => {
    if (selectedMonth) navigate('/retailer-search');
  };

  return (
    <Layout>
      <main className="mx-auto max-w-7xl space-y-6 px-3 pb-24 pt-5 md:px-8 md:pb-8">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#006AE0]">LycaMobile Italy</p>
            <h1 className="mt-1 text-2xl font-semibold text-[#21264e]">{t('incentive_dashboard_title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('incentive_dashboard_desc')} · {currentYear}</p>
          </div>
          <button
            type="button"
            onClick={openRetailerSearch}
            disabled={!selectedMonth}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#006AE0] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0058be] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {t('search_retailer')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </header>

        <section aria-labelledby="month-picker-title" className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="month-picker-title" className="text-sm font-semibold text-slate-800">{t('select_incentive_month')}</h2>
              <p className="mt-1 text-xs text-slate-500">{t('current_year_months')}</p>
            </div>
            {selectedMonth && <span className="text-sm font-semibold text-[#21264e]">{monthOptions.find((item) => item.value === selectedMonth)?.fullLabel}</span>}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {monthOptions.map((item) => {
              const available = months.includes(item.value);
              const active = selectedMonth === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => chooseMonth(item.value)}
                  aria-pressed={active}
                  className={`flex min-h-16 items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-[#006AE0] bg-[#006AE0] text-white shadow-sm'
                      : available
                        ? 'border-slate-200 bg-white text-slate-800 hover:border-[#006AE0] hover:bg-blue-50'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={`mt-0.5 block text-[10px] ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                      {available ? t('data_available') : t('no_data_yet')}
                    </span>
                  </span>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${active ? 'bg-white' : available ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </section>

        {!selectedMonth && (
          <div className="border-y border-slate-200 py-10 text-center">
            <h2 className="text-base font-semibold text-slate-800">{t('choose_month_title')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('choose_month_desc')}</p>
          </div>
        )}

        {selectedMonth && loadingZoneSummaries && (
          <div role="status" className="flex items-center gap-3 border-y border-slate-200 py-6 text-sm text-slate-600">
            <Loader size={24} weight={6} inherit />
            {t('loading_month_details')}
          </div>
        )}

        {selectedMonth && zoneSummariesError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {zoneSummariesError}
          </div>
        )}

        {selectedMonth && !loadingZoneSummaries && !zoneSummariesError && monthRows.length === 0 && (
          <div className="border-y border-slate-200 py-8 text-center text-sm text-slate-500">{t('no_month_details')}</div>
        )}

        {selectedMonth && !loadingZoneSummaries && monthRows.length > 0 && (
          <>
            <Dashboard summaryRows={monthRows} />
            <section aria-labelledby="zone-summary-heading" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 id="zone-summary-heading" className="text-sm font-semibold text-slate-800">{t('zone_month_summary')}</h2>
                <span className="text-xs text-slate-500">{monthRows.length} {t('zones')}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {monthRows.map((row) => {
                  const key = `${row.month}-${row.accmgrid}-${row.hotspotid}`;
                  const expanded = Boolean(expandedZones[key]);
                  const bonuses = Number(row.quality_bonus_m_1 || 0) + Number(row.volume_bonus_m_1 || 0) + Number(row.t3ren_bonus || 0);
                  const deductions = Number(row.portout_deduction || 0) + Number(row.usage_clawback || 0);
                  return (
                    <article key={key} className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                      <header className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-slate-500">
                            <Building2 className="h-3.5 w-3.5 text-[#006AE0]" /> {t('branch')}
                          </p>
                          <p className="mt-1 truncate text-sm font-medium text-slate-700">{row.accmgrid || '—'}</p>
                        </div>
                        <div className="flex min-w-0 items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-[#006AE0]">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{row.hotspotid || '—'}</span>
                        </div>
                      </header>

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <p className="text-[10px] font-semibold uppercase text-slate-500">{t('total_paid')}</p>
                        <p className="mt-0.5 truncate text-2xl font-semibold tabular-nums text-[#21264e]">
                          {formatCurrency(Number(row.total_paid_sbt_bt_vou || 0), lang)}
                        </p>
                      </div>

                      <dl className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100 py-3">
                        <div className="min-w-0 pr-2">
                          <dt className="flex items-center gap-1 text-[10px] uppercase text-slate-500"><Users className="h-3 w-3" /> {t('total_retailers')}</dt>
                          <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-slate-800">{formatNumber(Number(row.retailer_count || 0), lang)}</dd>
                        </div>
                        <div className="min-w-0 px-2">
                          <dt className="flex items-center gap-1 text-[10px] uppercase text-slate-500"><Activity className="h-3 w-3" /> {t('activations')}</dt>
                          <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-slate-800">{formatNumber(Number(row.total_noofactivations || 0), lang)}</dd>
                        </div>
                        <div className="min-w-0 pl-2">
                          <dt className="text-[10px] uppercase text-slate-500">{t('total_commission')}</dt>
                          <dd className="mt-1 truncate text-sm font-semibold tabular-nums text-slate-800">{formatCurrency(Number(row.total_comm || 0), lang)}</dd>
                        </div>
                      </dl>

                      <div className="flex items-center justify-between gap-3 py-3 text-xs">
                        <div className="min-w-0">
                          <span className="text-slate-500">{t('total_bonuses')} </span>
                          <span className="font-medium tabular-nums text-emerald-700">{formatCurrency(bonuses, lang)}</span>
                        </div>
                        <div className="min-w-0 text-right">
                          <span className="text-slate-500">{t('total_deductions')} </span>
                          <span className="font-medium tabular-nums text-rose-700">{formatCurrency(deductions, lang)}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedZones((current) => ({ ...current, [key]: !current[key] }))}
                        aria-expanded={expanded}
                        className="inline-flex w-full items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-[#006AE0] hover:text-[#0058be]"
                      >
                        {expanded ? t('hide_metrics') : t('all_metrics')}
                        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>

                      {expanded && (
                        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-3 sm:grid-cols-3">
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
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </Layout>
  );
}
