/**
 * Category C smoke-test probe.
 *
 * Exported only to prove the dead-export-pr guard end-to-end: a new export
 * whose only consumers live under __tests__/ is a test-only export, and the
 * PR-only guard must fail on it via --diff. The green phase of the smoke test
 * wires a production consumer (useLighting) so the probe drops out of the
 * test-only set. Removed with the scratch branch.
 */
export const smokeTestOnlyProbe = 128;
