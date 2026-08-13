export default function IconButton({ className = "", type = "button", children, ...props }) {
  return (
    <button type={type} className={`icon-btn${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </button>
  );
}
