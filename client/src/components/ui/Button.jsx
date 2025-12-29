export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
}) {
  const base = {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    fontWeight: 800,
    lineHeight: "20px",
    background: "#fff",
    color: "#111827",
  };

  const styles =
    variant === "primary"
      ? {
          ...base,
          background: "#111827",
          color: "#fff",
          borderColor: "#111827",
        }
      : variant === "danger"
      ? {
          ...base,
          background: "#fff",
          color: "#b00020",
          borderColor: "#f1c3c8",
        }
      : { ...base };

  return (
    <button type={type} onClick={onClick} style={styles} disabled={disabled}>
      {children}
    </button>
  );
}
