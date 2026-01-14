# Sumi — Claude Sentry

Sumi is a Telegram-based repository security observer.

She performs lightweight, incremental analysis of GitHub repositories to surface
potential security concerns, reuse patterns, and areas requiring further review.

Sumi is designed for clarity over certainty.

---

## What Sumi Does

- Scans public GitHub repositories on demand
- Observes dependency usage, structural patterns, and common risk signals
- Detects code reuse, forks, and similarity to known projects
- Reports findings with calibrated confidence, not absolute claims

Sumi does not attempt to replace audits.
She exists to support early judgment and continued attention.

---

## Design Philosophy

- Partial visibility is expected
- Absence of evidence is not evidence
- Popularity does not imply safety
- Results are always contextual, never definitive

Every output includes:
- a score
- a risk posture
- a confidence level

Even when data is incomplete.

---

## Usage

Interact with Sumi via Telegram.

Supported commands:

- `/start` — initialize
- `/checkgitrepo <github_url>` — repository scan
- `/checkreusage <github_url | name>` — reuse analysis

Sumi works in both private chats and group conversations.

---

## Architecture

- TypeScript
- Telegraf
- Async, non-blocking analysis
- Modular services for scanning, analysis, and reuse detection

The system is designed to evolve without rewriting conclusions.

---

## Security Disclaimer

Sumi provides observational analysis only.

Results should not be treated as guarantees, approvals, or rejections.
No automated output should be used as the sole basis for trust decisions.

---

## Roadmap

- Expanded similarity detection
- On-chain contract surface analysis
- Confidence calibration improvements
- Optional web interface

---

## License

MIT
