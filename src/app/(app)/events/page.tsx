import { getEvents, getEventsSummary } from "@/db/queries/events";
import { getCategories } from "@/db/queries/categories";
import { EventsClient } from "./events-client";

export const metadata = { title: "Life Events" };

export default async function EventsPage() {
  const [events, summary, categories] = await Promise.all([
    getEvents(),
    getEventsSummary(),
    getCategories(),
  ]);

  return (
    <EventsClient
      initialData={{
        events,
        summary,
        categories,
      }}
    />
  );
}
