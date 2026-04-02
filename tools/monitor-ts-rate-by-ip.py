#!/usr/bin/env python3
"""
124.194.59.147 등 단일 IP의 /live/*.ts 요청을 nginx 로그 시각(초) 단위로 집계.

모드:
  live   duration_sec 동안 access.log 끝에서 tail -f (버퍼링되면 이벤트가 늦게 보일 수 있음)
  slice  duration_sec 전 시점의 파일 오프셋부터 끝까지 한 번에 읽기 (5분 모니터링에 권장)

Usage:
  monitor-ts-rate-by-ip.py live   <IP> <duration_sec> <out_log_path>
  monitor-ts-rate-by-ip.py slice  <IP> <duration_sec> <out_log_path>
"""
from __future__ import annotations

import os
import re
import sys
import time

LOG_PATH = "/var/log/nginx/access.log"

# 로그: "GET /live/foo.ts HTTP/2.0" — 프로토콜 앞 공백까지가 URI
LINE = re.compile(
    r'^(\S+) .+ \[(\d{2}/\w+/\d{4}):(\d{2}:\d{2}:\d{2}) .+\] "GET (/live/[^\s"]+)'
)


def table_from_uri(uri: str) -> str | None:
    if not uri.endswith(".ts"):
        return None
    name = uri.rsplit("/", 1)[-1]
    m = re.match(r"^(.+)-\d+\.ts$", name)
    return m.group(1) if m else None


def flush_sec(out, sec: str, counts: dict[str, int]) -> None:
    if not counts:
        return
    parts = " ".join(f"{t}={n}" for t, n in sorted(counts.items()))
    out.write(f"{sec}\t{parts}\n")


def parse_lines(out, ip: str, lines: list[str]) -> None:
    last_sec: str | None = None
    counts: dict[str, int] = {}
    for line in lines:
        m = LINE.match(line)
        if not m or m.group(1) != ip:
            continue
        uri = m.group(4)
        tbl = table_from_uri(uri)
        if not tbl:
            continue
        sec = f"{m.group(2)} {m.group(3)}"
        if last_sec is None:
            last_sec = sec
        if sec != last_sec:
            flush_sec(out, last_sec, counts)
            counts = {}
            last_sec = sec
        counts[tbl] = counts.get(tbl, 0) + 1
    if last_sec is not None:
        flush_sec(out, last_sec, counts)


def run_slice(ip: str, duration_sec: int, out_path: str) -> None:
    wall_start = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    try:
        size0 = os.path.getsize(LOG_PATH)
    except OSError as e:
        print(f"stat log: {e}", file=sys.stderr)
        sys.exit(1)
    t0 = time.monotonic()
    time.sleep(duration_sec)
    try:
        size1 = os.path.getsize(LOG_PATH)
    except OSError as e:
        print(f"stat log after wait: {e}", file=sys.stderr)
        sys.exit(1)

    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "a", buffering=1, encoding="utf-8") as out:
        out.write(
            f"# slice wall_start={wall_start} "
            f"ip={ip} duration_sec={duration_sec} mode=slice byte_off={size0}->{size1}\n"
        )
        out.write("# format: nginx_log_sec\ttable=count ...\n")
        if size1 < size0:
            out.write("# log rotated during window; reading from start of file\n")
            start = 0
        else:
            start = size0
        with open(LOG_PATH, "r", encoding="utf-8", errors="replace") as f:
            f.seek(start)
            chunk = f.read()
        lines = chunk.splitlines()
        parse_lines(out, ip, lines)
        out.write(
            f"# slice wall_end={time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} "
            f"lines_in_chunk={len(lines)}\n"
        )
    elapsed = time.monotonic() - t0
    print(f"slice done: {out_path} elapsed={elapsed:.1f}s bytes={size1 - start if size1 >= size0 else size1}")


def run_live(ip: str, duration_sec: int, out_path: str) -> None:
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    out = open(out_path, "a", buffering=1, encoding="utf-8")
    out.write(
        f"# live wall_start={time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())} "
        f"ip={ip} duration_sec={duration_sec} mode=live tail-f\n"
    )
    out.write("# format: nginx_log_sec\ttable=count ...\n")

    f = open(LOG_PATH, "r", encoding="utf-8", errors="replace")
    f.seek(0, os.SEEK_END)
    end = time.monotonic() + duration_sec
    last_sec: str | None = None
    counts: dict[str, int] = {}

    while time.monotonic() < end:
        line = f.readline()
        if not line:
            time.sleep(0.05)
            continue
        m = LINE.match(line)
        if not m or m.group(1) != ip:
            continue
        uri = m.group(4)
        tbl = table_from_uri(uri)
        if not tbl:
            continue
        sec = f"{m.group(2)} {m.group(3)}"
        if last_sec is None:
            last_sec = sec
        if sec != last_sec:
            flush_sec(out, last_sec, counts)
            counts = {}
            last_sec = sec
        counts[tbl] = counts.get(tbl, 0) + 1

    if last_sec is not None:
        flush_sec(out, last_sec, counts)
    out.write(f"# live wall_end={time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\n")
    out.close()
    f.close()


def main() -> int:
    if len(sys.argv) != 5:
        print(
            "usage: monitor-ts-rate-by-ip.py {live|slice} <IP> <duration_sec> <out_log_path>",
            file=sys.stderr,
        )
        return 2
    mode, ip, dur_s, out_path = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    if mode == "slice":
        run_slice(ip, dur_s, out_path)
    elif mode == "live":
        run_live(ip, dur_s, out_path)
    else:
        print("mode must be live or slice", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
