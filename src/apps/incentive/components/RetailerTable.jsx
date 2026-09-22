'use client';
import React, { useState } from "react";
import { useApp } from "@incentive/lib/AppContext";
import { formatCurrency, getNumber, getText } from "@incentive/lib/csvUtils";
import { AlertTriangle, ChevronRight } from "lucide-react";
import IncentiveGroupBadge from "./statement/IncentiveGroupBadge";

// Same convention as lib/analysis.js: null when none of the components exist.
function sumAmounts(values) {
  const present = values.filter((value) => value !== null && value !== undefined);
  if (present.length === 0) return null;
  return present.reduce((total, value) => total + value, 0);
}

export default function RetailerTable({ onSelect, records: recs }) {
  const { t, lang, setSelectedRetailer, records: ctxRecords } = useApp();
  const records = recs || ctxRecords;
  const [limit, setLimit] = useState(25);

  const shown = records.slice(0, limit);
  const cfmt = (value) => (value === null ? "—" : formatCurrency(value, lang));

  const select = (row) => {
    setSelectedRetailer(row);
    if (onSelect) onSelect(row);
  };

  if (records.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3">
      {shown.map((r, i) => {
        const totalPaid = getNumber(r, "TOTAL PAID (SBT+BT+VOU)");
        // Desktop (web view) detail: New Activation Bonus = BUNDLE1_COMM
        const newActivationBonus = getNumber(r, "BUNDLE1_COMM");
        // Total Port-in Bonus = Port-in + GARA
        const portInBonus = sumAmounts([
          getNumber(r, "PORTIN_COMM"),
          getNumber(r, "GARA_COMM"),
        ]);
        // Total Deductions = Port-out deductions + Usage
        const totalDeductions = sumAmounts([
          getNumber(r, "PORTOUT DEDUCTION"),
          getNumber(r, "USAGE_CLAWBACK"),
        ]);
        // Renewal rate of the new activations (same formula as lib/analysis.js)
        const newActCount = getNumber(r, "NEW_ACT_CNT");
        const newActRenewals = getNumber(r, "NEW_ACT_RENEWAL_CNT");
        const renewalRate =
          newActCount !== null && newActCount > 0 && newActRenewals !== null
            ? (newActRenewals / newActCount) * 100
            : null;
        const belowRenewalThreshold = renewalRate !== null && renewalRate < 30;
        return (
          <button
            key={r._id || i}
            type="button"
            onClick={() => select(r)}
            className="w-full rounded-[12px] border border-[#E4E9F1] bg-white px-4 py-3 text-left transition-colors hover:border-[#B9C6DB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006AE0]/40"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-bold text-slate-900 sm:text-[15px]">
                {getText(r, "RETAILER ID") || "—"}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {belowRenewalThreshold && (
                  <span className="hidden items-center gap-1 rounded-full bg-[#fdeae3] px-2.5 py-1 text-[10px] font-semibold text-[#b04a30] md:inline-flex">
                    <AlertTriangle className="h-3 w-3" />
                    {`${t("renewal_rate")}: ${renewalRate.toFixed(1)}% — ${t("renewal_below_30")}`}
                  </span>
                )}
                <IncentiveGroupBadge group={r._incentiveGroup} />
              </span>
            </div>

            <p className="mt-1 truncate text-xs text-slate-500">
              {getText(r, "ACCMGRID") || "—"} · {getText(r, "HOTSPOTID") || "—"}
            </p>

            <div className="my-2 border-t border-[#E4E9F1]" />

            {/* Desktop (web view) shows every figure in one row; mobile keeps Total Paid + View Statement */}
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="hidden min-w-0 md:block">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">{t("new_activation_bonus")}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[#0f9d63]">{cfmt(newActivationBonus)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">{t("total_paid")}</p>
                <p className="mt-0.5 truncate text-base font-bold text-[#21254F]">
                  {cfmt(totalPaid)}
                </p>
              </div>
              <div className="hidden min-w-0 md:block">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t("total_port_in_bonus")} <span className="normal-case">{t("port_in_gara_detail")}</span>
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[#0f9d63]">{cfmt(portInBonus)}</p>
              </div>
              <div className="hidden min-w-0 md:block">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  {t("total_deductions")} <span className="normal-case">{t("portout_usage_detail")}</span>
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-[#46286e]">{cfmt(totalDeductions)}</p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#006AE0] px-3 py-1 text-xs font-semibold text-white">
                {t("view_statement")}
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </button>
        );
      })}
      {records.length > limit && (
        <div className="col-span-full pt-1 text-center">
          <button
            onClick={() => setLimit(limit + 25)}
            className="text-sm text-[#006AE0] font-medium hover:underline"
          >
            +25
          </button>
        </div>
      )}
    </div>
  );
}