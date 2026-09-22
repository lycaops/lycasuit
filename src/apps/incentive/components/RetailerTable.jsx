'use client';
import React, { useState } from "react";
import { useApp } from "@incentive/lib/AppContext";
import { formatCurrency, getNumber, getText } from "@incentive/lib/csvUtils";
import { ChevronRight } from "lucide-react";
import IncentiveGroupBadge from "./statement/IncentiveGroupBadge";

export default function RetailerTable({ onSelect, records: recs }) {
  const { t, lang, setSelectedRetailer, records: ctxRecords } = useApp();
  const records = recs || ctxRecords;
  const [limit, setLimit] = useState(25);

  const shown = records.slice(0, limit);

  const select = (row) => {
    setSelectedRetailer(row);
    if (onSelect) onSelect(row);
  };

  if (records.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {shown.map((r, i) => {
        const totalPaid = getNumber(r, "TOTAL PAID (SBT+BT+VOU)");
        return (
          <button
            key={r._id || i}
            type="button"
            onClick={() => select(r)}
            className="w-full rounded-[12px] border border-[#E4E9F1] bg-white p-4 text-left transition-colors hover:border-[#B9C6DB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006AE0]/40"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-bold text-slate-900 sm:text-[15px]">
                {getText(r, "RETAILER ID") || "—"}
              </span>
              <span className="shrink-0">
                <IncentiveGroupBadge group={r._incentiveGroup} />
              </span>
            </div>

            <p className="mt-1.5 truncate text-xs text-slate-500">
              {getText(r, "ACCMGRID") || "—"} · {getText(r, "HOTSPOTID") || "—"}
            </p>

            <div className="my-3 border-t border-[#E4E9F1]" />

            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">{t("total_paid")}</p>
                <p className="mt-0.5 truncate text-lg font-bold text-[#21254F]">
                  {totalPaid === null ? "—" : formatCurrency(totalPaid, lang)}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#006AE0] px-3.5 py-1.5 text-xs font-semibold text-white">
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