import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  fullWidth = false,
  style,
  disabled,
  ...props
}: PropsWithChildren<PrimaryButtonProps>) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        width: fullWidth ? "100%" : undefined,
        minHeight: 48,
        border: "none",
        borderRadius: 999,
        padding: "14px 22px",
        background: disabled ? "rgba(165, 145, 152, 0.4)" : "var(--fortress-primary)",
        color: "var(--fortress-surface)",
        fontSize: 15,
        lineHeight: 1,
        letterSpacing: 0.2,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "0 12px 32px rgba(210, 92, 27, 0.24)",
        transition: "transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease",
        opacity: disabled ? 0.72 : 1,
        ...style
      }}
    >
      {children}
    </button>
  );
}
