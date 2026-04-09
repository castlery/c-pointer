import type { PropsWithChildren } from "react";

interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export function Drawer({ open, title, subtitle, onClose, children }: PropsWithChildren<DrawerProps>) {
  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: 420,
        maxWidth: "100vw",
        height: "100vh",
        background: "var(--fortress-surface)",
        color: "var(--fortress-ink)",
        boxShadow: "-16px 0 36px rgba(60, 16, 30, 0.16)",
        transform: open ? "translateX(0)" : "translateX(110%)",
        transition: "transform 180ms ease",
        zIndex: 2147483647,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          padding: "24px 24px 20px",
          borderBottom: "1px solid rgba(165, 145, 152, 0.2)"
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16
          }}
        >
          <div>
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.1,
                fontFamily: "var(--fortress-font-heading)",
                color: "var(--fortress-ink)"
              }}
            >
              {title}
            </div>
            {subtitle ? (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: "var(--fortress-muted)",
                  fontFamily: "var(--fortress-font-body)"
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid rgba(165, 145, 152, 0.28)",
              background: "transparent",
              color: "var(--fortress-ink)",
              borderRadius: 999,
              width: 36,
              height: 36,
              cursor: "pointer",
              fontSize: 16
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div
        style={{
          padding: 24,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          flex: 1
        }}
      >
        {children}
      </div>
    </aside>
  );
}
