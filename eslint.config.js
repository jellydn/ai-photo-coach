// ESLint 9+ flat config for AIPhotoCoach (TypeScript project).
//
// The repo lints TypeScript sources only: the base @react-native config
// carries a Flow/JS override block (eslint-plugin-ft-flow) that is
// incompatible with the pinned ESLint 9.x, so .js/.jsx files are excluded
// rather than linted with a crashing plugin. jest.config.js, babel.config.js,
// metro.config.js and the __mocks__ shims are intentionally out of scope.
// scripts/** is also excluded: it contains Node build tooling (.mjs) that the
// RN preset does not target.

const config = require('@react-native/eslint-config/flat');

module.exports = [
  ...config,
  {
    ignores: [
      '**/*.js',
      '**/*.jsx',
      'scripts/**',
      'ios/**',
      'android/**',
      'node_modules/**',
      'vendor/**',
      'Pods/**',
      '*.lock',
    ],
  },
];
