"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, UploadCloud, Database, Sparkles, Bell, Users, Moon, Sun, LogOut, Menu, X, ChevronDown, ShieldCheck } from "lucide-react";
import { ServiceWorker } from "./ServiceWorker";

type User = { id: string; name: string; email: string; role: "ADMIN" | "USER" };
const links = [
  { href: "/tableau-de-bord", label: "Vue d’ensemble", icon: LayoutDashboard },
  { href: "/imports", label: "Importer", icon: UploadCloud },
  { href: "/veille", label: "Données de veille", icon: Database },
  { href: "/assistant", label: "Assistant IA", icon: Sparkles },
  { href: "/alertes", label: "Alertes", icon: Bell }
];

export function AppShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname(); const router = useRouter();
  const [mobile, setMobile] = useState(false); const [theme, setTheme] = useState("light"); const [unread, setUnread] = useState(0); const [profile, setProfile] = useState(false);
  useEffect(() => { setTheme(document.documentElement.dataset.theme || "light"); fetch("/api/alerts?unread=true").then(r => r.json()).then(d => setUnread(d.unread || 0)).catch(() => undefined); }, [pathname]);
  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("pharmintel-theme", next); }
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/connexion"); router.refresh(); }
  const title = [...links, { href: "/utilisateurs", label: "Utilisateurs" }].find(x => pathname.startsWith(x.href))?.label || "PharmIntel";
  return <div className="app-frame">
    <ServiceWorker />
    <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><span>+</span></span><span><strong>Pharm</strong>Intel<small>Veille pharmaceutique</small></span><button className="icon-btn sidebar-close" onClick={() => setMobile(false)} aria-label="Fermer"><X size={20}/></button></div>
      <nav className="nav-list" aria-label="Navigation principale">
        <p className="nav-label">ESPACE DE VEILLE</p>
        {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobile(false)} className={pathname.startsWith(href) ? "active" : ""}><Icon size={19}/><span>{label}</span>{href === "/alertes" && unread > 0 && <b className="nav-badge">{unread}</b>}</Link>)}
        {user.role === "ADMIN" && <><p className="nav-label nav-separator">ADMINISTRATION</p><Link href="/utilisateurs" onClick={() => setMobile(false)} className={pathname.startsWith("/utilisateurs") ? "active" : ""}><Users size={19}/><span>Utilisateurs</span></Link></>}
      </nav>
      <div className="sidebar-foot"><div className="secure-chip"><ShieldCheck size={16}/><span><strong>Espace sécurisé</strong><small>Chiffrement actif</small></span></div><span className="version">PharmIntel v1.0</span></div>
    </aside>
    {mobile && <button className="sidebar-scrim" onClick={() => setMobile(false)} aria-label="Fermer le menu"/>}
    <div className="app-main">
      <header className="topbar"><div className="topbar-left"><button className="icon-btn menu-button" onClick={() => setMobile(true)}><Menu size={22}/></button><div><span className="eyebrow">ESPACE DE VEILLE</span><h1>{title}</h1></div></div><div className="topbar-actions">
        <button className="icon-btn" onClick={toggleTheme} aria-label="Changer le thème">{theme === "dark" ? <Sun size={19}/> : <Moon size={19}/>}</button>
        <Link className="icon-btn notification-button" href="/alertes" aria-label="Alertes"><Bell size={19}/>{unread > 0 && <i>{Math.min(unread, 9)}</i>}</Link>
        <div className="profile-wrap"><button className="profile-button" onClick={() => setProfile(!profile)}><span className="avatar">{user.name.split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase()}</span><span className="profile-copy"><strong>{user.name}</strong><small>{user.role === "ADMIN" ? "Administrateur" : "Utilisateur"}</small></span><ChevronDown size={15}/></button>{profile && <div className="profile-menu"><div><strong>{user.name}</strong><small>{user.email}</small></div><button onClick={logout}><LogOut size={16}/> Se déconnecter</button></div>}</div>
      </div></header>
      <main className="page-content">{children}</main>
    </div>
  </div>;
}
