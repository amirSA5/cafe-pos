export function InfoCard({ label, value }) {
  return (
    <div
      style={{
        border: "1px solid #eef0f3",
        borderRadius: 14,
        padding: 12,
        background: "#fff",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
        {label}
      </div>
      <div style={{ fontWeight: 950, marginTop: 6, color: "#0f172a" }}>
        {value}
      </div>
    </div>
  );
}
