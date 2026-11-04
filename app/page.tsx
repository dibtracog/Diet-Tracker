import Link from "next/link";
import { Icon } from "@/components/Icons";
import PageHeader from "@/components/PageHeader";
import TodayDate from "@/components/TodayDate";
import TodayView from "@/components/today/TodayView";
import { library, todayEntries } from "@/lib/mock";

export default function TodayPage() {
  return (
    <>
      <PageHeader
        eyebrow={<TodayDate />}
        title="Today"
        action={
          <Link href="/paste" className="btn btn-secondary btn-sm">
            <Icon name="clipboard" size={16} />
            Paste entry
          </Link>
        }
      />
      <TodayView initialEntries={todayEntries} favourites={library.filter((f) => f.favourite)} />
    </>
  );
}
