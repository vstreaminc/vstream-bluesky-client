/**
 * This is intended to be a basic starting point for linting in your app.
 * It relies on recommended configs out of the box for simplicity, but you can
 * and should modify this configuration to best suit your team's needs.
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    commonjs: true,
    es6: true,
  },
  ignorePatterns: ["!**/.server", "!**/.client"],

  // Base config
  extends: ["eslint:recommended"],

  overrides: [
    // React
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      plugins: ["react", "jsx-a11y", "formatjs"],
      extends: [
        "plugin:react/recommended",
        "plugin:react/jsx-runtime",
        "plugin:react-hooks/recommended",
        "plugin:jsx-a11y/recommended",
      ],
      settings: {
        react: {
          version: "detect",
        },
        formComponents: ["Form"],
        linkComponents: [
          { name: "Link", linkAttribute: "to" },
          { name: "NavLink", linkAttribute: "to" },
        ],
        "import/resolver": {
          typescript: {},
        },
      },
      rules: {
        "react/prop-types": "off",
        // FormatJS recommended settings
        // See: https://github.com/formatjs/formatjs/blob/ea8550857e976163663506c96cf8b388ff402a20/packages/eslint-plugin-formatjs/index.ts
        "formatjs/no-offset": "error",
        "formatjs/enforce-default-message": ["error", "literal"],
        "formatjs/enforce-description": ["error", "literal"],
        "formatjs/enforce-placeholders": "error",
        "formatjs/no-emoji": "error",
        "formatjs/no-multiple-whitespaces": "error",
        "formatjs/no-multiple-plurals": "error",
        "formatjs/no-complex-selectors": ["error", { limit: 20 }],
        "formatjs/no-useless-message": "error",
        "formatjs/prefer-pound-in-plural": "error",
        // Not in the 4.x version we needed for eslint 8
        // "formatjs/no-missing-icu-plural-one-placeholders": "error",
        "formatjs/enforce-plural-rules": [
          "error",
          {
            one: true,
            other: true,
          },
        ],
        "formatjs/no-literal-string-in-jsx": [
          "warn",
          {
            props: {
              include: [["*", "{label,placeholder,title}"]],
            },
          },
        ],
        "formatjs/blocklist-elements": ["error", ["selectordinal"]],
      },
    },

    // Typescript
    {
      files: ["**/*.{ts,tsx}"],
      plugins: ["@typescript-eslint", "import"],
      parser: "@typescript-eslint/parser",
      settings: {
        "import/internal-regex": "^~/",
        "import/resolver": {
          node: {
            extensions: [".ts", ".tsx"],
          },
          typescript: {
            alwaysTryTypes: true,
          },
        },
      },
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:import/recommended",
        "plugin:import/typescript",
      ],
      rules: {
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
          },
        ],
      },
    },

    // Node
    {
      files: [".eslintrc.cjs"],
      env: {
        node: true,
      },
    },
  ],
};
