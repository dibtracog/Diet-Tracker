import { Icon } from "@/components/Icons";
import { fmt } from "@/lib/format";
import type { WaterLog } from "@/lib/store";

const timeOf = (ms: number) => {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function WaterLogList({ logs, onRemove }: { logs: WaterLog[]; onRemove: (log: WaterLog) => void }) {
  if (!logs.length) return <p className="sheet-text">No water logged for this day yet.</p>;
  const sorted = [...logs].sort((a, b) => a.createdAt - b.createdAt);
  return (
    <div>
      {sorted.map((w) => (
        <div key={w.id} className="row">
          <span className="row-time num">{timeOf(w.createdAt)}</span>
          <div className="row-main">
            <div className="row-title num">{fmt(w.ml)} ml</div>
          </div>
          <button type="button" className="icon-btn del" style={{ opacity: 1 }} onClick={() => onRemove(w)} aria-label={`Remove ${w.ml} ml`}>
            <Icon name="trash" size={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
