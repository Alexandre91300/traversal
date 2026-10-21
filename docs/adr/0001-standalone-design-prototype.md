# Standalone design prototype for the web UI

The live game at traversalgame.com is a closed-source React app with its own backend; this fork only holds the original counting scripts. To propose a UI/UX overhaul to the creator, we build a self-contained, playable prototype in `prototype/` (React + Vite + react-three-fiber + Tailwind, the same stack the site appears to use) with its own local rules engine, rather than waiting for source access or writing an unofficial client against the site's API.

## Consequences

- Where the published rules text and the live game disagree, the prototype follows the live game; discrepancies are tracked in `docs/rules-discrepancies.md` for the creator.
- Scope is the local two-player game screen and its entry flow only; accounts, matchmaking, tutorial, generator and leaderboard stay out. (Tutorial and a computer opponent were later brought in: see ADR 0002.)
