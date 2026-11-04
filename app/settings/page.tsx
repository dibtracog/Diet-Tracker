import { Icon, type IconName } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";

type Setting = { label: string; value: string; icon: IconName; water?: boolean };

const GROUPS: { title: string; items: Setting[] }[] = [
  {
    title: "Goals",
    items: [
      { label: "Daily calories", value: "2,200 kcal", icon: "target" },
      { label: "Macros", value: "P 140 · C 250 · F 70 g", icon: "flame" },
      { label: "Water goal", value: "3,000 ml", icon: "droplet", water: true },
    ],
  },
  {
    title: "Reminders",
    items: [
      { label: "Meal reminders", value: "09:30 · 14:00 · 21:30", icon: "bell" },
      { label: "Water reminders", value: "Off", icon: "droplet", water: true },
    ],
  },
  {
    title: "AI entries",
    items: [
      { label: "Prompt template", value: "Default", icon: "clipboard" },
      { label: "Import format", value: "JSON v1", icon: "file" },
    ],
  },
  {
    title: "Data",
    items: [
      { label: "Export all data", value: "CSV / JSON", icon: "download" },
      { label: "Back up food library", value: "JSON", icon: "upload" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="narrow">
      <PageHeader eyebrow="Preferences" title="Settings" />
      {GROUPS.map((g) => (
        <section key={g.title} className="group">
          <h2 className="group-title">{g.title}</h2>
          <div className="card">
            {g.items.map((s) => (
              <button key={s.label} type="button" className="setting">
                <span className={`setting-icon ${s.water ? "is-water" : ""}`}>
                  <Icon name={s.icon} size={18} />
                </span>
                <span className="setting-label">{s.label}</span>
                <span className="setting-value num">{s.value}</span>
                <Icon name="chevronRight" size={18} className="chev" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
