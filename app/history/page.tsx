"use client";

import PageHeader from "@/components/PageHeader";
import { fmt, pastDays, targets } from "@/lib/mock";
import { useToday } from "@/lib/useToday";

export default function HistoryPage() {
  const today = useToday();
  const avgKcal = pastDays.reduce((s, d) => s + d[0], 0) / pastDays.length;
  const avgProtein = pastDays.reduce((s, d) => s + d[1], 0) / pastDays.length;
  const onTarget = pastDays.filter(([k]) => Math.abs(k - targets.kcal) <= targets.kcal * 0.1).length;

  return (
    <div className="narrow">
      <PageHeader eyebrow="Last 7 days" title="History" />

      <div className="tiles">
        <div className="card tile">
          <div className="tile-label">Avg calories</div>
          <div className="tile-value num">{fmt(avgKcal)}</div>
        </div>
        <div className="card tile">
          <div className="tile-label">Avg protein</div>
          <div className="tile-value num">
            {fmt(avgProtein)}
            <small>g</small>
          </div>
        </div>
        <div className="card tile">
          <div className="tile-label">On target</div>
          <div className="tile-value num">
            {onTarget}
            <small>/ 7</small>
          </div>
        </div>
      </div>

      <section className="card">
        {pastDays.map(([kcal, protein, water], i) => {
          const d = today ? new Date(today.getFullYear(), today.getMonth(), today.getDate() - (i + 1)) : null;
          const over = kcal > targets.kcal;
          return (
            <div key={i} className="history-row">
              <div className="history-date">
                <div className="d1">
                  {d ? (i === 0 ? "Yesterday" : d.toLocaleDateString("en-IN", { weekday: "long" })) : " "}
                </div>
                <div className="d2">{d ? d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : " "}</div>
              </div>
              <div className="history-bar">
                <div className="history-meta num">
                  <span>
                    <b>{fmt(kcal)}</b> kcal · {protein}g protein
                  </span>
                  <span>{(water / 1000).toFixed(water % 1000 ? 2 : 0)} L</span>
                </div>
                <div className="bar">
                  <i
                    style={{
                      width: `${Math.min(100, (kcal / targets.kcal) * 100)}%`,
                      background: over ? "var(--fat)" : "var(--accent)",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
