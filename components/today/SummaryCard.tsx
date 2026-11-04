import { Icon } from "@/components/Icons";
import { fmt, type Macros } from "@/lib/mock";

const MACRO_COLORS = { protein: "#7fd8ae", carbs: "#f3c969", fat: "#f29c82" };

export default function SummaryCard({ totals, targets }: { totals: Macros; targets: Macros }) {
  const size = 148;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, totals.kcal / targets.kcal);
  const remaining = Math.max(0, targets.kcal - totals.kcal);

  const macros: { key: keyof typeof MACRO_COLORS; label: string }[] = [
    { key: "protein", label: "Protein" },
    { key: "carbs", label: "Carbs" },
    { key: "fat", label: "Fat" },
  ];

  return (
    <section className="summary" aria-label="Today's calories">
      <div className="summary-top">
        <div className="ring">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#a9ebc9"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
            />
          </svg>
          <div className="ring-center">
            <div className="ring-value num">{fmt(remaining)}</div>
            <div className="ring-label">kcal left</div>
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
              {fmt(targets.kcal)}
              <small>kcal</small>
            </div>
          </div>
        </div>
      </div>

      <div className="macros">
        {macros.map((m) => {
          const val = totals[m.key];
          const goal = targets[m.key];
          return (
            <div key={m.key}>
              <div className="macro-name">{m.label}</div>
              <div className="macro-val num">
                {fmt(val)}
                <span> / {fmt(goal)}g</span>
              </div>
              <div className="bar">
                <i style={{ width: `${Math.min(100, (val / goal) * 100)}%`, background: MACRO_COLORS[m.key] }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
