#!/usr/bin/env python3
"""PreToolUse hook: validates the POST-edit content, guards script-owned transitions,
and enforces the worker write-set. Exit 2 = block (stderr explains), 0 = allow."""
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

HOOK_ROOT = Path(__file__).resolve().parent.parent.parent
ROOT = Path(os.environ.get("CLAUDE_PROJECT_DIR") or HOOK_ROOT).resolve()
GENERATED = {"index.md", "DECISIONS.md", "packet.md", "map.md"}
SCRIPT_OWNED = {"ready", "done"}

def block(msg):
    print(msg, file=sys.stderr)
    sys.exit(2)

def fm_field(text, key):
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    head = text[:end] if end != -1 else text
    m = re.search(rf"^{key}:\s*(.+)$", head, re.M)
    return m.group(1).strip() if m else None

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    ti = data.get("tool_input") or {}
    fp = ti.get("file_path")
    if not isinstance(fp, str) or not fp:
        sys.exit(0)
    p = Path(fp)
    p = (ROOT / p).resolve() if not p.is_absolute() else p.resolve()
    try:
        rel = p.relative_to(ROOT)
    except ValueError:
        sys.exit(0)  # outside this repo — not ours to police

    in_mural = len(rel.parts) > 0 and rel.parts[0] == "mural"
    if p.name in GENERATED and in_mural:
        block(f"{p.name} is GENERATED — run scripts/mural index (or packet) instead")

    # candidate (post-edit) content
    cand = None
    if "content" in ti:
        cand = ti["content"]
    elif "new_string" in ti and p.exists():
        cur = p.read_text()
        old = ti.get("old_string", "")
        if old:
            cand = cur.replace(old, ti["new_string"]) if ti.get("replace_all") \
                else cur.replace(old, ti["new_string"], 1)

    if in_mural and p.suffix == ".md" and isinstance(cand, str):
        # 1. schema lint on the candidate, not the pre-image
        with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as tf:
            tf.write(cand)
            tmp = tf.name
        try:
            r = subprocess.run([str(ROOT / "scripts" / "mural"), "check", "--file", tmp],
                               capture_output=True, text=True)
        finally:
            os.unlink(tmp)
        if r.returncode != 0:
            block("proposed content fails mural check:\n" + r.stderr)
        # 2. script-owned transitions: ready/done and receipts belong to the CLI
        old_status = fm_field(p.read_text(), "status") if p.exists() else None
        new_status = fm_field(cand, "status")
        if new_status in SCRIPT_OWNED and old_status != new_status:
            block(f"status -> {new_status} is a script-owned transition "
                  f"(use scripts/mural gate ready / done)")
        old_text = p.read_text() if p.exists() else ""
        for key in ("receipt_sha", "receipt_time", "receipt_tests"):
            if f"{key}:" in cand and f"{key}:" not in old_text:
                block(f"{key} is written only by scripts/mural done — receipts cannot be forged")

    # 3. worker write-set allowlist
    issue = os.environ.get("MURAL_ISSUE")
    if issue:
        spec = ROOT / "mural" / "issues" / issue / "spec.md"
        if spec.exists():
            raw = fm_field(spec.read_text(), "paths") or "[]"
            allowed = [s.strip().strip('"').strip("'")
                       for s in raw.strip("[]").split(",") if s.strip()]
            rels = str(rel)
            in_own_issue = rels.startswith(f"mural/issues/{issue}/")
            in_allow = any(rels == a or rels.startswith(a.rstrip("/") + "/") for a in allowed)
            if not (in_own_issue or in_allow):
                bl = spec.parent / "blocked.md"
                bl.write_text(f"# Blocked: out-of-bounds write\n\nAttempted write: {rels}\n"
                              f"Declared write-set: {allowed}\n\nQuestion for the engineer: "
                              f"does this task genuinely need {rels}? If yes, amend the "
                              f"write-set upstream; if no, stay in bounds.\n")
                block(f"write outside declared write-set {allowed} -> flipped to blocked "
                      f"(see {bl.relative_to(ROOT)})")
    sys.exit(0)

main()
