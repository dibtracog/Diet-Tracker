import { Icon } from "@/components/Icons";
import { fmt } from "@/lib/format";
import type { Goals, Macros } from "@/lib/store";

const MACRO_COLORS = { protein: "#7fd8ae", carbs: "#f3c969", fat: "#f29c82" };
const pct = (v: number, goal: number) => (goal > 0 ? Math.min(1, v / goal) : 0);

export default function SummaryCard({ totals, goals }: { totals: Macros; goals: Goals }) {
  const size = 148;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const left = goals.kcal - totals.kcal;
  const over = left < 0;

  const macros: { key: keyof typeof MACRO_COLORS; label: string }[] = [
    { key: "protein", label: "Protein" },
    { key: "carbs", label: "Carbs" },
    { key: "fat", label: "Fat" },
  ];

  return (
    <section className="summary" aria-label="Calories">
      <div className="summary-top">
        <div className="ring">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={over ? "#f29c82" : "#a9ebc9"}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct(totals.kcal, goals.kcal))}
            />
          </svg>
          <div className="ring-center">
            <div className="ring-value num">{fmt(Math.abs(left))}</div>
            <div className="ring-label">{over ? "kcal over" : "kcal left"}</div>
          </div>
        </div>

        <div className="summary-stats">
          <div>
            <div className="stat-label">
              <Icon name="flame" size={14} /> Eaten
            </div>
            <div className="stat-value num">
              {fmt(totals.kcal)}
              <small>kcal</small>
            </div>
          </div>
          <div>
            <div className="stat-label">
              <Icon name="target" size={14} /> Daily target
            </div>
            <div className="stat-value num">
              {fmt(goals.kcal)}
              <small>kcal</small>
            </div>
          </div>
        </div>
      </div>

      <div className="macros">
        {macros.map((m) => (
          <div key={m.key}>
            <div className="macro-name">{m.label}</div>
            <div className="macro-val num">
              {fmt(totals[m.key])}
              <span> / {fmt(goals[m.key])}g</span>
            </div>
            <div className="bar">
              <i style={{ width: `${pct(totals[m.key], goals[m.key]) * 100}%`, background: MACRO_COLORS[m.key] }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
