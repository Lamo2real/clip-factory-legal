"""Follower counts (docs/CONTRACTS.md §38): ``GET /v1/followers`` reads only what the daily money run stored."""

from __future__ import annotations

from typing import Any

from clipfactory_api import db, money
from clipfactory_api.followers import NOT_CHECKED_YET, followers_view
from clipfactory_api.oauth import setup
from clipfactory_api.stats import STATS_ORDER
from conftest import NOW, USER, Call

PK = db.user_pk(USER)


def connect(store: db.Store, *platforms: str) -> None:
    for p in platforms:
        setup.put_account(store, USER, p, "connected", now=NOW, fields={"accountId": f"ACC-{p}"})


def snap(store: db.Store, platform: str, day: str, **numbers: Any) -> None:
    store.put(
        {
            "pk": PK,
            "sk": money.acctstat_sk(platform, day),
            "type": "acctstat",
            "platform": platform,
            "day": day,
            **numbers,
            "readAt": f"{day}T06:00:00Z",
            "source": f"{platform}.api",
            "ttl": 1999999999,
        }
    )


def state(store: db.Store, platform: str, missing: dict[str, str]) -> None:
    store.put({"pk": PK, "sk": money.state_sk(platform), "type": "moneystate", "missing": missing})


def by_platform(view: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {p["platform"]: p for p in view["platforms"]}


def test_always_five_in_order_and_not_connected(store: db.Store) -> None:
    view = followers_view(store, USER)
    assert [p["platform"] for p in view["platforms"]] == list(STATS_ORDER)
    assert [p["word"] for p in view["platforms"]] == ["subscribers", "followers", "followers", "followers", "followers"]
    tiktok = by_platform(view)["tiktok"]
    assert tiktok == {
        "platform": "tiktok",
        "word": "followers",
        "state": "not_connected",
        "count": None,
        "note": "Connect TikTok in Settings › Posting › Set up posting.",
    }


def test_disconnected_account_counts_as_not_connected(store: db.Store) -> None:
    setup.put_account(store, USER, "x", "not_connected", now=NOW)
    snap(store, "x", "2026-11-14", followers=50)
    assert by_platform(followers_view(store, USER))["x"]["state"] == "not_connected"


def test_youtube_counted_with_week_change_and_rounded(store: db.Store) -> None:
    connect(store, "youtube")
    snap(store, "youtube", "2026-11-08", subscribers=1100)
    snap(store, "youtube", "2026-11-14", subscribers=1180)
    snap(store, "youtube", "2026-11-15", subscribers=1200)
    assert by_platform(followers_view(store, USER))["youtube"] == {
        "platform": "youtube",
        "word": "subscribers",
        "state": "counted",
        "count": 1200,
        "checkedAt": "2026-11-15T06:00:00Z",
        "weekChange": 100,
        "rounded": True,
    }


def test_counted_without_a_snapshot_seven_days_before(store: db.Store) -> None:
    connect(store, "instagram")
    snap(store, "instagram", "2026-11-09", followers=10)  # 6 days before, not 7
    snap(store, "instagram", "2026-11-15", followers=40)
    got = by_platform(followers_view(store, USER))["instagram"]
    assert got == {
        "platform": "instagram",
        "word": "followers",
        "state": "counted",
        "count": 40,
        "checkedAt": "2026-11-15T06:00:00Z",
    }


def test_week_change_omitted_when_old_snapshot_lacks_the_key(store: db.Store) -> None:
    connect(store, "facebook")
    snap(store, "facebook", "2026-11-08", minutes60=5)
    snap(store, "facebook", "2026-11-15", followers=7)
    got = by_platform(followers_view(store, USER))["facebook"]
    assert got["count"] == 7
    assert "weekChange" not in got
    assert "rounded" not in got


def test_newest_without_the_key_falls_back_to_older(store: db.Store) -> None:
    connect(store, "tiktok")
    snap(store, "tiktok", "2026-11-07", followers=80)
    snap(store, "tiktok", "2026-11-14", followers=90)
    snap(store, "tiktok", "2026-11-15", viewsTotal=5000)
    snap(store, "tiktok", "2026-11-16", followers=True, viewsTotal=5100)  # a bool is not a count
    got = by_platform(followers_view(store, USER))["tiktok"]
    assert got["state"] == "counted"
    assert got["count"] == 90
    assert got["checkedAt"] == "2026-11-14T06:00:00Z"
    assert got["weekChange"] == 10


def test_missing_sentence_from_money_state(store: db.Store) -> None:
    connect(store, "tiktok", "youtube")
    snap(store, "tiktok", "2026-11-15", viewsTotal=5000)
    state(store, "tiktok", {"followers": "Press Allow follower reading once TikTok approves it.", "views30": "x"})
    state(store, "youtube", {"subscribers": "Your subscriber count is hidden on YouTube."})
    got = by_platform(followers_view(store, USER))
    assert got["tiktok"] == {
        "platform": "tiktok",
        "word": "followers",
        "state": "missing",
        "count": None,
        "note": "Press Allow follower reading once TikTok approves it.",
    }
    assert got["youtube"]["state"] == "missing"
    assert got["youtube"]["note"] == "Your subscriber count is hidden on YouTube."


def test_not_checked_yet(store: db.Store) -> None:
    connect(store, "x", "facebook")
    state(store, "facebook", {"followers": "  ", "minutes60": "Meta does not share this."})
    got = by_platform(followers_view(store, USER))
    for p in ("x", "facebook"):
        assert got[p] == {
            "platform": p,
            "word": "followers",
            "state": "not_checked_yet",
            "count": None,
            "note": NOT_CHECKED_YET,
        }


def test_no_internal_keys_leak(store: db.Store) -> None:
    connect(store, *STATS_ORDER)
    for p in STATS_ORDER:
        snap(store, p, "2026-11-08", subscribers=1, followers=1)
        snap(store, p, "2026-11-15", subscribers=2, followers=2, verifiedFollowers=1, subscriptionType="None")
    allowed = {"platform", "word", "state", "count", "checkedAt", "weekChange", "rounded", "note"}
    view = followers_view(store, USER)
    for p in view["platforms"]:
        assert set(p) <= allowed
        assert p["state"] == "counted"
    assert "ACC-" not in repr(view)
    assert "ACCTSTAT" not in repr(view)


def test_route_registers_owner_and_answers(call: Call, store: db.Store) -> None:
    connect(store, "youtube")
    snap(store, "youtube", "2026-11-15", subscribers=300)
    status, body = call("GET", "/v1/followers")
    assert status == 200
    assert [p["platform"] for p in body["platforms"]] == list(STATS_ORDER)
    assert body["platforms"][0]["count"] == 300
    assert store.get(money.OWNERS_PK, money.owner_sk(USER)) is not None
    # Calling again keeps the first registration.
    assert call("GET", "/v1/followers")[0] == 200


def test_route_needs_a_signed_in_owner(call: Call) -> None:
    status, _ = call("GET", "/v1/followers", sub=None)
    assert status == 401
