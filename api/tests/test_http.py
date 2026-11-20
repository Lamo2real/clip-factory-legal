from __future__ import annotations

import base64
import json

from clipfactory_api.app import App
from clipfactory_api.http import MAX_BODY_BYTES, dispatch
from clipfactory_api.routes import ROUTES
from conftest import Call, make_event


def test_health_is_public(call: Call) -> None:
    status, body = call("GET", "/v1/health", sub=None)
    assert status == 200
    assert body == {"ok": True, "version": "abc123"}


def test_protected_route_without_sub_is_unauthorized(call: Call) -> None:
    status, body = call("GET", "/v1/me", sub=None)
    assert status == 401
    assert body["error"]["code"] == "unauthorized"


def test_unknown_path_is_not_found(call: Call) -> None:
    status, body = call("GET", "/v1/nope")
    assert status == 404
    assert body == {"error": {"code": "not_found", "message": "That address does not exist."}, "requestId": "req-1"}


def test_every_error_body_carries_the_request_id(call: Call) -> None:
    for method, path, kw in (
        ("GET", "/v1/me", {"sub": None}),
        ("DELETE", "/v1/jobs", {}),
        ("PUT", "/v1/settings", {"raw": "{"}),
    ):
        status, body = call(method, path, **kw)
        assert status >= 400
        assert body["requestId"] == "req-1"


def test_response_headers_are_merged(app: App) -> None:
    from clipfactory_api.http import Response, route

    def handler(_app: App, _req: object) -> Response:
        return Response(200, {"ok": True}, {"Retry-After": "5"})

    out = dispatch(make_event("GET", "/v1/x"), app, [route("GET", "/v1/x", handler)])  # type: ignore[arg-type]
    assert out["headers"]["retry-after"] == "5"
    assert out["headers"]["content-type"] == "application/json"


def test_wrong_method_on_known_path(call: Call) -> None:
    status, body = call("DELETE", "/v1/jobs")
    assert status == 405
    assert body["error"]["code"] == "bad_request"


def test_options_is_harmless(app: App) -> None:
    out = dispatch(make_event("OPTIONS", "/v1/jobs", sub=None), app, ROUTES)
    assert out["statusCode"] == 204
    assert out["body"] == ""


def test_invalid_json(call: Call) -> None:
    status, body = call("PUT", "/v1/settings", raw="{nope")
    assert status == 400
    assert body["error"]["message"] == "The request body is not valid JSON."


def test_body_must_be_object(call: Call) -> None:
    status, body = call("PUT", "/v1/settings", raw="[1, 2]")
    assert status == 400
    assert body["error"]["code"] == "bad_request"


def test_body_too_large(call: Call) -> None:
    status, body = call("PUT", "/v1/settings", raw=json.dumps({"x": "a" * (MAX_BODY_BYTES + 1)}))
    assert status == 413
    assert body["error"]["code"] == "too_large"


def test_base64_body(app: App) -> None:
    event = make_event("PUT", "/v1/settings")
    event["body"] = base64.b64encode(json.dumps({"soundEnabled": False}).encode()).decode()
    event["isBase64Encoded"] = True
    out = dispatch(event, app, ROUTES)
    assert out["statusCode"] == 200
    assert json.loads(out["body"])["settings"]["soundEnabled"] is False


def test_named_stage_prefix_is_stripped(app: App) -> None:
    event = make_event("GET", "/prod/v1/health", sub=None)
    event["requestContext"]["stage"] = "prod"
    assert dispatch(event, app, ROUTES)["statusCode"] == 200


def test_trailing_slash(call: Call) -> None:
    assert call("GET", "/v1/health/", sub=None)[0] == 200


def test_unexpected_error_is_internal_without_details(app: App) -> None:
    def boom(*_: object, **__: object) -> None:
        raise RuntimeError("secret detail")

    app.store.query_all = boom  # type: ignore[method-assign]
    out = dispatch(make_event("GET", "/v1/me"), app, ROUTES)
    assert out["statusCode"] == 500
    body = json.loads(out["body"])
    assert body["error"]["code"] == "internal"
    assert "secret" not in out["body"]


def test_responses_are_json_and_not_cached(app: App) -> None:
    out = dispatch(make_event("GET", "/v1/health", sub=None), app, ROUTES)
    assert out["headers"]["content-type"] == "application/json"
    assert out["headers"]["cache-control"] == "no-store"


def test_app_factory_is_lazy(app: App) -> None:
    built = []

    def factory() -> App:
        built.append(1)
        return app

    dispatch(make_event("GET", "/v1/nope"), factory, ROUTES)
    assert built == []
    dispatch(make_event("GET", "/v1/health", sub=None), factory, ROUTES)
    assert built == [1]


def test_every_contract_route_is_registered() -> None:
    expected = {
        ("GET", "/v1/health"),
        ("GET", "/v1/me"),
        ("POST", "/v1/uploads"),
        ("POST", "/v1/jobs"),
        ("GET", "/v1/jobs"),
        ("GET", "/v1/jobs/X"),
        ("POST", "/v1/jobs/X/cancel"),
        ("POST", "/v1/jobs/X/retry"),
        ("POST", "/v1/jobs/X/mac-progress"),
        ("POST", "/v1/jobs/X/source-upload"),
        ("POST", "/v1/jobs/X/source-upload/complete"),
        ("GET", "/v1/clips"),
        ("GET", "/v1/clips/X"),
        ("PATCH", "/v1/clips/X"),
        ("POST", "/v1/clips/X/confirm"),
        ("POST", "/v1/clips/X/decline"),
        ("GET", "/v1/clips/X/similar"),
        ("GET", "/v1/skills"),
        ("POST", "/v1/skills/uploads"),
        ("POST", "/v1/skills"),
        ("GET", "/v1/skills/X"),
        ("PUT", "/v1/skills/X"),
        ("PATCH", "/v1/skills/X"),
        ("DELETE", "/v1/skills/X"),
        ("GET", "/v1/skills/X/content"),
        ("POST", "/v1/skills/X/sections"),  # §38
        ("GET", "/v1/settings"),
        ("PUT", "/v1/settings"),
        ("GET", "/v1/lessons"),
        ("PATCH", "/v1/lessons/X"),
        ("DELETE", "/v1/lessons/X"),
        ("POST", "/v1/settings/cookies"),
        ("DELETE", "/v1/settings/cookies"),
        ("GET", "/v1/accounts"),
        ("POST", "/v1/accounts/youtube/connect"),
        ("GET", "/v1/posts"),
        ("GET", "/v1/insights"),
        ("GET", "/v1/clips/X/performance"),
        ("POST", "/v1/clips/X/stats/refresh"),
        ("GET", "/v1/weeks/2026-W46"),
        ("PUT", "/v1/weeks/2026-W46/best"),
        # §17.4: the posting setup
        ("GET", "/v1/setup"),
        ("GET", "/v1/setup/youtube"),
        ("PATCH", "/v1/setup/youtube"),
        ("PUT", "/v1/setup/youtube/keys"),
        ("DELETE", "/v1/setup/youtube/keys"),
        ("POST", "/v1/setup/youtube/check"),
        ("POST", "/v1/setup/tiktok/verification-file"),
        ("DELETE", "/v1/setup/tiktok/verification-file/tiktokAbCd1234.txt"),
        ("POST", "/v1/accounts/youtube/choose"),
        ("DELETE", "/v1/accounts/youtube"),
        ("GET", "/v1/accounts/tiktok/creator-info"),
        # §24: Follow creators
        ("GET", "/v1/follows"),
        ("POST", "/v1/follows"),
        ("POST", "/v1/follows/lookup"),
        ("PUT", "/v1/follows/keys/twitch"),
        ("DELETE", "/v1/follows/keys/kick"),
        ("POST", "/v1/follows/keys/youtube-read/check"),
        ("PATCH", "/v1/follows/twitch/somestreamer"),
        ("DELETE", "/v1/follows/kick/someone"),
        # §25: Real earnings
        ("GET", "/v1/money"),
        ("POST", "/v1/money/refresh"),
        ("POST", "/v1/money/seen"),
        ("PUT", "/v1/money/country"),
        ("GET", "/v1/money/youtube/days"),
        ("GET", "/v1/money/summary"),
        ("GET", "/v1/money/clips"),
        # §19.6: Ask Clip Factory
        ("GET", "/v1/help"),
        ("POST", "/v1/help/answers"),
        # §28: Ask as a full assistant
        ("POST", "/v1/help/files"),
        ("DELETE", "/v1/help/files/AAAAAAAAAAAAAAAAAAAAAA"),
        ("POST", "/v1/help/asks"),
        ("POST", "/v1/help/asks/0b7c3c1e-1d2f-4a5b-8c9d-0e1f2a3b4c5d/stop"),
        ("PUT", "/v1/help/search-key"),
        ("DELETE", "/v1/help/search-key"),
        # §32: notifications
        ("GET", "/v1/push/key"),
        ("GET", "/v1/push/devices"),
        ("PUT", "/v1/push/devices/phone-12345678"),
        ("DELETE", "/v1/push/devices/phone-12345678"),
        ("POST", "/v1/push/test"),
        # §34: delete jobs
        ("DELETE", "/v1/jobs/01J0000000000000000000000A"),
        ("POST", "/v1/jobs/delete"),
    }
    for method, path in expected:
        assert any(r.method == method and r.pattern.match(path) for r in ROUTES), (method, path)
    assert len(ROUTES) == len(expected)
