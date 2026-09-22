'use client';
import React, { useMemo } from "react";
import { useApp } from "@incentive/lib/AppContext";
import { computeDatasetStats } from "@incentive/lib/analysis";
import { formatCurrency } from "@incentive/lib/csvUtils";
import { Users, Euro, TrendingUp, TrendingDown, Wallet } from "lucide-react";

function StatCard({ icon: Icon, label, value, color, bg }) {
  const { lang } = useApp();
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] md:text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="text-base md:text-xl font-bold text-slate-800 mt-1 md:mt-1.5 truncate">{value}</p>
        </div>
        <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: bg }}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ records: recs }) {
  const { t, lang, records: ctxRecords } = useApp();
  const records = recs || ctxRecords;
  const stats = useMemo(() => computeDatasetStats(records), [records]);

  const fmt = (v) => (v === null ? "—" : formatCurrency(v, lang));

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard icon={Users} label={t("total_retailers")} value={stats.totalRetailers} color="#21264e" bg="#eef0f7" />
        <StatCard icon={Euro} label={t("total_commission")} value={fmt(stats.totalCommission)} color="#006AE0" bg="#e6f1fd" />
        <StatCard icon={TrendingUp} label={t("total_bonuses")} value={fmt(stats.totalBonuses)} color="#08dc7d" bg="#e3faf0" />
        <StatCard icon={TrendingDown} label={t("total_deductions")} value={fmt(stats.totalDeductions)} color="#46286e" bg="#f0e9f7" />
        <StatCard icon={Wallet} label={t("total_paid")} value={fmt(stats.totalPaid)} color="#21264e" bg="#eef0f7" />
      </div>
    </div>
  );
}