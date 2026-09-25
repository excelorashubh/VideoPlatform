"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../../../lib/api";

const adminNav = [
  { label: "Dashboard", href: "/admin", group: "Overview" },
  { label: "Creator Dashboard", href: "/creator", group: "Overview" },
  { label: "Users", href: "/admin/users", group: "Platform" },
  { label: "Creators", href: "/admin/creators", group: "Platform" },
  { label: "Content", href: "/admin/content", group: "Platform" },
  { label: "Moderation", href: "/admin/moderation", group: "Platform" },
  { label: "Reports", href: "/admin/reports", group: "Platform" },
  { label: "Uploads", href: "/admin/uploads", group: "Operations" },
  { label: "Processing", href: "/admin/processing", group: "Operations" },
  { label: "Analytics", href: "/admin/analytics", group: "Business" },
  { label: "Subscriptions", href: "/admin/subscriptions", group: "Business" },
  { label: "Monetization", href: "/admin/monetization", group: "Business" },
  { label: "Storage", href: "/admin/storage", group: "System" },
  { label: "Settings", href: "/admin/settings", group: "System" },
  { label: "Audit Logs", href: "/admin/audit-logs", group: "System" }
] as const;

const sections = [
  { key: "Overview", items: adminNav.filter((item) => item.group === "Overview") },
  { key: "Platform", items: adminNav.filter((item) => item.group === "Platform") },
  { key: "Operations", items: adminNav.filter((item) => item.group === "Operations") },
  { key: "Business", items: adminNav.filter((item) => item.group === "Business") },
  { key: "System", items: adminNav.filter((item) => item.group === "System") }
];

function AdminNavIcon({ label }: { label: string }) {
  const paths: Record<string, string> = {
    Dashboard: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    "Creator Dashboard": "M5 5h14v14H5zM8 15v-3m4 3V9m4 6v-5",
    Users: "M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-3A3.5 3.5 0 0 0 6 18.5V20M11 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm5-5a2.5 2.5 0 0 1 0 5",
    Creators: "M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z",
    Content: "M4 6h16v12H4zM8 10l4 2-4 2v-4Z",
    Moderation: "M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z",
    Reports: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
    Uploads: "M12 16V5m0 0 4 4m-4-4-4 4M5 19h14",
    Processing: "M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1M7.7 16.3l-2.1 2.1",
    Analytics: "M5 19V9m7 10V5m7 14v-7M4 20h16",
    Subscriptions: "M4 7h16v12H4zM8 7V5h8v2M9 12h6",
    Monetization: "M12 3v18M16 7.5c0-1.4-1.8-2.5-4-2.5S8 6.1 8 7.5 9.8 10 12 10s4 1.1 4 2.5-1.8 2.5-4 2.5-4-1.1-4-2.5",
    Storage: "M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2Zm0 0v6c0 1.1 3.6 2 8 2s8-.9 8-2V6m-16 6v6c0 1.1 3.6 2 8 2s8-.9 8-2v-6",
    Settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    "Audit Logs": "M6 4h12v16H6zM9 8h6M9 12h6M9 16h4"
  };

  return <svg className="admin-nav-item__icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[label] ?? paths.Dashboard} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    let active = true;

    async function guard() {
      try {
        const user = await getCurrentUser();
        const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
        if (!isAdmin) {
          router.replace("/");
          return;
        }
      } catch {
        if (typeof window !== "undefined") {
          localStorage.removeItem("gvp_session_token");
          localStorage.removeItem("gvp_user");
        }
        router.replace("/auth");
        return;
      }

      if (active) {
        setReady(true);
      }
    }

    void guard();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <div className={`admin-console ${sidebarCollapsed ? "admin-console--collapsed" : ""}`}>
      <aside className={`admin-sidebar ${sidebarOpen ? "admin-sidebar--open" : ""}`} aria-label="Administration navigation">
        <div className="admin-sidebar__brand">
          <div className="admin-brand-mark">G</div>
          <div>
            <p>GVP</p>
            <span>ADMIN CONSOLE</span>
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.key} className="admin-sidebar__section">
            <p className="admin-sidebar__label">{section.key}</p>
            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href === "/admin" && pathname === "/admin");
              return (
                <Link key={item.href} href={item.href} className={`admin-nav-item ${isActive ? "is-active" : ""}`} onClick={() => setSidebarOpen(false)}>
                  <AdminNavIcon label={item.label} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="admin-sidebar__status">
          <span className="admin-sidebar__status-dot" />
          <div>
            <strong>System Operational</strong>
            <small>Super Admin</small>
          </div>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <div className="admin-header__left">
            <button type="button" className="admin-header__toggle" aria-label="Toggle sidebar" aria-expanded={sidebarOpen || !sidebarCollapsed} onClick={() => {
              if (window.matchMedia("(max-width: 900px)").matches) setSidebarOpen((value) => !value);
              else setSidebarCollapsed((value) => !value);
            }}>
              ☰
            </button>
            <div>
              <p className="admin-kicker">Platform Controls</p>
              <h1>{pathname === "/admin" ? "Overview" : adminNav.find((item) => item.href === pathname)?.label ?? "Admin"}</h1>
            </div>
          </div>

          <div className="admin-header__right">
            <div className="admin-header__search">
              <span>⌕</span>
              <input aria-label="Search platform" placeholder="Search platform" />
            </div>
            <button type="button" className="admin-header__icon" aria-label="Notifications">🔔</button>
            <button type="button" className="admin-header__profile">
              <span>SA</span>
              <strong>Super Admin</strong>
            </button>
          </div>
        </header>

        <main className="admin-content">
          {ready ? children : <div className="admin-empty-state">Checking permissions…</div>}
        </main>
      </div>
    </div>
  );
}
