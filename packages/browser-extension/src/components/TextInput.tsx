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
          border: "none",
          borderBottom: "1px solid var(--fortress-line)",
          background: "transparent",
          padding: "12px 0",
          color: "var(--fortress-ink)",
          fontSize: 16,
          fontFamily: "var(--fortress-font-body)",
          outline: "none",
          ...props.style
        }}
      />
    </div>
  );
}
