import os
import time

import psutil
from fastapi import APIRouter

router = APIRouter()

# The first cpu_percent(None) call only primes the counter; later calls report
# usage since the previous call, so polling every few seconds gives a live value.
psutil.cpu_percent(interval=None)

# Network throughput is the change in byte counters since the previous call.
_last_net = {"at": time.monotonic(), "counters": psutil.net_io_counters()}


def _network_rates():
    now = time.monotonic()
    counters = psutil.net_io_counters()
    elapsed = max(now - _last_net["at"], 1e-6)
    prev = _last_net["counters"]
    _last_net.update(at=now, counters=counters)
    return {
        "sent": max(0, counters.bytes_sent - prev.bytes_sent) / elapsed,
        "recv": max(0, counters.bytes_recv - prev.bytes_recv) / elapsed,
    }


@router.get("/metrics")
def system_metrics():
    """
    Load of the machine running the backend: CPU, memory and disk in percent,
    network throughput in bytes per second, and the number of processes.
    """
    return {
        "cpu": psutil.cpu_percent(interval=None),
        "memory": psutil.virtual_memory().percent,
        "disk": psutil.disk_usage(os.path.abspath(os.sep)).percent,
        "network": _network_rates(),
        "processes": len(psutil.pids()),
    }
