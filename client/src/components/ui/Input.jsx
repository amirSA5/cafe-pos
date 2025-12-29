export function Input({ label, value, onInput, placeholder, type = "text" }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#475569", fontWeight: 800 }}>
        {label}
      </span>
      <input
        value={value}
        onInput={(e) => onInput(e.target.value)}
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}
