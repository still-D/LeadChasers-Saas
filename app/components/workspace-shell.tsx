"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart3, Bell, BriefcaseBusiness, Calculator, ChevronRight, CircleHelp, ContactRound,
  LayoutDashboard, LogOut, Menu, Search, Settings2, ShieldCheck, UsersRound, X,
} from "lucide-react";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { logout } from "@/app/auth/actions";

type ShellProfile = {
  name: string;
  email: string;
  role: string;
  initials: string;
  isFounder: boolean;
};

type WorkspaceShellProps = {
  children: ReactNode;
  profile: ShellProfile;
  access: { projects: boolean; clients: boolean; pricing: boolean; finance: boolean; admin: boolean };
};

const coreNav = [
  { href: "/dashboard", label: "Vue d’ensemble", icon: LayoutDashboard, key: "dashboard" },
  { href: "/projects", label: "Productions", icon: BriefcaseBusiness, key: "projects" },
  { href: "/clients", label: "Clients & prospects", icon: ContactRound, key: "clients" },
  { href: "/pricing", label: "Tarifs & devis", icon: Calculator, key: "pricing" },
] as const;

export function WorkspaceShell({ children, profile, access }: WorkspaceShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const visibleCore = coreNav.filter((item) => item.key === "dashboard" || access[item.key as keyof typeof access]);
  const active = (href: string) => href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  const currentSection = pathname.startsWith("/projects") ? "Productions"
    : pathname.startsWith("/clients") ? "Clients"
      : pathname.startsWith("/pricing") ? "Tarifs & devis"
        : pathname.startsWith("/finance") ? "Finance"
          : pathname.startsWith("/admin") ? "Équipe & accès"
            : pathname.startsWith("/account") ? "Mon compte"
              : "Vue d’ensemble";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="workspace-shell">
      <button ref={menuButtonRef} className="mobile-menu" type="button" onClick={() => setOpen(true)} aria-label="Ouvrir la navigation" aria-controls="workspace-navigation" aria-expanded={open}><Menu size={20} /></button>
      {open && <button className="sidebar-scrim" type="button" onClick={() => setOpen(false)} aria-label="Fermer la navigation" />}
      <aside id="workspace-navigation" className={`workspace-sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand-row"><Brand /><button ref={closeButtonRef} type="button" onClick={() => setOpen(false)} aria-label="Fermer la navigation"><X size={18} /></button></div>
        <div className="workspace-indicator" title="LeadChasers Media Coop"><BriefcaseBusiness size={18} /><div><strong>Media Coop</strong><small>Espace opérationnel</small></div></div>
        <nav className="workspace-nav" aria-label="Navigation de l’espace de travail">
          <p>ESPACE DE TRAVAIL</p>
          {visibleCore.map((item) => {
            const Icon = item.icon;
            return <Link key={item.href} className={active(item.href) ? "active" : ""} href={item.href} onClick={() => setOpen(false)} title={item.label} aria-label={item.label}><Icon size={19} strokeWidth={1.8} /><span>{item.label}</span></Link>;
          })}
          {(access.finance || access.admin) && <p className="nav-section-title">PILOTAGE</p>}
          {access.finance && <Link className={active("/finance") ? "active" : ""} href="/finance" onClick={() => setOpen(false)} title="Finance" aria-label="Finance"><BarChart3 size={19} strokeWidth={1.8} /><span>Finance</span></Link>}
          {access.admin && <Link className={active("/admin") ? "active" : ""} href="/admin" onClick={() => setOpen(false)} title="Équipe & accès" aria-label="Équipe & accès"><UsersRound size={19} strokeWidth={1.8} /><span>Équipe & accès</span></Link>}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/account" onClick={() => setOpen(false)} title="Mon compte" aria-label="Mon compte"><Settings2 size={18} /><span>Mon compte</span></Link>
          <a href="mailto:support@leadchasers.ma" title="Assistance" aria-label="Assistance"><CircleHelp size={18} /><span>Assistance</span></a>
          <div className="sidebar-profile">
            <span className="profile-avatar">{profile.initials}</span>
            <div><strong>{profile.name}</strong><small>{profile.role}</small></div>
            <form action={logout}><button type="submit" title="Se déconnecter" aria-label="Se déconnecter"><LogOut size={17} /></button></form>
          </div>
        </div>
      </aside>
      <div className="workspace-stage">
        <header className="workspace-topbar">
          <div className="topbar-context"><span>Accueil</span><ChevronRight size={13} /><strong>{currentSection}</strong></div>
          <div className="topbar-right">
            <div className="command-search"><Search size={15} /><span>Rechercher…</span><kbd>⌘ K</kbd></div>
            <span className="secure-pill" title="Espace interne sécurisé"><ShieldCheck size={15} /> <span>Interne</span></span>
            <ThemeToggle />
            <button className="topbar-icon" type="button" title="Notifications" aria-label="Notifications"><Bell size={16} /></button>
            <div className="topbar-avatar" title={`${profile.name} · ${profile.role}`}>{profile.initials}</div>
          </div>
        </header>
        <main className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
