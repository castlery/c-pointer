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
        width: 468,
        maxWidth: "100vw",
        height: "100vh",
        background: "linear-gradient(180deg, rgba(251, 249, 244, 0.98) 0%, rgba(247, 242, 238, 0.98) 100%)",
        color: "var(--fortress-ink)",
        borderLeft: "1px solid rgba(165, 145, 152, 0.22)",
        boxShadow: "-24px 0 60px rgba(60, 16, 30, 0.14)",
        backdropFilter: "blur(18px)",
        transform: open ? "translateX(0)" : "translateX(110%)",
        transition: "transform 180ms ease, box-shadow 180ms ease",
        zIndex: 2147483647,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          padding: "20px 24px 18px",
          borderBottom: "1px solid rgba(165, 145, 152, 0.16)"
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
                fontSize: 12,
                lineHeight: 1,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: "var(--fortress-muted)",
                marginBottom: 10
              }}
            >
              New Agent
            </div>
            <div
              style={{
                fontSize: 28,
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
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: "var(--fortress-muted)",
                  maxWidth: 320
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid rgba(165, 145, 152, 0.22)",
              background: "rgba(255,255,255,0.58)",
              color: "var(--fortress-ink)",
              borderRadius: 999,
              width: 38,
              height: 38,
              cursor: "pointer",
              fontSize: 16,
              backdropFilter: "blur(12px)"
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div
        style={{
          padding: 20,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flex: 1
        }}
      >
        {children}
      </div>
    </aside>
  );
}
