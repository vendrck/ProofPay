import { LocalTime } from "@/components/local-time";
import { describeEvent, type EventContext } from "../describe-event";

const ACTOR = { system: "System", ai: "AI", admin: "Admin", client: "Client", freelancer: "Freelancer", paypal: "PayPal" } as const;

export function Activity({
  events,
  ctx,
}: {
  events: { id: string; type: string; actor: keyof typeof ACTOR; data: unknown; createdAt: Date }[];
  ctx: EventContext;
}) {
  return (
    <section className="card">
      <h2>Activity</h2>
      <ol className="timeline">
        {events.map((e) => (
          <li key={e.id} className={`event event-${e.actor}`} title={e.type}>
            <span className="event-actor">{ACTOR[e.actor]}</span>
            <span className="event-text">{describeEvent(e, ctx)}</span>
            <span className="event-time small muted">
              <LocalTime date={e.createdAt} />
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
