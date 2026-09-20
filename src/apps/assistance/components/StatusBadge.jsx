'use client';
import React from 'react';

const STATUS_STYLES = {
  'Open': { backgroundColor: '#245bc1', color: '#ffffff', borderColor: '#7fa8ef' },
  'In Progress': { backgroundColor: '#0369a1', color: '#ffffff', borderColor: '#38bdf8' },
  'Pending': { backgroundColor: '#75653a', color: '#ffffff', borderColor: '#b9a66a' },
  'Completed': { backgroundColor: '#15803d', color: '#ffffff', borderColor: '#4ade80' },
  'Resolved': { backgroundColor: '#15803d', color: '#ffffff', borderColor: '#4ade80' },
  'Closed': { backgroundColor: '#475569', color: '#ffffff', borderColor: '#94a3b8' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { backgroundColor: '#475569', color: '#ffffff', borderColor: '#94a3b8' };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={style}
    >
      {status}
    </span>
  );
}