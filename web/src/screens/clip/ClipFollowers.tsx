// Clip page › New followers from this clip (docs/CONTRACTS.md §38): one line per app the clip went to. YouTube and
// Facebook report new subscribers or followers per video; Instagram (for reels), TikTok and X don't, and the line
// says so. Never a guess.
import type { ClipPerformance } from "../../api/types.ts";
import { PlatformMark } from "../../components/PlatformMark.tsx";
import { PLATFORM_LABEL } from "../../lib/format.ts";
import { clipFollowerLines } from "../../lib/followers.ts";

export function ClipFollowers({ perf }: { perf: ClipPerformance }) {
  const lines = clipFollowerLines(perf);
  if (!lines.length) return null;
  return (
    <section className="perf-followers glass" aria-labelledby="perf-followers-title" data-help="clip-followers">
      <h2 className="perf-followers__title" id="perf-followers-title">
        New followers from this clip
      </h2>
      <ul className="perf-followers__list">
        {lines.map((l) => (
          <li key={l.platform} className="perf-followers__row" data-platform={l.platform} data-kind={l.kind}>
            <span className={`money-card__mark is-${l.platform}`} aria-hidden="true">
              <PlatformMark platform={l.platform} size={16} />
            </span>
            <span className="sr-only">{l.spoken}</span>
            <span className="perf-followers__text" aria-hidden="true">
              <strong>{PLATFORM_LABEL[l.platform]}:</strong>{" "}
              <span className={l.kind === "count" ? "perf-followers__num" : "muted"}>{l.text}</span>
              {l.slow ? <span className="perf-followers__fine"> · {l.slow}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
