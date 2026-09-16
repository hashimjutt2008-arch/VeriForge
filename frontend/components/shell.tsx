"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ArrowUpRight,
  CircleHelp,
  Download,
  History,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Plus,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { Button } from "./ui/button";

const navigation = [
  { href: "/dashboard", title: "Overview", icon: LayoutDashboard },
  { href: "/new", title: "New clean", icon: Plus },
  { href: "/history", title: "History", icon: History },
  { href: "/rules", title: "Cleaning rules", icon: SlidersHorizontal },
  { href: "/exports", title: "Exports", icon: Download },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {open && (
        <button
          aria-label="Close navigation"
          className="nav-scrim"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={open ? "sidebar open" : "sidebar"}>
        <Link
          href="/dashboard"
          className="brand-link"
          onClick={() => setOpen(false)}
        >
          <Brand />
        </Link>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <div className="workspace-label">
          <span className="workspace-avatar">V</span>
          <div>
            Local workspace<small>This browser & device</small>
          </div>
          <LockKeyhole size={14} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map(({ href, title, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={path === href ? "page" : undefined}
              className={path === href ? "nav-link active" : "nav-link"}
            >
              <Icon size={19} />
              {title}
              {href === "/new" && <span className="nav-plus">+</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <strong>Your lists stay local</strong>
            <p>
              Processed in your browser.
              <br />
              No file uploads to servers.
            </p>
          </div>
          <Link
            className={path === "/settings" ? "nav-link active" : "nav-link"}
            href="/settings"
            onClick={() => setOpen(false)}
          >
            <Settings2 size={19} />
            Settings
          </Link>
          <Link
            className={path === "/help" ? "nav-link active" : "nav-link"}
            href="/help"
            onClick={() => setOpen(false)}
          >
            <CircleHelp size={19} />
            Help & support
            <ArrowUpRight size={14} className="push-right" />
          </Link>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="row">
            <Button
              variant="ghost"
              size="icon"
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </Button>
            <span className="breadcrumb">
              Workspace <span>/</span>{" "}
              <strong>
                {navigation.find((n) => n.href === path)?.title ||
                  (path.startsWith("/jobs")
                    ? "Clean results"
                    : path === "/settings"
                      ? "Settings"
                      : "Help & support")}
              </strong>
            </span>
          </div>
          <span className="private-badge">
            <LockKeyhole size={13} />
            Local processing
          </span>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <span>
            VeriForge <span className="footer-dot">·</span> A clearer list,
            every time.
          </span>
          <span>List cleaning & correction</span>
        </footer>
      </div>
    </div>
  );
}
