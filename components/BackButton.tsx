"use client";

export default function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--accent)";
        e.currentTarget.style.color = "var(--accent-text)";
        e.currentTarget.style.borderColor = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--surface-2)";
        e.currentTarget.style.color = "var(--text)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
      style={{
        display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
        fontSize: 12, fontWeight: 600, color: "var(--text)",
        background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: 999, padding: "7px 14px",
        cursor: "pointer", transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
      }}
    >
      <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.5 4.5 6 10l6.5 5.5" />
      </svg>
      Back
    </button>
  );
}
