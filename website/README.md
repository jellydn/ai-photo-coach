# website

Static GitHub Pages landing page for AI Photo Coach — plain `index.html`,
`style.css`, and `script.js`, no build step. The **Architecture/ADR** section
of the page is *generated* from the decision records in `.planning/adr/`, so
the card grid between `<!-- ADR-GRID:BEGIN -->` and `<!-- ADR-GRID:END -->`
should never be hand-edited.

## ADR index generator — `yarn adr:index`

`scripts/generate-adr-index.mjs` rewrites the card grid in `website/index.html`
from `.planning/adr/000N-*.md`:

- one card per record, linking to its GitHub blob URL;
- the status badge (`Accepted` / `Superseded by NNNN`; anything else renders
  its raw text) is derived from the record's `## Status` line;
- cards are matched by any 4-digit prefix (`0001`…`9999`).

**Run it** after adding, renumbering, or re-status-ing an ADR, and commit the
regenerated `website/index.html` alongside the record. Idempotent — safe to
re-run any time.

## CI guard stack

Three checks protect the ADR ↔ website integration:

| Guard | Workflow | What it enforces |
|---|---|---|
| `adr-check` | `ci.yml` (PRs only) | A recorded architectural seam changed → a new `000X-*.md` must be added (seam list in `.planning/codebase/CONVENTIONS.md`) |
| `adr-index` | `ci.yml` | `yarn adr:index` regenerates the page, then `git diff --exit-code` fails if `website/index.html` is stale — an ADR can't land without its card |
| deploy smoke test | `deploy.yml` (after Pages deploy) | Polls for the `deploy-sha` marker, then asserts the `#architecture` section, the nav Architecture link, every ADR card link, the card count, and each Accepted/Superseded badge |

They interlock: **adr-check** makes you write the record, **adr-index** makes
you regenerate the page, and the **deploy smoke test** fails the deploy if the
live page is wrong. It runs *after* deploy (GitHub Pages offers no pre-deploy
staging), so it's a post-deploy verification that catches a broken or stale
index before it can land cleanly. The smoke test stamps an
invisible `<!-- deploy-sha:<commit> -->` marker into the page at deploy time so
it can tell *this* deployment from a previous one still propagating through
the CDN.

## Local preview: working tree vs production

`scripts/serve-pages.mjs` is a dependency-free loopback server that exposes
both views on one port (default `8131`), so you can diff and eyeball a change
before it ships:

```bash
node scripts/serve-pages.mjs 8131
#   http://127.0.0.1:8131/local/  → your working-tree website/
#   http://127.0.0.1:8131/live/   → the deployed production site (proxied)
#   http://127.0.0.1:8131/        → production (alias of /live/)
```

Review a change as a text diff first — `scripts/diff-pages.mjs` (alias
`yarn diff:pages`) fetches `/local/` and `/live/` through the proxy and prints
a unified diff (exit `0` identical, `1` differs, `2` error). Pass a path to
compare a specific asset:

```bash
yarn diff:pages                 # diff the whole page
yarn diff:pages /style.css      # diff the stylesheet
node scripts/diff-pages.mjs / 9000   # custom proxy port
```

It normalizes the CI-stamped `deploy-sha` marker, so a deployed build still
compares clean against the source. Note: `diff-pages` defaults to port `8131`
and deliberately ignores a `$PORT` environment variable, which tooling may set
to an unrelated value — pass the port explicitly rather than relying on the
default.

**Typical loop:** edit a file in `website/` → `yarn diff:pages` to see the
change as text → open `/local/` in the preview to verify visually against
`/live/`.
