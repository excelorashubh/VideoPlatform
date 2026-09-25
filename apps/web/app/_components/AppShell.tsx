"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCreatorApplication, getCurrentUser, getStoredSessionToken, getStoredUser, logoutUser, type ApiUser, type CreatorApplicationResponse } from "../../lib/api";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  hidden?: boolean;
  disabled?: boolean;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

type HeaderPopup = "create" | "notifications" | null;

type HeaderNotification = {
  id: string;
  type: "subscriber" | "comment" | "video" | "live";
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  href: string;
};

const initialNotifications: HeaderNotification[] = [
  { id: "notification-1", type: "subscriber", title: "New subscriber", message: "Ragx Shubh Gaming subscribed to your channel", createdAt: "2 minutes ago", read: false, href: "/studio" },
  { id: "notification-2", type: "comment", title: "New comment", message: "Someone commented on your latest video", createdAt: "15 minutes ago", read: false, href: "/notifications" },
  { id: "notification-3", type: "video", title: "New video from GVP Editorial", message: "A channel you follow just published a video", createdAt: "1 hour ago", read: false, href: "/watch/editorial-latest" },
  { id: "notification-4", type: "live", title: "Live session starting soon", message: "Join the GVP Music room tonight", createdAt: "3 hours ago", read: true, href: "/live" }
];

function IconHome({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-7h-5v7H5a1 1 0 0 1-1-1v-8.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconShorts({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="7" y="3.5" width="10" height="17" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10 8.5 15 12l-5 3.5v-7Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconSubscriptions({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M4 8.5h16M6 6h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="m10 11 5 3-5 3v-6Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function IconUser({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 18.5c1.4-2.5 4-3.8 7-3.8s5.6 1.3 7 3.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconHistory({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPlaylist({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M4 7h10M4 12h10M4 17h7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M17 9.5v7M13.5 13h7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconVideo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="3.5" y="6" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m15.5 10 5-3v10l-5-3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7v5l3 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLike({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M8.5 10.5V19H5.5A1.5 1.5 0 0 1 4 17.5v-5A1.5 1.5 0 0 1 5.5 11H8.5Zm0 0 3.6-6.1A1.6 1.6 0 0 1 13.5 4c.9 0 1.6.8 1.6 1.8v2.2h3.8A2.8 2.8 0 0 1 20.7 10l-1.2 6.2a2.4 2.4 0 0 1-2.4 1.9H8.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSearch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 2.5v5m0 9v5M4.5 12h5m9 0h5M6.5 6.5l3.5 3.5m4 4 3.5 3.5M17.5 6.5l-3.5 3.5m-4 4-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconStudio({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M6 8.5A2.5 2.5 0 0 1 8.5 6h7A2.5 2.5 0 0 1 18 8.5v9A2.5 2.5 0 0 1 15.5 20h-7A2.5 2.5 0 0 1 6 17.5v-9Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 10h6M9 14h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconUpload({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 16V5m0 0 4 4m-4-4-4 4M5 18.5v.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M5 18V9m7 9V5m7 13v-8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M4 19h16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconMenu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconMic({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 11.5a7 7 0 0 0 14 0M12 18.5V21M8 21h8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconPlus({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBell({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M7.5 10.5a4.5 4.5 0 1 1 9 0v3.5l1.8 3.5H5.7l1.8-3.5v-3.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M10 18.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function NotificationTypeIcon({ type }: { type: HeaderNotification["type"] }) {
  if (type === "live") return <IconBell className="nav-svg" />;
  if (type === "video") return <IconVideo className="nav-svg" />;
  if (type === "comment") return <IconPlaylist className="nav-svg" />;
  return <IconUser className="nav-svg" />;
}

const navigationConfig: NavSection[] = [
  {
    label: "Primary",
    items: [
      { label: "Home", href: "/", icon: IconHome },
      // { label: "Search", href: "/search", icon: IconSearch },
      { label: "Shorts", href: "/shorts", icon: IconShorts },
      { label: "Subscriptions", href: "/subscriptions", icon: IconSubscriptions }
    ]
  },
  {
    label: "You",
    items: [
      { label: "Your channel", href: "/channel/gvp-editorial", icon: IconUser },
      { label: "History", href: "/history", icon: IconHistory },
      { label: "Playlists", href: "/playlists", icon: IconPlaylist },
      { label: "Your videos", href: "/studio/content", icon: IconVideo },
      { label: "Watch later", href: "/playlists/watch-later", icon: IconClock },
      { label: "Liked videos", href: "/playlists/liked", icon: IconLike, hidden: true }
    ]
  },
  {
    label: "Explore",
    items: [
      { label: "Trending", href: "/trending", icon: IconSpark },
      { label: "Music", href: "/music", icon: IconSpark },
      { label: "Gaming", href: "/gaming", icon: IconSpark },
      { label: "Live", href: "/live", icon: IconSubscriptions },
      { label: "Sports", href: "/sports", icon: IconSpark }
    ]
  },
  {
    label: "Creator",
    items: [
      { label: "Creator Studio", href: "/studio", icon: IconStudio },
      { label: "Upload", href: "/studio/upload", icon: IconUpload },
      { label: "Analytics", href: "/studio/analytics", icon: IconChart }
    ]
  }
];

type AppShellProps = {
  children: React.ReactNode;
  active?: string;
  eyebrow?: string;
  title?: string;
};

export function AppShell({ children, active, eyebrow = "Global Video Platform", title }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [creatorApplication, setCreatorApplication] = useState<CreatorApplicationResponse | null>(null);
  const [headerPopup, setHeaderPopup] = useState<HeaderPopup>(null);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread">("all");
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const headerPopupRef = useRef<HTMLDivElement>(null);

  const displayName = user?.displayName ?? "GVP Viewer";
  const userHandle = user ? `@${displayName.toLowerCase().replace(/[^a-z0-9]+/g, "")}` : "@gvp";
  const profileInitials = user
    ? displayName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "GV"
    : "GV";

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  useEffect(() => {
    if (!user || !getStoredSessionToken()) {
      setCreatorApplication(null);
      return;
    }

    let active = true;
    void Promise.all([getCurrentUser(), getCreatorApplication()]).then(([currentUser, application]) => {
      if (!active) return;
      setUser(currentUser);
      setCreatorApplication(application);
      localStorage.setItem("gvp_user", JSON.stringify(currentUser));
    }).catch(() => {
      if (active) setCreatorApplication(null);
    });

    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!accountOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [accountOpen]);

  useEffect(() => {
    if (!headerPopup) return;

    function handlePointerDown(event: PointerEvent) {
      if (!headerPopupRef.current?.contains(event.target as Node)) {
        setHeaderPopup(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setHeaderPopup(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [headerPopup]);

  function toggleHeaderPopup(popup: Exclude<HeaderPopup, null>) {
    setAccountOpen(false);
    setHeaderPopup((current) => current === popup ? null : popup);
  }

  function markNotificationRead(id: string) {
    setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read: true } : notification));
  }

  function markAllNotificationsRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await logoutUser();
    } finally {
      setUser(null);
      setAccountOpen(false);
      setLoggingOut(false);
      router.push("/auth");
      router.refresh();
    }
  }

  function handleNavigationToggle() {
    if (window.matchMedia("(max-width: 900px)").matches) {
      setMobileOpen((value) => !value);
      return;
    }

    setCollapsed((value) => !value);
  }

  const isActive = useMemo(() => {
    return (href: string) => {
      const target = active ?? href;
      if (href === "/") {
        return pathname === "/" || active === "/";
      }
      return pathname === href || pathname.startsWith(`${href}/`) || active === href;
    };
  }, [active, pathname]);

  const showAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const showCreatorSetup = Boolean(
    user && user.role !== "CREATOR" && user.role !== "ADMIN"
  );
  const creatorApplicationStarted = creatorApplication?.application?.status === "SUBMITTED";

  const renderNavItem = (item: NavItem) => {
    if (item.hidden) return null;

    const Icon = item.icon;
    const activeClass = isActive(item.href) ? "nav-link active" : "nav-link";
    const navContents = (
      <>
        <span className="nav-icon"><Icon className="nav-svg" /></span>
        {!collapsed ? <span className="nav-label">{item.label}</span> : null}
      </>
    );

    if (item.disabled) {
      return (
        <div key={item.href} className="nav-link nav-disabled" aria-disabled="true" title={item.label}>
          {navContents}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={activeClass}
        aria-current={isActive(item.href) ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        onClick={() => setMobileOpen(false)}
      >
        {navContents}
      </Link>
    );
  };

  return (
    <>
      <div className={`nav-backdrop ${mobileOpen ? "visible" : ""}`} aria-hidden={!mobileOpen} onClick={() => setMobileOpen(false)} />
      <main className={`shell ${collapsed ? "sidebar-collapsed" : ""}`}>
        <aside className={`sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-open" : ""}`} aria-label="Sidebar navigation">
          <div className="sidebar-nav-scroll">
            {navigationConfig.map((section) => (
              <nav key={section.label} aria-label={section.label} className="nav-section">
                {!collapsed ? <p className="eyebrow">{section.label}</p> : null}
                {section.items.map(renderNavItem)}
              </nav>
            ))}
          </div>
        </aside>

        <section className="content">
          <header className="topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="topbar-menu-button"
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={handleNavigationToggle}
              >
                <IconMenu className="menu-icon" />
              </button>
              <Link className="mark topbar-mark" href="/" onClick={() => setMobileOpen(false)}>
                <span>G</span>
                <strong>GVP</strong>
              </Link>
            </div>

            <div className="topbar-search-wrap">
              <div className="topbar-search">
                <span className="search-icon"><IconSearch className="nav-svg" /></span>
                <input aria-label="Search videos" placeholder="Search videos, creators, and live sessions" />
                <button type="button" className="mic-button" aria-label="Voice search">
                  <IconMic className="nav-svg" />
                </button>
              </div>
            </div>

            <div className="topbar-actions" ref={headerPopupRef}>
              <div className="account-menu">
                <button type="button" className="create-button" aria-label="Create" aria-expanded={headerPopup === "create"} onClick={() => toggleHeaderPopup("create")}>
                  <IconPlus className="nav-svg" />
                  <span>Create</span>
                </button>
                {headerPopup === "create" ? (
                  <div className="account-popover" role="menu" aria-label="Create menu" style={{ width: "min(290px, calc(100vw - 24px))", padding: 8 }}>
                    <Link href="/studio/upload" role="menuitem" onClick={() => setHeaderPopup(null)}><IconUpload className="nav-svg" />Upload video</Link>
                    <Link href="/live" role="menuitem" onClick={() => setHeaderPopup(null)}><IconBell className="nav-svg" />Go live</Link>
                    <Link href="/posts" role="menuitem" onClick={() => setHeaderPopup(null)}><IconSpark className="nav-svg" />Create post</Link>
                    <Link href="/playlists" role="menuitem" onClick={() => setHeaderPopup(null)}><IconPlaylist className="nav-svg" />Create playlist</Link>
                  </div>
                ) : null}
              </div>

              <div className="account-menu">
                <button type="button" className="icon-button" aria-label="Notifications" aria-expanded={headerPopup === "notifications"} onClick={() => toggleHeaderPopup("notifications")}>
                  <IconBell className="nav-svg" />
                  {notifications.filter((notification) => !notification.read).length ? <span className="notification-badge">{notifications.filter((notification) => !notification.read).length}</span> : null}
                </button>
                {headerPopup === "notifications" ? (
                  <div className="account-popover" role="dialog" aria-label="Notifications" style={{ width: "min(400px, calc(100vw - 24px))", maxHeight: "min(600px, calc(100vh - 88px))", padding: 0, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px 12px", borderBottom: "1px solid var(--border)" }}>
                      <strong>Notifications</strong>
                      <button type="button" onClick={markAllNotificationsRead} style={{ width: "auto", padding: 0, color: "var(--coral)", fontSize: 12 }}>Mark all as read</button>
                    </div>
                    <div style={{ display: "flex", gap: 8, padding: "10px 18px", borderBottom: "1px solid var(--border)" }}>
                      {(["all", "unread"] as const).map((filter) => <button key={filter} type="button" className={notificationFilter === filter ? "primary-button" : "secondary-button"} onClick={() => setNotificationFilter(filter)} style={{ minHeight: 32, padding: "0 12px", borderRadius: 999 }}>{filter === "all" ? "All" : "Unread"}</button>)}
                    </div>
                    <div style={{ maxHeight: "min(470px, calc(100vh - 220px))", overflowY: "auto" }}>
                      {notifications.filter((notification) => notificationFilter === "all" || !notification.read).length ? notifications.filter((notification) => notificationFilter === "all" || !notification.read).map((notification) => (
                        <Link key={notification.id} href={notification.href} role="menuitem" onClick={() => { markNotificationRead(notification.id); setHeaderPopup(null); }} style={{ alignItems: "flex-start", gap: 12, padding: "14px 18px", background: notification.read ? "transparent" : "var(--surface-hover)" }}>
                          <span style={{ display: "grid", placeItems: "center", width: 34, height: 34, flex: "0 0 auto", borderRadius: "50%", background: "var(--lime)", color: "var(--ink)" }}><NotificationTypeIcon type={notification.type} /></span>
                          <span style={{ display: "block", minWidth: 0 }}><strong style={{ display: "block" }}>{notification.title}</strong><span style={{ display: "block", marginTop: 4, color: "var(--text-secondary)", whiteSpace: "normal" }}>{notification.message}</span><span style={{ display: "block", marginTop: 6, color: "var(--text-secondary)", fontSize: 12 }}>{notification.createdAt}</span></span>
                          {!notification.read ? <span aria-label="Unread" style={{ width: 7, height: 7, flex: "0 0 auto", marginTop: 7, borderRadius: "50%", background: "var(--coral)" }} /> : null}
                        </Link>
                      )) : <div style={{ padding: "28px 18px", textAlign: "center" }}><strong>{notificationFilter === "unread" ? "No unread notifications." : "You’re all caught up."}</strong><p className="muted">New notifications will appear here.</p></div>}
                    </div>
                  </div>
                ) : null}
              </div>

              {user ? (
                <div className="account-menu" ref={accountMenuRef}>
                  <button className="profile" aria-label="Open account menu" aria-expanded={accountOpen} onClick={() => { setHeaderPopup(null); setAccountOpen((value) => !value); }}>
                    {profileInitials}
                  </button>
                  {accountOpen ? (
                  <div className="account-popover" role="menu">
                    <div className="account-profile-summary">
                      <div className="account-profile-avatar">{profileInitials}</div>
                      <div>
                        <p className="account-name">{displayName}</p>
                        <p className="account-email">{userHandle}</p>
                      </div>
                    </div>
                    <Link href="/channel/ragxshubh" role="menuitem" onClick={() => setAccountOpen(false)}>View your channel</Link>
                    {showAdmin ? <Link href="/admin" role="menuitem" onClick={() => setAccountOpen(false)}>Admin dashboard</Link> : null}
                    {showCreatorSetup ? (
                      <Link href="/creator" role="menuitem" onClick={() => setAccountOpen(false)}>
                        {creatorApplicationStarted ? "Creator Setup" : "Become a Creator"}
                      </Link>
                    ) : null}
                    <div className="account-divider" />
                    <a href="https://myaccount.google.com/u/0/?utm_source=YouTubeWeb&amp;tab=rk&amp;utm_medium=act&amp;gar=WzgwLCIyMzMzODciXQ&amp;sl=true&amp;hl=en" target="_blank" rel="noreferrer" role="menuitem">Google Account</a>
                    <button type="button" role="menuitem">Switch account</button>
                    {user ? (
                      <button type="button" role="menuitem" onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Signing out..." : "Sign out"}</button>
                    ) : (
                      <Link href="/auth" role="menuitem" onClick={() => setAccountOpen(false)}>Sign in</Link>
                    )}
                    <div className="account-divider" />
                    <Link href="/creator" role="menuitem" onClick={() => setAccountOpen(false)}>Creator Dashboard</Link>
                    <a href="https://www.youtube.com/paid_memberships?ybp=mAEK" target="_blank" rel="noreferrer" role="menuitem">Purchases and memberships</a>
                    <a href="https://myaccount.google.com/u/0/yourdata/youtube?hl=en" target="_blank" rel="noreferrer" role="menuitem">Your data in YouTube</a>
                    <div className="account-divider" />
                    <button type="button" role="menuitem">Appearance <span>Device theme</span></button>
                    <button type="button" role="menuitem">Display language <span>English</span></button>
                    <button type="button" role="menuitem">Restricted Mode <span>Off</span></button>
                    <button type="button" role="menuitem">Location <span>India</span></button>
                    {/* <button type="button" role="menuitem">Keyboard shortcuts</button> */}
                    <div className="account-divider" />
                    <a href="https://www.youtube.com/account" target="_blank" rel="noreferrer" role="menuitem">Settings</a>
                    <button type="button" role="menuitem">Help</button>
                    <button type="button" role="menuitem">Send feedback</button>
                  </div>
                  ) : null}
                </div>
              ) : (
                <div className="auth-header-links">
                  <Link href="/auth?mode=login" className="header-auth-link">Sign in</Link>
                  <Link href="/auth?mode=register" className="header-auth-link header-auth-link--primary">Sign up</Link>
                </div>
              )}
            </div>
          </header>
          <div className="page-body">{children}</div>
        </section>
      </main>
    </>
  );
}

export function PageHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return <section className="section-heading page-heading"><div><p className="kicker">{eyebrow}</p><h2>{title}</h2></div>{action ? <Link href="#">{action}</Link> : null}</section>;
}

export function VideoCards({ titles }: { titles: string[] }) {
  return (
    <div className="video-grid">
      {titles.map((title, index) => (
        <article className="video-card" key={title}>
          <div className={`thumbnail tone-${(index % 3) + 1}`}>
            <span>{index === 1 ? "LIVE" : "18:24"}</span>
          </div>
          <div className="card-body">
            <p className="card-label">{index === 1 ? "Live session" : "New from your network"}</p>
            <h3>{title}</h3>
            <p className="muted">GVP editorial channel · {index + 2} days ago</p>
          </div>
        </article>
      ))}
    </div>
  );
}