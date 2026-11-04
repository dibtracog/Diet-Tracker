"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icons";
import AddSheet from "./AddSheet";
import LoginScreen from "./LoginScreen";
import TodayDate from "./TodayDate";
import { useStore } from "@/lib/store";

type NavItem = { href: string; label: string; icon: IconName };

const NAV: NavItem[] = [
  { href: "/", label: "Today", icon: "home" },
  { href: "/library", label: "Library", icon: "library" },
  { href: "/history", label: "History", icon: "calendar" },
  { href: "/settings", label: "Settings", icon: "sliders" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [addOpen, setAddOpen] = useState(false);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const { auth } = useStore();

  // With cloud sync on, nothing is shown until you're signed in.
  if (auth === "signedOut") return <LoginScreen />;
  if (auth === "loading") return <div className="login" aria-busy="true" />;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const tab = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      className={`tab ${isActive(item.href) ? "is-active" : ""}`}
      aria-current={isActive(item.href) ? "page" : undefined}
    >
      <Icon name={item.icon} size={22} />
      {item.label}
    </Link>
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-date">
          <div className="day">
            <TodayDate part="weekday" />
          </div>
          <div className="date">
            <TodayDate part="date" />
          </div>
        </div>

        <button className="btn btn-primary btn-block" onClick={() => setAddOpen(true)}>
          <Icon name="plus" size={18} strokeWidth={2.2} />
          Add entry
        </button>

        <nav className="side-nav" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`side-link ${isActive(item.href) ? "is-active" : ""}`}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="main">
        <div className="main-inner">{children}</div>
      </main>

      <nav className="tabbar" aria-label="Main">
        {tab(NAV[0])}
        {tab(NAV[1])}
        <button className="tab-add" onClick={() => setAddOpen(true)} aria-label="Add entry">
          <Icon name="plus" size={26} strokeWidth={2.2} />
        </button>
        {tab(NAV[2])}
        {tab(NAV[3])}
      </nav>

      <AddSheet open={addOpen} onClose={closeAdd} />
    </div>
  );
}
