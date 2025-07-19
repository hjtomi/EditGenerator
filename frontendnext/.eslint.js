// .eslintrc.js
module.exports = {
  // Specifies the root directory for ESLint.
  // This helps prevent ESLint from looking for config files in parent directories.
  root: true,

  // Defines the environment where your code will run.
  // 'browser': adds browser global variables (e.g., window, document).
  // 'node': adds Node.js global variables and Node.js scoping.
  // 'es2021': adds all ECMAScript 2021 global variables and parsing.
  env: {
    browser: true,
    node: true,
    es2021: true,
  },

  // Extends a set of predefined rules.
  // 'eslint:recommended' is a core set of ESLint rules that report common problems.
  // 'next/core-web-vitals' includes Next.js specific linting rules,
  // which is recommended when using `next lint`.
  extends: [
    'eslint:recommended',
    'next/core-web-vitals', // Added for Next.js projects
  ],

  // Specifies the parser options.
  // 'ecmaVersion': Sets the ECMAScript version to parse.
  // 'sourceType': Sets the type of JavaScript source code. 'module' for ES modules.
  parserOptions: {
    ecmaVersion: 2021, // Use the latest ECMAScript version
    sourceType: 'module', // Allows for the use of imports/exports
  },

  // Custom rules or overrides for rules inherited from 'extends'.
  // Each rule is defined as 'rule-name': 'severity' or 'rule-name': ['severity', { options }]
  // Severity can be 'off' (0), 'warn' (1), or 'error' (2).
  rules: {
    // Disable the 'no-unused-vars' rule.
    // This means ESLint will not report errors or warnings for unused variables.
    'no-unused-vars': 'off',

    // You can add other rules here if needed. For example:
    // 'indent': ['error', 2], // Enforce 2-space indentation
    // 'quotes': ['error', 'single'], // Enforce single quotes
    // 'semi': ['error', 'always'], // Require semicolons at the end of statements
  },
};
