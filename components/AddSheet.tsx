"use client";

import Link from "next/link";
import { Icon, type IconName } from "./Icons";
import Sheet from "./Sheet";

type Action = {
  href: string;
  title: string;
  sub: string;
  icon: IconName;
  water?: boolean;
  soon?: boolean;
};

const ACTIONS: Action[] = [
  { href: "/library", title: "From your library", sub: "One tap on a food you eat often", icon: "library" },
  { href: "/paste", title: "Paste AI entry", sub: "Paste the code your AI gave you", icon: "clipboard" },
  { href: "/#water", title: "Log water", sub: "Quick-add a glass or bottle", icon: "droplet", water: true },
  { href: "#", title: "Snap a photo", sub: "Save it now, fill in details later", icon: "camera", soon: true },
];

export default function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Add entry">
      {ACTIONS.map((a) => {
        const inner = (
          <>
            <span className={`action-icon ${a.water ? "is-water" : ""}`}>
              <Icon name={a.icon} size={22} />
            </span>
            <span className="action-body">
              <span className="action-title" style={{ display: "block" }}>
                {a.title}
              </span>
              <span className="action-sub">{a.sub}</span>
            </span>
            {a.soon ? <span className="badge">Soon</span> : <Icon name="chevronRight" size={18} className="chev" />}
          </>
        );
        return a.soon ? (
          <div key={a.title} className="action is-disabled" aria-disabled="true">
            {inner}
          </div>
        ) : (
          <Link key={a.title} href={a.href} className="action" onClick={onClose}>
            {inner}
          </Link>
        );
      })}
    </Sheet>
  );
}
