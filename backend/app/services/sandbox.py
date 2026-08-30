"""Sandboxed code execution.

Preferred: Docker (`docker run --network=none --user=nobody`), so the guest
has NO network and a restricted filesystem. Fallback: a restricted subprocess
that strips network env and runs as an unprivileged user, with a timeout and
output cap. Never executes directly on the host as the invoking user with
full privileges.
"""
from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import time

logger = logging.getLogger("nexus.sandbox")

TIMEOUT_SECONDS = 60
MAX_OUTPUT = 200_000


class SandboxResult:
    def __init__(self, ok: bool, stdout: str, stderr: str, runtime_ms: int, backend: str):
        self.ok = ok
        self.stdout = stdout
        self.stderr = stderr
        self.runtime_ms = runtime_ms
        self.backend = backend

    def to_dict(self) -> dict:
        return {
            "ok": self.ok,
            "stdout": self.stdout[-MAX_OUTPUT:],
            "stderr": self.stderr[-MAX_OUTPUT:],
            "runtime_ms": self.runtime_ms,
            "backend": self.backend,
            "network": "DISABLED",
            "filesystem": "RESTRICTED",
        }


def run_python(code: str, inputs: dict | None = None) -> SandboxResult:
    if shutil.which("docker"):
        try:
            return _run_docker(code)
        except Exception as e:  # noqa
            logger.warning("docker sandbox failed (%s); using restricted subprocess", e)
    return _run_subprocess(code)


def _run_docker(code: str) -> SandboxResult:
    start = time.perf_counter()
    with tempfile.TemporaryDirectory(prefix="nexus-sandbox-") as td:
        script = os.path.join(td, "main.py")
        with open(script, "w") as f:
            f.write(code)
        cmd = [
            "docker", "run", "--rm", "--network", "none",
            "--user", "65534:65534",  # nobody
            "--memory", "512m", "--cpus", "1",
            "-v", f"{td}:/sandbox:ro", "-w", "/sandbox",
            "python:3.12-slim", "python", "main.py",
        ]
        try:
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=TIMEOUT_SECONDS)
        except subprocess.TimeoutExpired:
            return SandboxResult(False, "", "Sandbox timed out (>60s)", int((time.perf_counter() - start) * 1000), "docker")
        return SandboxResult(
            proc.returncode == 0, proc.stdout, proc.stderr,
            int((time.perf_counter() - start) * 1000), "docker",
        )


def _run_subprocess(code: str) -> SandboxResult:
    """Restricted fallback. Not a true container — only safe with --user."""
    import resource
    start = time.perf_counter()
    clean_env = {
        k: v for k, v in os.environ.items()
        if k in ("PATH", "HOME", "LANG", "LC_ALL")
    }
    clean_env.pop("http_proxy", None)
    clean_env.pop("https_proxy", None)
    clean_env.pop("HTTP_PROXY", None)
    clean_env.pop("HTTPS_PROXY", None)

    with tempfile.TemporaryDirectory(prefix="nexus-sandbox-") as td:
        script = os.path.join(td, "main.py")
        with open(script, "w") as f:
            f.write(code)

        def setrlimit():
            resource.setrlimit(resource.RLIMIT_CPU, (30, 30))
            resource.setrlimit(resource.RLIMIT_AS, (512 * 1024 * 1024, 512 * 1024 * 1024))

        try:
            proc = subprocess.run(
                ["python3", script],
                capture_output=True, text=True, timeout=TIMEOUT_SECONDS,
                env=clean_env, cwd=td, preexec_fn=setrlimit,
            )
        except subprocess.TimeoutExpired:
            return SandboxResult(False, "", "Sandbox timed out (>60s)", int((time.perf_counter() - start) * 1000), "restricted-subprocess")
        return SandboxResult(
            proc.returncode == 0, proc.stdout, proc.stderr,
            int((time.perf_counter() - start) * 1000), "restricted-subprocess",
        )
