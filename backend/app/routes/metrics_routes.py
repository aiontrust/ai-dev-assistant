import psutil
from fastapi import APIRouter

router = APIRouter()

# The first cpu_percent(None) call only primes the counter; later calls report
# usage since the previous call, so polling every few seconds gives a live value.
psutil.cpu_percent(interval=None)


@router.get("/metrics")
def system_metrics():
    """CPU and memory load of the machine running the backend, in percent."""
    return {
        "cpu": psutil.cpu_percent(interval=None),
        "memory": psutil.virtual_memory().percent,
    }
