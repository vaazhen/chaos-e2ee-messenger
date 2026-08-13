export default function TextField({
  multiline = false,
  className = "",
  ...props
}) {
  const classes = `field-inp${className ? ` ${className}` : ""}`;
  if (multiline) {
    return <textarea className={classes} {...props} />;
  }
  return <input className={classes} {...props} />;
}
