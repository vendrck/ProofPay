"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * A date in the viewer's own time zone. The server (UTC on Render) renders a
 * labelled UTC fallback; the browser swaps in local time after hydration.
 */
export function LocalTime({ date, dateOnly = false }: { date: Date | string; dateOnly?: boolean }) {
  const onClient = useSyncExternalStore(noop, () => true, () => false);
  const d = typeof date === "string" ? new Date(date) : date;
  const options: Intl.DateTimeFormatOptions = dateOnly
    ? { dateStyle: "medium" }
    : { dateStyle: "medium", timeStyle: "short" };
  const text = onClient
    ? d.toLocaleString(undefined, options)
    : `${d.toLocaleString("en-US", { ...options, timeZone: "UTC" })}${dateOnly ? "" : " UTC"}`;
  return <time dateTime={d.toISOString()}>{text}</time>;
}

/** "OCT / 30" block for activity lists, in the viewer's time zone. */
export function DateBlock({ date }: { date: Date }) {
  const onClient = useSyncExternalStore(noop, () => true, () => false);
  const timeZone = onClient ? undefined : "UTC";
  return (
    <span className="list-date" title={date.toISOString()}>
      {date.toLocaleString("en-US", { month: "short", timeZone })}
      <b>{date.toLocaleString("en-US", { day: "numeric", timeZone })}</b>
    </span>
  );
}
