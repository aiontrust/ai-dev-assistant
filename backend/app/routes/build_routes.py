import json
import os
import time
import urllib.request

from fastapi import APIRouter

router = APIRouter()

# What the HUD's GPT console reports on: CI checks, the Docker image workflow and
# Cloudflare's Workers Builds (which posts its result to GitHub as a check run).
# Settings use a HUD_ prefix: GitHub Actions itself sets GITHUB_WORKFLOW and friends.
REPO = os.getenv("HUD_GITHUB_REPO", "aiontrust/ai-dev-assistant")
BRANCH = os.getenv("HUD_GITHUB_BRANCH", "main")
CI_WORKFLOW = os.getenv("HUD_CI_WORKFLOW", "checks.yml")
DOCKER_WORKFLOW = os.getenv("HUD_DOCKER_WORKFLOW", "docker-publish.yml")
CLOUDFLARE_CHECK = "Workers Builds"
# Three GitHub calls per refresh; unauthenticated, GitHub allows 60 an hour.
CACHE_SECONDS = 300

_cache = {"at": 0.0, "value": None}


def _get(path):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "sati-hud"}
    token = os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(f"https://api.github.com/repos/{REPO}/{path}", headers=headers)
    with urllib.request.urlopen(request, timeout=5) as res:
        return json.load(res)


def _state(status, conclusion):
    """GitHub reports status (queued / in_progress / completed) and, once completed, a conclusion."""
    return (conclusion if status == "completed" else status) or "unknown"


def _latest_run(workflow, branch=None):
    query = f"?branch={branch}&per_page=1" if branch else "?per_page=1"
    runs = _get(f"actions/workflows/{workflow}/runs{query}").get("workflow_runs", [])
    if not runs:
        return {"status": "none"}
    run = runs[0]
    return {
        "status": _state(run.get("status"), run.get("conclusion")),
        "branch": run.get("head_branch"),
        "sha": (run.get("head_sha") or "")[:7],
        "title": run.get("display_title") or "",
        "updated_at": run.get("updated_at"),
        "url": run.get("html_url"),
    }


def _cloudflare():
    runs = _get(f"commits/{BRANCH}/check-runs").get("check_runs", [])
    check = next((c for c in runs if c.get("name", "").startswith(CLOUDFLARE_CHECK)), None)
    if check is None:
        return {"status": "none"}
    return {
        "status": _state(check.get("status"), check.get("conclusion")),
        "branch": BRANCH,
        "sha": (check.get("head_sha") or "")[:7],
        "title": check.get("name"),
        "updated_at": check.get("completed_at") or check.get("started_at"),
        "url": check.get("details_url"),
    }


SOURCES = {
    "ci": lambda: _latest_run(CI_WORKFLOW, BRANCH),
    "cloudflare": _cloudflare,
    "docker": lambda: _latest_run(DOCKER_WORKFLOW),
}


def _collect():
    report = {}
    for name, fetch in SOURCES.items():
        try:
            report[name] = fetch()
        except Exception as e:  # network down, rate limited, workflow renamed...
            report[name] = {"status": "unknown", "error": str(e)[:120]}
    return report


@router.get("/build")
def build_status():
    """Latest CI, Cloudflare and Docker build results, cached for a few minutes."""
    now = time.monotonic()
    if _cache["value"] is None or now - _cache["at"] >= CACHE_SECONDS:
        _cache.update(at=now, value=_collect())
    return _cache["value"]
