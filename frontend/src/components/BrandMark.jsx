export default function BrandMark({ size = 40, className = "" }) {
  return (
    <span
      className={`brand-mark${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      aria-hidden="true"
    >
      C
    </span>
  );
}
