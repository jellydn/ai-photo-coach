/**
 * Smoke-test probe for the dead-export-pr guard.
 * Exported with zero consumers on purpose — this branch is deleted after
 * the guard is proven to fail, then pass once a real caller is wired in.
 */
export const smokeDeadProbe = 42;
