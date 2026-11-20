// Home › Your followers (docs/CONTRACTS.md §38): how many follow the owner on each app right now, as each app last
// reported it (the daily check). Apps that are not connected share one line. A failed load simply hides the tile.
import { api } from "../../api/index.ts";
import type { FollowersView } from "../../api/types.ts";
import { PlatformMark } from "../../components/PlatformMark.tsx";
import { LinkButton } from "../../components/ui.tsx";
import { PLATFORM_LABEL } from "../../lib/format.ts";
import { followersTileLine, joinNames, totalRow } from "../../lib/followers.ts";
import { useLoad } from "../../lib/hooks.ts";

export function FollowersTile() {
  const { data } = useLoad<FollowersView>(() => api().getFollowers(), "", "followers");
  if (!data) return null;
  const shown = data.platforms.filter((c) => c.state !== "not_connected");
  const off = data.platforms.filter((c) => c.state === "not_connected").map((c) => c.platform);
  const now = Date.now();
  return (
    <section className="home-row followers-tile" aria-labelledby="followers-title" data-help="home-followers">
      <div className="home-row__intro">
        <h2 className="display-2" id="followers-title">
          Your <em>followers</em>.
        </h2>
        <p className="muted">{followersTileLine(data.platforms)}</p>
        {shown.length === 0 ? (
          <LinkButton href="/settings/posting/setup" size="sm" icon="users" iconAfter="chevronRight">
            Set up posting
          </LinkButton>
        ) : null}
      </div>
      <div className="followers-tile__body glass">
        {shown.length ? (
          <ul className="followers-tile__list">
            {shown.map((c) => {
              const row = totalRow(c, now);
              return (
                <li key={c.platform} className="followers-tile__row" data-platform={c.platform} data-state={c.state}>
                  <span className={`money-card__mark is-${c.platform}`} aria-hidden="true">
                    <PlatformMark platform={c.platform} size={16} />
                  </span>
                  <span className="followers-tile__text">
                    <span className="sr-only">{row.spoken}</span>
                    <span aria-hidden="true" className="followers-tile__main">
                      <strong>{PLATFORM_LABEL[c.platform]}:</strong>{" "}
                      {row.value ? <span className="followers-tile__num">{row.value}</span> : <span className="muted">{row.note}</span>}
                    </span>
                    {row.change ? (
                      <span aria-hidden="true" className="followers-tile__change">
                        {row.change}
                      </span>
                    ) : null}
                    {row.fine ? <span className="followers-tile__fine">{row.fine}</span> : null}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
        {off.length ? (
          <p className="followers-tile__off muted" data-off={off.join(",")}>
            Not connected: {joinNames(off)}.
          </p>
        ) : null}
      </div>
    </section>
  );
}
