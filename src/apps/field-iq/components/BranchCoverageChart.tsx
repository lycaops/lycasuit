'use client';
import React, { useMemo } from 'react';
import type { ZoneCoverageSummary } from '@fieldiq/types';

interface BranchCoverageChartProps {
  zoneSummaries: ZoneCoverageSummary[];
  selectedBranch?: string;
  selectedZone?: string;
}

export default function BranchCoverageChart({ zoneSummaries, selectedBranch, selectedZone }: BranchCoverageChartProps) {
  const showZoneWise = Boolean(selectedBranch && selectedBranch !== 'ALL');
  const showZoneDonut = Boolean(selectedZone && selectedZone !== 'ALL');
  const chartData = useMemo(() => {
    const map = new Map<string, { covered: number; notCovered: number; total: number; uao: number }>();

    zoneSummaries.forEach(summary => {
      const key = showZoneWise ? summary.zone : summary.branch.replace('LMIT-HS-', '');
      if (!map.has(key)) {
        map.set(key, { covered: 0, notCovered: 0, total: 0, uao: 0 });
      }
      const current = map.get(key)!;
      current.covered += summary.covered_retailers;
      current.notCovered += summary.not_covered_retailers;
      current.total += summary.total_retailers;
      current.uao += summary.uao;
    });

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      covered: data.covered,
      notCovered: data.notCovered,
      total: data.total,
      uao: data.uao,
    }));
  }, [zoneSummaries, showZoneWise]);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#21264E] md:text-lg">
        {showZoneDonut ? 'Zone-wise Coverage' : showZoneWise ? 'Zone-wise Coverage' : 'Branch-wise Coverage'}
        </h3>
        <div className="flex items-center gap-3 text-[11px] font-semibold text-[#21264E] md:text-xs">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#08DC7D]" />Covered</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#F28C28]" />Not Covered</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-[#1080FD]" />UAO</span>
        </div>
      </div>
      <div className="space-y-5">
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No coverage data available</p>
        ) : chartData.map((row) => {
          const total = Math.max(row.total, row.covered + row.notCovered, 1);
          const coveredWidth = Math.min(100, (row.covered / total) * 100);
          const notCoveredWidth = Math.min(100 - coveredWidth, (row.notCovered / total) * 100);
          const uaoPosition = Math.min(100, (row.uao / total) * 100);

          return (
            <div key={row.name} className="grid grid-cols-[minmax(92px,0.7fr)_minmax(0,3fr)_auto] items-center gap-2 md:grid-cols-[minmax(150px,0.8fr)_minmax(0,4fr)_auto] md:gap-4">
              <span className="truncate text-xs font-semibold text-[#21264E] md:text-sm" title={row.name}>{row.name}</span>
              <div className="relative h-7 rounded-md bg-[#E0E7F7]" aria-label={`${row.name}: ${row.total} total`}>
                <div className="absolute inset-y-0 left-0 rounded-l-md bg-[#08DC7D]" style={{ width: `${coveredWidth}%` }} />
                <div className="absolute inset-y-0 rounded-r-md bg-[#F28C28]" style={{ left: `${coveredWidth}%`, width: `${notCoveredWidth}%` }} />
                <div className="absolute -top-5 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-[#1080FD]" style={{ left: `${uaoPosition}%` }}>UAO {row.uao}</div>
                <div className="absolute inset-y-[-3px] w-0.5 bg-[#1080FD]" style={{ left: `calc(${uaoPosition}% - 1px)` }} />
              </div>
              <span className="min-w-[42px] text-right text-xs font-bold text-[#21264E] md:text-sm">{row.total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
