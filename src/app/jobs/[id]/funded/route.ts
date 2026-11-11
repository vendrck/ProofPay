import { type NextRequest, NextResponse } from "next/server";
import { appEnv } from "@/config/env";
import { completeFunding, JobError } from "@/server/jobs/service";

export const runtime = "nodejs";

/** PayPal sends the client here after approval (`?token=<orderId>`). We place the hold, then show the job. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Not request.url: behind a proxy (Render) that can be the internal host.
  const jobUrl = new URL(`/jobs/${encodeURIComponent(id)}`, appEnv().APP_BASE_URL);

  try {
    await completeFunding(id, request.nextUrl.searchParams.get("token"));
  } catch (err) {
    if (!(err instanceof JobError)) console.error(err);
    jobUrl.searchParams.set("error", err instanceof JobError ? err.message : "Couldn't confirm the PayPal payment.");
  }
  return NextResponse.redirect(jobUrl, 303);
}
