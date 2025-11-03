module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "plugin:tailwindcss/recommended", "prettier"],
  parserOptions: {
    project: "./tsconfig.json"
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "tailwindcss/classnames-order": "warn",
    "tailwindcss/no-custom-classname": "off"
  }
};
