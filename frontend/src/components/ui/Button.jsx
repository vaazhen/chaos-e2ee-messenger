export default function Button({
  variant = "primary",
  danger = false,
  full = false,
  className = "",
  type = "button",
  children,
  ...props
}) {
  const classes = [
    variant === "secondary" ? "btn-sec" : "btn-pri",
    variant === "ghost" ? "btn-ghost" : "",
    danger ? "danger-pri" : "",
    full ? "full" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
