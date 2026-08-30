"""Air-gap network enforcement.

Blocks any outbound request to non-loopback/private destinations when the
workbench is in air-gap mode. Every attempt is logged to the network monitor.
"""
from __future__ import annotations

import ipaddress
import logging
import socket
from datetime import datetime, timezone
from urllib.parse import urlparse

from app.core import db
from app.core.config import get_settings

logger = logging.getLogger("nexus.netguard")

ALLOWED_LOOPBACK = {"127.0.0.1", "localhost", "::1"}


def _resolve(host: str):
    try:
        return socket.gethostbyname(host)
    except Exception:
        return None


def is_local(destination: str) -> bool:
    """True if destination is loopback or RFC1918/ULA (on-premise)."""
    host = destination
    if "://" in destination:
        host = urlparse(destination).hostname or destination
    if host in ALLOWED_LOOPBACK:
        return True
    ip = _resolve(host)
    if not ip:
        return host.endswith(".local")  # mDNS / LAN hostname heuristic
    try:
        addr = ipaddress.ip_address(ip)
        return (
            addr.is_loopback
            or addr.is_private
            or addr.is_link_local
            or addr.is_multicast
            or addr.is_reserved
            or ip.startswith("10.")
        )
    except ValueError:
        return False


def guard_request(destination: str, protocol: str = "HTTP", note: str = "") -> bool:
    """Return True if the request is permitted. Logs the decision."""
    settings = get_settings()
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    if settings.air_gap and not is_local(destination):
        db.log_network(ts, "Workbench", destination, protocol, "BLOCKED", "0 B", note or "External denied")
        db.bump_counter("blocked_requests")
        return False
    db.log_network(ts, "Workbench", destination, protocol, "ALLOWED", "0 B", note or "Local")
    db.bump_counter("allowed_requests")
    return True


def local_request() -> None:
    db.bump_counter("local_requests")
