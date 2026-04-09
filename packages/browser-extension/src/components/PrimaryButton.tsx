import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  fullWidth = false,
  style,
  ...props
}: PropsWithChildren<PrimaryButtonProps>) {
  return (
    <button
      {...props}
      style={{
        width: fullWidth ? "100%" : undefined,
        minHeight: 44,
        border: "none",
        borderRadius: 999,
        padding: "12px 20px",
        background: "var(--fortress-primary)",
        color: "var(--fortress-surface)",
        fontSize: 16,
        lineHeight: 1,
        fontFamily: "var(--fortress-font-body)",
        cursor: "pointer",
        boxShadow: "0 8px 20px rgba(210, 92, 27, 0.22)",
        transition: "transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
        ...style
      }}
    >
      {children}
    </button>
  );
}
