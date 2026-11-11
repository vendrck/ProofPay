/**
 * Probe which Gemini models answer reliably right now. Reads the key from the environment,
 * makes a few small real calls per model, and prints success rate and latency.
 * Usage: npm run spike:models [-- <rounds>]
 */
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
const rounds = Number(process.argv[2] ?? 4);

const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
  headers: { "x-goog-api-key": key },
});
const listed = ((await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }).models ?? [];
const ids = listed
  .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
  .map((m) => m.name.replace("models/", ""))
  .filter((id) => /flash|pro/.test(id) && !/image|tts|audio|live|embedding|robotics|computer|exp|customtools|learnlm/.test(id));
console.log("candidates:", ids.join(", "));

const google = createGoogleGenerativeAI({ apiKey: key });
const stats = new Map(ids.map((id) => [id, { ok: 0, fail: 0, ms: [] as number[], err: "" }]));

for (let r = 0; r < rounds; r++) {
  await Promise.all(
    ids.map(async (id) => {
      const s = stats.get(id)!;
      const t = Date.now();
      try {
        await generateText({
          model: google(id),
          prompt: "List three acceptance criteria for: add a function that reverses a string, with tests. One line each.",
          maxRetries: 0,
          timeout: 60_000,
        });
        s.ok++;
        s.ms.push(Date.now() - t);
      } catch (err) {
        s.fail++;
        s.err = (err instanceof Error ? err.message : String(err)).slice(0, 70);
      }
    }),
  );
  await new Promise((done) => setTimeout(done, 8000));
}

for (const [id, s] of [...stats].sort((a, b) => b[1].ok - a[1].ok)) {
  const avg = s.ms.length ? Math.round(s.ms.reduce((a, b) => a + b, 0) / s.ms.length) : 0;
  console.log(`${id.padEnd(38)} ok ${s.ok}/${rounds}  avg ${String(avg).padStart(5)} ms  ${s.err}`);
}
