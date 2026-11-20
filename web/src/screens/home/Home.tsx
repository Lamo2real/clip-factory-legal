import { api } from "../../api/index.ts";
import type { Clip, Job } from "../../api/types.ts";
import { Icon } from "../../components/Icon.tsx";
import { PlatformMark } from "../../components/PlatformMark.tsx";
import { A, Button, ErrorPanel, LinkButton, Progress, Skeleton, Swash } from "../../components/ui.tsx";
import { count, MOMENT_LABEL, plural, timecode } from "../../lib/format.ts";
import { useLoad } from "../../lib/hooks.ts";
import { useDeletedJobs } from "../../lib/jobDeletes.ts";
import { useLiveEvents, useLivePoll } from "../../lib/live.ts";
import { applyClipEvent, applyJobEvent, withMedia } from "../../lib/liveCache.ts";
import { GetAppBanner } from "../../components/GetApp.tsx";
import { NewJobForm } from "./NewJobForm.tsx";
import { FollowersTile } from "./FollowersTile.tsx";
import { MoneyTile } from "./MoneyTile.tsx";
import { StreamersRow } from "./StreamersRow.tsx";
import { LiveLine } from "../jobs/LiveLine.tsx";
import { jobPercent, jobProgress } from "../../lib/jobProgress.ts";

export interface HomeData {
  jobs: Job[];
  review: Clip[];
  /** Total views, or null when the numbers could not be loaded (the jobs and clips still show). */
  views: number | null;
  postsChecked: number;
}

/**
 * Jobs and clips must load for Home to show; the views total is extra, so a failed numbers call only blanks the
 * stat instead of hiding the lists that did load.
 */
export async function loadHome(): Promise<HomeData> {
  const [jobs, review, insights] = await Promise.all([
    api().listJobs({ limit: 6 }),
    api().listClips({ status: "review" }),
    api()
      .insights()
      .catch(() => null),
  ]);
  const checked = insights?.posts.filter((p) => p.metrics) ?? [];
  return {
    jobs: jobs.jobs,
    review,
    views: insights ? checked.reduce((n, p) => n + (p.metrics?.views ?? 0), 0) : null,
    postsChecked: checked.length,
  };
}

export function Home() {
  const { data, error, setData, reload } = useLoad(loadHome, "", "home");
  // Nothing loaded and the last try failed: say so and offer Try again, instead of skeletons forever (§12.4).
  const failed = !data && error ? error : null;
  // Deleted jobs (and their Review clips, when those go too) leave at once; Undo brings them back (§34.5).
  const gone = useDeletedJobs();
  const view = data
    ? { ...data, jobs: data.jobs.filter((j) => !gone.jobs.has(j.jobId)), review: data.review.filter((c) => !gone.reviewJobs.has(c.jobId)) }
    : data;
  const working = view?.jobs.filter((j) => j.status === "running" || j.status === "queued") ?? [];
  const inReview = (c: Clip) => c.status === "review";
  useLiveEvents(
    (e) => {
      if (e.type === "job") setData((d) => (d ? { ...d, jobs: applyJobEvent(d.jobs, e, 6) } : d));
      else if (e.type === "clip") {
        const missing = data ? applyClipEvent(data.review, e, inReview).needMedia : [];
        setData((d) => (d ? { ...d, review: applyClipEvent(d.review, e, inReview).clips } : d));
        for (const clipId of missing)
          void api()
            .getClip(clipId)
            .then((fresh) => setData((d) => (d ? { ...d, review: withMedia(d.review, fresh) } : d)))
            .catch(() => undefined);
      } else if (e.type === "post") void reload(); // New numbers: the views total is worked out again.
    },
    () => void reload(),
  );
  useLivePoll(
    async () => {
      const jobs = await api().listJobs({ limit: 6 });
      setData((d) => (d ? { ...d, jobs: jobs.jobs } : d));
    },
    working.length > 0,
  );

  return (
    <div className="home">
      <GetAppBanner />
      <section className="hero glass glass--green glass--refract" aria-labelledby="hero-title">
        <div className="hero__main">
          <h1 className="hero__title" id="hero-title">
            Clips worth <Swash>posting</Swash>.
          </h1>
          <p className="hero__lede">
            Paste a link to a stream or a video. Clip Factory finds the best moments and makes short clips. You
            pick the ones to upload.
          </p>
          <NewJobForm />
        </div>
        <div className="hero__side">
          <WorkingCard jobs={view?.jobs ?? null} failed={failed !== null} onRetry={() => void reload()} />
          <CoverStack clips={view?.review ?? []} />
        </div>
      </section>

      <section className="home-row" aria-labelledby="ready-title">
        <div className="home-row__intro">
          <h2 className="display-2" id="ready-title">
            Ready for <em>review</em>.
          </h2>
          <p className="muted">
            {failed
              ? "Could not check for new clips."
              : view
              ? view.review.length
                ? `${plural(view.review.length, "clip")} waiting. Tap Go to Review to upload or throw away each one.`
                : "Nothing to check yet. Paste a link above and tap Make clips."
              : "Checking for new clips…"}
          </p>
          <LinkButton href="/review" size="sm" icon="review" iconAfter="chevronRight">
            Go to Review
          </LinkButton>
        </div>
        <div className="home-row__cards">
          {failed ? (
            <div className="home-row__error">
              <ErrorPanel message={failed} onRetry={() => void reload()} />
            </div>
          ) : view ? (
            view.review.slice(0, 3).map((c) => <ClipTeaser key={c.clipId} clip={c} />)
          ) : (
            <>
              <Skeleton className="teaser-skel" />
              <Skeleton className="teaser-skel" />
              <Skeleton className="teaser-skel" />
            </>
          )}
          {view && view.review.length === 0 ? (
            <div className="teaser teaser--empty glass">
              <Icon name="review" size={26} />
              <p>All done here.</p>
            </div>
          ) : null}
        </div>
        <Stat views={data?.views ?? null} posts={data?.postsChecked ?? 0} unavailable={data !== null && data.views === null} />
      </section>
      <MoneyTile />
      <FollowersTile />
      <StreamersRow />
    </div>
  );
}

function WorkingCard({ jobs, failed, onRetry }: { jobs: Job[] | null; failed: boolean; onRetry: () => void }) {
  const working = jobs?.filter((j) => j.status === "running" || j.status === "queued") ?? [];
  const latest = jobs?.find((j) => j.status === "ready");
  return (
    <aside className="working glass" aria-labelledby="working-title">
      <div className="working__head">
        <h2 className="working__title" id="working-title">
          Working now
        </h2>
        <A href="/jobs" className="text-link">
          All jobs
        </A>
      </div>
      {jobs === null && failed ? (
        <div className="working__failed">
          <p className="working__idle">Could not check what is being made.</p>
          <Button size="sm" icon="retry" act="retry" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : jobs === null ? (
        <>
          <Skeleton className="line-skel" />
          <Skeleton className="line-skel" />
        </>
      ) : working.length ? (
        <ul className="working__list" aria-live="polite">
          {working.slice(0, 3).map((j) => {
            const step = j.steps.find((s) => s.status === "running");
            return (
              <li key={j.jobId}>
                <A href={`/jobs/${j.jobId}`} className="working__job">
                  <span className="working__mark">
                    <PlatformMark platform={j.source.platform} size={18} />
                  </span>
                  <span className="working__text">
                    <span className="working__name clamp-1">{j.source.title ?? j.source.url ?? "Video"}</span>
                    <LiveLine
                      job={j}
                      compact
                      className="working__step"
                      fallback={
                        <span className="working__step clamp-1">
                          {j.status === "queued" ? "Waiting to start" : (step?.message ?? step?.label ?? "Working")}
                        </span>
                      }
                    />
                  </span>
                  <span className="working__pct">{jobPercent(j)}%</span>
                </A>
                <Progress value={jobProgress(j)} label={`${j.source.title ?? "Job"} progress`} />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="working__idle">
          Nothing is being made right now.
          {latest ? (
            <>
              {" "}
              Last finished: <A href={`/jobs/${latest.jobId}`}>{latest.source.title ?? "your last job"}</A> with{" "}
              {plural(latest.clipCount, "clip")}.
            </>
          ) : null}
        </p>
      )}
    </aside>
  );
}

/** The newest covers, fanned like prints on a table: proof of what the agent makes. Decorative. */
function CoverStack({ clips }: { clips: Clip[] }) {
  const covers = clips.filter((c) => c.coverUrl).slice(0, 3);
  if (covers.length === 0) return null;
  return (
    <div className="cover-stack" aria-hidden="true">
      {covers.map((c, i) => (
        <span key={c.clipId} className="cover-stack__item" style={{ ["--n" as string]: i - (covers.length - 1) / 2 }}>
          <img src={c.coverUrl} alt="" />
        </span>
      ))}
    </div>
  );
}

function ClipTeaser({ clip }: { clip: Clip }) {
  return (
    <A href={`/review#clip-${clip.clipId}`} className="teaser glass">
      <span className="teaser__media">
        {clip.coverUrl ? <img src={clip.coverUrl} alt="" loading="lazy" /> : null}
        <span className="teaser__tag">{MOMENT_LABEL[clip.momentType]}</span>
      </span>
      <span className="teaser__body">
        <span className="teaser__hook clamp-2">{clip.hook}</span>
        <span className="teaser__meta">
          <span>{timecode(clip.durationSec)}</span>
          <span className="teaser__score" aria-label={`Score ${clip.score} out of 10`}>
            {clip.score}/10
          </span>
        </span>
      </span>
    </A>
  );
}

function Stat({ views, posts, unavailable }: { views: number | null; posts: number; unavailable: boolean }) {
  return (
    <div className="stat glass">
      <span className="stat__value">{views === null ? "–" : count(views)}</span>
      <span className="stat__dots" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} />
        ))}
      </span>
      <span className="stat__label">views after 48 hours</span>
      <span className="stat__sub">
        {unavailable
          ? "Could not get the numbers right now. Come back to Home later to see them."
          : posts
            ? `across ${plural(posts, "post")}`
            : "Shown once clips are posted"}
      </span>
    </div>
  );
}
