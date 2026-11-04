import PageHeader from "@/components/PageHeader";

/** Placeholder shown for a split second while saved data loads. */
export default function TodaySkeleton() {
  return (
    <>
      <PageHeader eyebrow={" "} title="Today" />
      <div className="today-grid" aria-hidden="true">
        <div className="area-week skeleton" style={{ height: 56 }} />
        <div className="area-summary skeleton" style={{ height: 270 }} />
        <div className="area-side">
          <div className="skeleton" style={{ height: 180 }} />
        </div>
        <div className="area-log skeleton" style={{ height: 220 }} />
      </div>
    </>
  );
}
