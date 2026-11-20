// How one clip did on each platform (docs/CONTRACTS.md §16.8): the video on top, five smooth lines growing out of
// it into five platform stacks, a crown on the best one, a "Best this week" star and one Refresh numbers button.
// Numbers arrive live over the WebSocket; while it is down the page checks every minute.
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { ApiError, api, friendlyMessage } from "../../api/index.ts";
import type { ClipPerformance as Perf, Platform, RefreshResult } from "../../api/types.ts";
import { Icon } from "../../components/Icon.tsx";
import { PlatformMark } from "../../components/PlatformMark.tsx";
import { PerfLines, type LinesLayout } from "../../components/PerfLines.tsx";
import { PlatformStack } from "../../components/PlatformStack.tsx";
import { useToast } from "../../components/Toasts.tsx";
import { ActGlyph, Button, Empty, LinkButton, Skeleton } from "../../components/ui.tsx";
import { MOMENT_LABEL, PLATFORM_LABEL, plural } from "../../lib/format.ts";
import { useMedia, usePoll } from "../../lib/hooks.ts";
import { useLiveEvents, useLiveStatus } from "../../lib/live.ts";
import { applyPerfEvent, withTotals } from "../../lib/liveCache.ts";
import { STATS_ORDER, ago, compact, full, until } from "../../lib/metrics.ts";
import { useAction } from "../../lib/motion.ts";
import { prefersReducedMotion, usePrefs } from "../../lib/prefs.ts";
import { goBack } from "../../lib/router.ts";
import { isoWeek, weekRange } from "../../lib/week.ts";
import { ClipFollowers } from "./ClipFollowers.tsx";

/** Re-renders every `ms` so "3 min ago" and "Next check in 4 min" stay true. */
export function useNow(ms = 15_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Stage widths (CSS px) where the layout changes; performance.css uses the same numbers in its @container rules. */
export const FAN_MIN = 1060;
export const ROWS_MIN = 620;

/**
 * Which way the lines run, from the width the stage really has (not the window: the sidebar takes 250 px of a
 * laptop). Fan needs room for five columns of about 200 px; rows for three of about 190 px; below that, a trunk.
 */
export function layoutFor(stageWidth: number): LinesLayout {
  return stageWidth >= FAN_MIN ? "fan" : stageWidth >= ROWS_MIN ? "rows" : "trunk";
}

/** The best platform and its views, for the one-line winner under the total (null when no platform has numbers). */
export function winner(perf: Perf): { platform: Platform; views: number } | null {
  const b = perf.bestPlatform;
  const views = b ? perf.posts.find((p) => p.platform === b)?.metrics?.views : null;
  return b && typeof views === "number" ? { platform: b, views } : null;
}

/** The refresh button's state from what the stacks say (pure, for the tests). */
export function refreshState(perf: Perf, now: number, busy: boolean) {
  const checkable = perf.posts.filter((p) => p.status === "posted" && p.account === "connected");
  const refreshing = busy || perf.posts.some((p) => p.refreshing);
  const waiting = checkable
    .map((p) => p.nextAllowedAt)
    .filter((t): t is string => !!t && Date.parse(t) > now)
    .sort();
  const allWaiting = !refreshing && checkable.length > 0 && waiting.length === checkable.length;
  return { checkable: checkable.length, refreshing, allWaiting, nextAt: allWaiting ? waiting[0] : undefined };
}

/** "Instagram and Facebook" / "YouTube, TikTok and X". */
const joinNames = (names: string[]) => (names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

/** One short line about what a refresh did, from the per-platform results. */
export function refreshMessage(results: RefreshResult[], now = Date.now()): { tone: "info" | "success"; text: string } {
  const started = results.filter((r) => r.status === "started");
  if (started.length) {
    const what = started.length === STATS_ORDER.length ? `all ${STATS_ORDER.length} apps` : joinNames(started.map((r) => PLATFORM_LABEL[r.platform]));
    // One short line. The "can take 2 days to settle" notes are left out: each slow stack already shows that chip.
    return { tone: "success", text: `Checking ${what} now.` };
  }
  const notes = [...new Set(results.map((r) => r.note).filter((n): n is string => !!n))];
  const later = results
    .filter((r) => (r.status === "too_soon" || r.status === "blocked") && r.nextAllowedAt)
    .map((r) => r.nextAllowedAt!)
    .sort()[0];
  if (later) return { tone: "info", text: `Next check in ${until(later, now) || "a minute"}. Each app only lets Clip Factory look so often.` };
  return { tone: "info", text: notes[0] ?? "There is nothing posted to check yet." };
}

export function ClipPerformance({ clipId }: { clipId: string }) {
  const [perf, setPerf] = useState<Perf | null>(null);
  const [error, setError] = useState<{ message: string; missing: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [starBusy, setStarBusy] = useState(false);
  // §20: Refresh numbers turns, the star spins; both shake (without a second deny) when the toast says it failed.
  const refreshAct = useAction("refresh");
  const starAct = useAction("star");
  const toast = useToast();
  const now = useNow();
  const [stageWidth, setStageWidth] = useState<number | null>(null);
  // Until the stage is measured (one frame), guess from the window; the CSS already follows the stage itself.
  const wideGuess = useMedia("(min-width: 1360px)");
  const midGuess = useMedia("(min-width: 960px)");
  const layout: LinesLayout = stageWidth !== null ? layoutFor(stageWidth) : wideGuess ? "fan" : midGuess ? "rows" : "trunk";
  const prefs = usePrefs();
  // Lines draw in once per visit; with reduced motion they are simply there.
  const [animate] = useState(() => !prefersReducedMotion());
  const live = useLiveStatus();

  const stage = useRef<HTMLDivElement | null>(null);
  const stageObserver = useRef<ResizeObserver | null>(null);
  /** Attaches the stage and watches its width (the content box, as the CSS container queries see it). */
  const setStage = useCallback((el: HTMLDivElement | null) => {
    stage.current = el;
    stageObserver.current?.disconnect();
    stageObserver.current = null;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      // Unrounded: the CSS container queries compare the exact width, so a stage of 619.6 px must stay "trunk" here too.
      if (w !== undefined) setStageWidth(w);
    });
    ro.observe(el);
    stageObserver.current = ro;
  }, []);
  const preview = useRef<HTMLDivElement>(null);
  const stacks = useRef<(HTMLElement | null)[]>([]);

  const load = useCallback(async () => {
    try {
      const fresh = await api().clipPerformance(clipId);
      // Keep presigned links already playing (a fresh pair would restart the video).
      setPerf((old) => (old ? { ...fresh, clip: { ...fresh.clip, videoUrl: old.clip.videoUrl ?? fresh.clip.videoUrl, coverUrl: old.clip.coverUrl ?? fresh.clip.coverUrl } } : fresh));
      setError(null);
    } catch (e) {
      setError({ message: friendlyMessage(e), missing: e instanceof ApiError && e.status === 404 });
      throw e;
    }
  }, [clipId]);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  useLiveEvents(
    (e) => setPerf((p) => (p ? applyPerfEvent(p, e) : p)),
    () => void load().catch(() => undefined),
  );
  // The fallback while the live connection is down: look again every minute.
  usePoll(load, live !== "live" && perf !== null, 60_000);

  // A refresh that never reported back (the numbers came while offline): fetch the page again after two minutes.
  const anyRefreshing = perf?.posts.some((p) => p.refreshing) ?? false;
  useEffect(() => {
    if (!anyRefreshing) return;
    const t = setTimeout(() => void load().catch(() => undefined), 120_000);
    return () => clearTimeout(t);
  }, [anyRefreshing, load]);

  if (error && !perf) {
    return (
      <div className="page perf">
        <h1 className="sr-only">{error.missing ? "No numbers for this clip" : "Could not load the numbers"}</h1>
        <BackRow />
        <Empty
          icon={error.missing ? "chart" : "alert"}
          title={error.missing ? "No numbers for this clip" : "Could not load the numbers"}
          action={
            <>
              <LinkButton href="/library" variant="primary" icon="library">
                Go to Library
              </LinkButton>
              {error.missing ? null : (
                <Button icon="retry" act="retry" onClick={() => load()}>
                  Try again
                </Button>
              )}
            </>
          }
        >
          {error.message}
        </Empty>
      </div>
    );
  }
  if (!perf) {
    return (
      <div className="page perf">
        <h1 className="sr-only">Loading clip numbers</h1>
        <BackRow />
        <Skeleton className="perf-skel" />
      </div>
    );
  }

  const state = refreshState(perf, now, busy);
  const clip = perf.clip;

  async function refresh() {
    if (!perf) return;
    setBusy(true);
    try {
      const results = await api().refreshStats(clipId);
      setPerf((p) => {
        if (!p) return p;
        const posts = p.posts.map((s) => {
          const r = results.find((x) => x.platform === s.platform);
          if (!r) return s;
          if (r.status === "started") return { ...s, refreshing: true, nextAllowedAt: r.nextAllowedAt ?? s.nextAllowedAt };
          if ((r.status === "too_soon" || r.status === "blocked") && r.nextAllowedAt) return { ...s, nextAllowedAt: r.nextAllowedAt };
          return s;
        });
        return withTotals({ ...p, posts });
      });
      const msg = refreshMessage(results);
      if (msg.tone === "success") toast.success(msg.text, { group: "refresh" });
      else toast.info(msg.text, { group: "refresh" });
    } catch (e) {
      refreshAct.fail({ sound: false });
      toast.error(friendlyMessage(e));
    } finally {
      setBusy(false);
    }
  }

  /** The refresh button is switched off: say why (the click already played the deny sound). */
  function explainOff() {
    if (state.refreshing) return;
    if (state.allWaiting && state.nextAt)
      toast.info(`Next check in ${until(state.nextAt, now) || "a minute"}. Each app only lets Clip Factory look so often.`, { group: "refresh" });
    else if (!state.checkable) toast.info("Nothing is posted yet, so there are no numbers to check.", { group: "refresh" });
  }

  async function toggleStar() {
    if (!perf || starBusy) return;
    const on = !perf.bestThisWeek;
    const week = perf.week ?? isoWeek(new Date(perf.weekAnchorAt));
    const range = weekRange(week);
    setStarBusy(true);
    setPerf((p) => (p ? { ...p, bestThisWeek: on, week: on ? week : null, clip: { ...p.clip, best: on } } : p));
    try {
      const current = await api().getWeek(week, range.from, range.to);
      const ids = new Set(current.clipIds);
      if (on) ids.add(clipId);
      else ids.delete(clipId);
      if (ids.size > 10) throw new ApiError(400, "bad_request", "You can star up to 10 clips a week. Take a star off another clip first.");
      await api().saveWeekBest(week, { ...range, clipIds: [...ids] });
      toast.success("Saved. Clip Factory will learn from your picks.", { group: "star" });
    } catch (e) {
      setPerf((p) => (p ? { ...p, bestThisWeek: !on, week: !on ? week : null, clip: { ...p.clip, best: !on } } : p));
      starAct.fail({ sound: false });
      toast.error(friendlyMessage(e));
    } finally {
      setStarBusy(false);
    }
  }

  const label = state.refreshing ? "Checking…" : state.allWaiting && state.nextAt ? `Next check in ${until(state.nextAt, now)}` : "Refresh numbers";
  const off = state.allWaiting || state.checkable === 0;
  const waiting = !state.refreshing && state.allWaiting && !!state.nextAt;
  const best = winner(perf);

  /** A chip jumps to its platform's stack and moves the focus to its name. */
  function jump(platform: Platform, e: MouseEvent) {
    e.preventDefault();
    const heading = document.getElementById(`stack-${platform}`);
    heading?.closest("section")?.scrollIntoView({ behavior: prefersReducedMotion() || prefs.reduceMotion ? "auto" : "smooth", block: "start" });
    heading?.focus({ preventScroll: true });
  }

  return (
    <div className={`page perf perf--${layout}${animate && !prefs.reduceMotion ? " perf--draw" : ""}`}>
      <BackRow />
      <header className="perf__head">
        <h1 className="perf__title user-text">{clip.hook}</h1>
        <p className="perf__meta">
          {MOMENT_LABEL[clip.momentType]} · {plural(perf.totals.platformsPosted, "platform")} posted
        </p>
      </header>

      <div className="perf__stage" ref={setStage} data-layout={layout}>
        <PerfLines
          stage={stage}
          preview={preview}
          stacks={stacks}
          platforms={STATS_ORDER}
          layout={layout}
          best={perf.bestPlatform}
          animate={animate && !prefs.reduceMotion}
        />

        <div className="perf__hero">
          <div className="perf__preview glass" ref={preview}>
            {clip.videoUrl ? (
              <video
                className="perf__video"
                controls
                playsInline
                preload="metadata"
                poster={clip.coverUrl}
                src={clip.videoUrl}
                aria-label={`Clip: ${clip.hook}`}
              />
            ) : clip.coverUrl ? (
              <img className="perf__video" src={clip.coverUrl} alt={`Cover for: ${clip.hook}`} />
            ) : (
              <span className="perf__novideo">
                <Icon name="play" size={22} />
                No preview
              </span>
            )}
          </div>

          {layout === "trunk" ? (
            <nav className="perf__chips" aria-label="Views on each app">
              <ul className="perf__chip-list">
                {STATS_ORDER.map((platform) => {
                  const views = perf.posts.find((p) => p.platform === platform)?.metrics?.views;
                  const has = typeof views === "number";
                  const isBest = best?.platform === platform;
                  return (
                    <li key={platform}>
                      <a
                        href={`#stack-${platform}`}
                        className={`perf-chip${isBest ? " is-best" : ""}${has ? "" : " is-none"}`}
                        data-chip={platform}
                        onClick={(e) => jump(platform, e)}
                        aria-label={`${PLATFORM_LABEL[platform]}: ${has ? `${full(views)} views` : "no numbers yet"}${isBest ? ", best" : ""}`}
                      >
                        <PlatformMark platform={platform} size={16} />
                        <span className="perf-chip__num" aria-hidden="true">
                          {has ? compact(views) : "none yet"}
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}

          <div className="perf__total glass glass--green">
            <p className="perf__views">
              <span className="perf__views-num" aria-hidden="true" data-metric="total">
                {compact(perf.totals.views)}
              </span>
              <span className="sr-only">{full(perf.totals.views)}</span>
              <span className="perf__views-label">views across platforms</span>
            </p>
            <p className="perf__fine">(each app counts views its own way)</p>
            {best ? (
              <p className="perf__winner" data-winner={best.platform}>
                <span className="perf__winner-mark" aria-hidden="true">
                  <PlatformMark platform={best.platform} size={14} />
                </span>
                <span>
                  Best on {PLATFORM_LABEL[best.platform]}{" "}
                  <span className="perf__winner-views">
                    <span className="perf__winner-dot" aria-hidden="true">
                      ·{" "}
                    </span>
                    <span className="perf__winner-num" aria-hidden="true">
                      {compact(best.views)}
                    </span>
                    <span className="sr-only">{full(best.views)}</span> views
                  </span>
                </span>
              </p>
            ) : null}
          </div>

          <div className="perf__actions">
            <button
              type="button"
              className={`star-btn glass glass--green${perf.bestThisWeek ? " is-on" : ""}`}
              aria-pressed={perf.bestThisWeek}
              aria-busy={starBusy || undefined}
              data-help="best-star"
              data-act="star"
              onClick={() => {
                if (starBusy) return;
                void toggleStar();
                starAct.play();
              }}
            >
              <ActGlyph act={starAct}>
                <Icon name="star" size={24} fill={perf.bestThisWeek ? "currentColor" : "none"} />
              </ActGlyph>
              <span>Best this week</span>
            </button>
            <Button
              variant="primary"
              size="lg"
              icon={waiting ? "clock" : "retry"}
              loading={state.refreshing}
              disabled={off}
              act={refreshAct}
              onClick={refresh}
              onClickCapture={off ? explainOff : undefined}
              data-help="refresh-numbers"
              className={`perf__refresh${waiting ? " is-waiting" : ""}`}
            >
              {label}
            </Button>
            {/* Not a live region: the clock re-renders it every minute. New numbers are announced by the toast. */}
            {/* The span is what the window look tints (see-through, glass.css), so the tint hugs the words. */}
            <p className="perf__updated">
              <span>{perf.totals.updatedAt ? `Updated ${ago(perf.totals.updatedAt, now)}` : "No numbers yet"}</span>
            </p>
          </div>
        </div>

        <div className="perf__stacks">
          {STATS_ORDER.map((platform: Platform, i) => {
            const s = perf.posts.find((p) => p.platform === platform)!;
            return (
              <PlatformStack
                key={platform}
                ref={(el) => {
                  stacks.current[i] = el;
                }}
                perf={s}
                series={perf.series[platform]}
                best={perf.bestPlatform === platform}
                index={i}
                now={now}
              />
            );
          })}
        </div>
      </div>
      <ClipFollowers perf={perf} />
    </div>
  );
}

function BackRow() {
  return (
    <div className="perf__back">
      <Button icon="chevronLeft" size="sm" onClick={() => goBack("/library")}>
        Back
      </Button>
    </div>
  );
}
