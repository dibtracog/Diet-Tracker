"use client";

import Link from "next/link";
import { Icon, type IconName } from "./Icons";
import Sheet from "./Sheet";

type Action = { title: string; sub: string; icon: IconName; water?: boolean } & ({ href: string } | { photo: true });

const ACTIONS: Action[] = [
  { photo: true, title: "Snap a photo", sub: "Save it now, fill in the details later", icon: "camera" },
  { href: "/library", title: "From your library", sub: "One tap on a food you eat often", icon: "library" },
  { href: "/paste", title: "Paste AI entry", sub: "Paste the code your AI gave you", icon: "clipboard" },
  { href: "/#water", title: "Log water", sub: "Quick-add a glass or bottle", icon: "droplet", water: true },
  { href: "/history?log=weight", title: "Log weight", sub: "Today's weigh-in", icon: "scale" },
];

export default function AddSheet({
  open,
  onClose,
  onPickPhoto,
}: {
  open: boolean;
  onClose: () => void;
  onPickPhoto: () => void;
}) {
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
            <Icon name="chevronRight" size={18} className="chev" />
          </>
        );
        return "photo" in a ? (
          <button key={a.title} type="button" className="action" onClick={onPickPhoto}>
            {inner}
          </button>
        ) : (
          <Link key={a.title} href={a.href} className="action" onClick={onClose}>
            {inner}
          </Link>
        );
      })}
    </Sheet>
  );
}
