'use client';
import React from 'react';

const URGENCY_STYLES = {
  'Many Customers': { backgroundColor: '#b91c1c', color: '#ffffff', borderColor: '#fca5a5' },
  'Few Customers': { backgroundColor: '#c2410c', color: '#ffffff', borderColor: '#fdba74' },
  'Single customers': { backgroundColor: '#7c3aed', color: '#ffffff', borderColor: '#c4b5fd' },
  'No Customer Impact': { backgroundColor: '#0f766e', color: '#ffffff', borderColor: '#5eead4' },
};

export default function UrgencyBadge({ level }) {
  const style = URGENCY_STYLES[level] || { backgroundColor: '#475569', color: '#ffffff', borderColor: '#94a3b8' };
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border"
      style={style}
    >
      {level}
    </span>
  );
}