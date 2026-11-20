"""Follower counts: each platform's follower or subscriber total right now (docs/CONTRACTS.md §38).

``followers_view`` builds ``FollowersView``: always five platforms in ``STATS_ORDER``, read only from what the daily
money run (``cf-prod-money``) already stores: the ``ACCTSTAT#{platform}#{day}`` snapshots and the ``missing`` map on
``MONEYSTATE#{platform}``. No platform is called here, nothing is written, and no token, account id, raw body or
key attribute is ever in the answer.
"""

from __future__ import annotations

from collections.abc import Mapping
from datetime import date, timedelta
from typing import Any

from . import db, money, posts
from .stats import STATS_ORDER

Item = dict[str, Any]
NEWEST = 10
WEEK = timedelta(days=7)
NOT_CHECKED_YET = "Clip Factory checks once a day. Your number shows after the next check."


def word(platform: str) -> str:
    return "subscribers" if platform == "youtube" else "followers"


def _count(item: Mapping[str, Any] | None, key: str) -> int | None:
    value = (item or {}).get(key)
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None


def _day(item: Mapping[str, Any], platform: str) -> date | None:
    raw = item.get("day")
    if not isinstance(raw, str):
        raw = str(item.get("sk") or "").removeprefix(money.acctstat_prefix(platform))
    try:
        return date.fromisoformat(raw)
    except ValueError:
        return None


def _counted(store: db.Store, pk: str, platform: str, *, item: Mapping[str, Any], count: int) -> Item:
    key = word(platform)
    out: Item = {"platform": platform, "word": key, "state": "counted", "count": count}
    if isinstance(item.get("readAt"), str):
        out["checkedAt"] = item["readAt"]
    day = _day(item, platform)
    if day is not None:
        before = _count(store.get(pk, money.acctstat_sk(platform, (day - WEEK).isoformat())), key)
        if before is not None:
            out["weekChange"] = count - before
    if platform == "youtube":
        out["rounded"] = True  # YouTube rounds subscriber counts
    return out


def follower_count(store: db.Store, user_id: str, platform: str, *, connected: bool) -> Item:
    key = word(platform)
    if not connected:
        note = f"Connect {money.label(platform)} in Settings › Posting › Set up posting."
        return {"platform": platform, "word": key, "state": "not_connected", "count": None, "note": note}
    pk = db.user_pk(user_id)
    page = store.query_page(pk, money.acctstat_prefix(platform), newest_first=True, limit=NEWEST)
    for item in page.items:
        count = _count(item, key)
        if count is not None:
            return _counted(store, pk, platform, item=item, count=count)
    missing = (store.get(pk, money.state_sk(platform)) or {}).get("missing")
    sentence = missing.get(key) if isinstance(missing, Mapping) else None
    if isinstance(sentence, str) and sentence.strip():
        return {"platform": platform, "word": key, "state": "missing", "count": None, "note": sentence}
    return {"platform": platform, "word": key, "state": "not_checked_yet", "count": None, "note": NOT_CHECKED_YET}


def followers_view(store: db.Store, user_id: str) -> Item:
    """``FollowersView``: one ``FollowerCount`` per platform, always five, in ``STATS_ORDER``."""
    connected = {str(a.get("platform")) for a in posts.account_items(store, user_id) if a.get("status") == "connected"}
    return {"platforms": [follower_count(store, user_id, p, connected=p in connected) for p in STATS_ORDER]}
