import type { InputHTMLAttributes } from "react";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: "100%"
      }}
    >
      <input
        {...props}
        style={{
          width: "100%",
          minHeight: 52,
          border: "1px solid rgba(190, 190, 190, 0.72)",
          borderRadius: 18,
          background: "rgba(255,255,255,0.86)",
          padding: "0 16px",
          color: "var(--fortress-ink)",
          fontSize: 15,
          lineHeight: 1.2,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.32)",
          outline: "none",
          ...props.style
        }}
      />
    </div>
  );
}
