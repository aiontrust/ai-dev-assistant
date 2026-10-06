import json
import os
import time
import urllib.request

from fastapi import APIRouter

router = APIRouter()

# Which repository and workflow the HUD's Build console reports on.
REPO = os.getenv("GITHUB_REPO", "aiontrust/ai-dev-assistant")
WORKFLOW = os.getenv("GITHUB_WORKFLOW", "checks.yml")
BRANCH = os.getenv("GITHUB_BRANCH", "main")
CACHE_SECONDS = 120  # unauthenticated GitHub API allows 60 requests per hour

_cache = {"at": 0.0, "value": None}


def _fetch_latest_run():
    """Latest workflow run on the branch, from the GitHub REST API."""
    url = (
        f"https://api.github.com/repos/{REPO}/actions/workflows/{WORKFLOW}/runs"
        f"?branch={BRANCH}&per_page=1"
    )
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "sati-hud"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=5) as res:
        runs = json.load(res).get("workflow_runs", [])
    return runs[0] if runs else None


def _summarise(run):
    if run is None:
        return {"status": "unknown", "branch": BRANCH, "error": "No runs yet"}
    # GitHub reports status (queued / in_progress / completed) and, once completed, a conclusion.
    status = run.get("conclusion") if run.get("status") == "completed" else run.get("status")
    return {
        "status": status or "unknown",
        "branch": run.get("head_branch") or BRANCH,
        "sha": (run.get("head_sha") or "")[:7],
        "title": run.get("display_title") or "",
        "updated_at": run.get("updated_at"),
        "url": run.get("html_url"),
    }


@router.get("/build")
def build_status():
    """Status of the latest CI run, cached for a couple of minutes."""
    now = time.monotonic()
    if _cache["value"] is not None and now - _cache["at"] < CACHE_SECONDS:
        return _cache["value"]
    try:
        value = _summarise(_fetch_latest_run())
    except Exception as e:  # network down, rate limited, repo renamed...
        value = {"status": "unknown", "branch": BRANCH, "error": str(e)[:120]}
    _cache.update(at=now, value=value)
    return value
