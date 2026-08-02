/* AI Photo Coach — landing page interactions
   Enhances the CSS scroll-driven animations with an IntersectionObserver
   fallback for browsers without `animation-timeline: view()`. Respects
   `prefers-reduced-motion`. Pure enhancement — page works without JS. */

(() => {
	// Respect reduced motion — skip reveal animations entirely.
	const prefersReduced = window.matchMedia(
		"(prefers-reduced-motion: reduce)",
	).matches;

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					entry.target.classList.add("motion-in-view");
				}
			}
		},
		{ threshold: 0.1 },
	);

	// Observe elements marked for entrance. The `@supports` block in CSS
	// already drives these when `animation-timeline` is available; this is the
	// fallback for older browsers.
	document.querySelectorAll(".motion-initial").forEach((el) => {
		observer.observe(el);
	});

	// Anchor link smoothing (CSS handles the actual scroll, this just ensures
	// in-page hashes jump cleanly on load).
	function jumpHash() {
		const hash = window.location.hash;
		if (hash && document.querySelector(hash)) {
			document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
		}
	}

	// Mobile menu toggle
	const toggle = document.querySelector(".nav-toggle");
	const menu = document.querySelector(".nav-menu");
	if (toggle && menu) {
		toggle.addEventListener("click", () => {
			const expanded = toggle.getAttribute("aria-expanded") === "true";
			toggle.setAttribute("aria-expanded", String(!expanded));
			menu.classList.toggle("open");
		});
		menu.addEventListener("click", (e) => {
			const link = e.target.closest("a");
			if (link) {
				menu.classList.remove("open");
				toggle.setAttribute("aria-expanded", "false");
			}
		});
	}

	window.addEventListener("DOMContentLoaded", jumpHash);
	window.addEventListener("hashchange", jumpHash);

	if (prefersReduced) {
		document.querySelectorAll(".motion-initial").forEach((el) => {
			el.classList.add("motion-in-view");
			el.style.transition = "none";
		});
	}

	// Expose for debugging
	window.__photoCoach = { observer };
})();
