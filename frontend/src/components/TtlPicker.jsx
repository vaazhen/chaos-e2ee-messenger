import { TimerIcon } from "./Icons";

const TTL_OPTIONS = [
  { label: "Off", value: null },
  { label: "5s", value: 5 },
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "5m", value: 300 },
  { label: "1h", value: 3600 },
  { label: "24h", value: 86400 },
];

export default function TtlPicker({ ttl, showTtl, ttlRef, onToggle, onSelect }) {
  return (
    <div className="inp-btn-wrap" ref={ttlRef}>
      <button
        type="button"
        className={`inp-icon-btn${ttl ? " active" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        title="Self-destruct timer"
      >
        <TimerIcon />
      </button>
      {showTtl && (
        <div className="ttl-popup" onClick={e => e.stopPropagation()}>
          {TTL_OPTIONS.map(opt => (
            <div
              key={opt.label}
              className={`ttl-option${ttl === opt.value ? " selected" : ""}`}
              onClick={() => onSelect(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { TTL_OPTIONS };
