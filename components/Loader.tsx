import type { CSSProperties } from "react";

type LoaderProps = { size?: number; weight?: number; label?: string; inherit?: boolean };

export default function Loader({ size = 96, weight = 6, label = "Loading", inherit = false }: LoaderProps) {
  return (
    <div
      className={inherit ? "lo lo--inherit" : "lo"}
      role="status"
      style={{ "--size": `${size}px`, "--sw": weight } as CSSProperties}
    >
      <svg viewBox="24 12 344 344" aria-hidden="true" focusable="false">
        <path className="ghost-blue" d="M35 346 L35 151 A50 50 0 0 1 69 103.6 L69 311 L283 311 A60 60 0 0 1 229 346 Z" />
        <path className="ghost-green" d="M79 304 L79 108 A84.5 84.5 0 0 1 248 108 L248 135 L272 134 A85 85 0 0 1 272 304 Z" />
        <path className="blue" pathLength={100} d="M35 346 L35 151 A50 50 0 0 1 69 103.6 L69 311 L283 311 A60 60 0 0 1 229 346 Z" />
        <path className="green" pathLength={100} d="M79 304 L79 108 A84.5 84.5 0 0 1 248 108 L248 135 L272 134 A85 85 0 0 1 272 304 Z" />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}