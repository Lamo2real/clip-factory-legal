"""/v1/followers: each platform's follower or subscriber total right now (docs/CONTRACTS.md §38).

Reading only: the numbers come from the snapshots the daily money run (``cf-prod-money``) already stores.
"""

from __future__ import annotations

from .. import money
from ..app import App
from ..followers import followers_view
from ..http import Request, Response, ok


def get_followers(app: App, req: Request) -> Response:
    # Like GET /v1/money: put the owner on the daily run's list, so their numbers start being read.
    money.register_owner(app.store, req.user_id, app.clock())
    return ok(followers_view(app.store, req.user_id))
