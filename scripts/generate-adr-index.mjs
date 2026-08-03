#!/usr/bin/env node
/**
 * generate-adr-index.mjs
 *
 * Regenerates the ADR card grid in website/index.html from the ADR records
 * in .planning/adr/. Each numbered record (`000N-*.md`) becomes a card that
 * links to its GitHub blob URL, so new ADRs appear on the landing page
 * without hand-editing HTML.
 *
 * Usage:
 *   node scripts/generate-adr-index.mjs
 *   # or
 *   yarn adr:index
 *
 * The script rewrites everything between the ADR-GRID markers:
 *
 *   <!-- ADR-GRID:BEGIN -->
 *   ...generated cards...
 *   <!-- ADR-GRID:END -->
 *
 * Run it after adding, renumbering, or re-status-ing an ADR, and commit the
 * regenerated website/index.html alongside the record.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ADR_DIR = join(ROOT, ".planning", "adr");
const INDEX = join(ROOT, "website", "index.html");
const BLOB_BASE =
	"https://github.com/jellydn/ai-photo-coach/blob/main/.planning/adr";
const BEGIN = "<!-- ADR-GRID:BEGIN -->";
const END = "<!-- ADR-GRID:END -->";
const CARD_INDENT = "          ";

/** Escape HTML-sensitive characters in titles/statuses. */
function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

/** Map a Status line to a badge class + label. */
function statusBadge(status) {
	const value = status.trim();
	if (/^accepted$/i.test(value)) {
		return { cls: "adr-status--accepted", label: "Accepted" };
	}
	if (/^superseded/i.test(value)) {
		const ref = value.match(/\d{4}/);
		return {
			cls: "adr-status--superseded",
			label: ref ? `Superseded by ${ref[0]}` : "Superseded",
		};
	}
	return { cls: "adr-status--superseded", label: value || "Proposed" };
}

/** Extract the H1 title from an ADR file. */
function adrTitle(content, file) {
	const match = content.match(/^# \d+\.\s+(.+)$/m);
	return match ? match[1].trim() : file.replace(/\.md$/, "");
}

/** Extract the Status line from an ADR file. */
function adrStatus(content) {
	const match = content.match(/^## Status\s*\n([^\n]+)/m);
	return match ? match[1].trim() : "Accepted";
}

/** Staggered entrance-delay cycle matching the design rhythm. */
function delayFor(index) {
	const cycle = [1, 1, 2, 2, 3];
	return `motion-initial_DELAY-${cycle[index % cycle.length]}`;
}

/** Render one ADR card. */
function buildCard(file, index) {
	const number = file.match(/^(\d{4})-/)[1];
	const content = readFileSync(join(ADR_DIR, file), "utf8");
	const title = escapeHtml(adrTitle(content, file));
	const { cls, label } = statusBadge(adrStatus(content));
	const url = `${BLOB_BASE}/${file}`;
	return [
		`${CARD_INDENT}<a class="adr-card motion-initial ${delayFor(index)}" href="${url}" target="_blank" rel="noopener">`,
		`${CARD_INDENT}  <span class="adr-num">ADR-${number}</span>`,
		`${CARD_INDENT}  <span class="adr-status ${cls}">${label}</span>`,
		`${CARD_INDENT}  <span class="adr-title">${title}</span>`,
		`${CARD_INDENT}</a>`,
	].join("\n");
}

function main() {
	const files = readdirSync(ADR_DIR)
		.filter((f) => /^\d{4}-.+\.md$/.test(f))
		.sort();

	const html = readFileSync(INDEX, "utf8");
	const start = html.indexOf(BEGIN);
	const end = html.indexOf(END);
	if (start === -1 || end === -1 || end <= start) {
		throw new Error(`Missing ${BEGIN} / ${END} markers in ${INDEX}`);
	}

	const cards = files.map(buildCard).join("\n");
	const block = `${BEGIN}\n${cards}\n${CARD_INDENT}${END}`;
	const next = html.slice(0, start) + block + html.slice(end + END.length);
	writeFileSync(INDEX, next);
	console.log(`Regenerated ${files.length} ADR card(s) in website/index.html`);
}

main();
