module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:prettier/recommended",
    'plugin:@next/next/recommended',
  ],
  plugins: [
    "@typescript-eslint",
    "react",
    "prettier"
  ],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    "react/no-unescaped-entities": "off",
    "prettier/prettier": "off",
    "@next/next/no-page-custom-font": "off",
    "prefer-const": "off",
    "no-var" : "off",
    "@typescript-eslint/no-var-requires" : "off",
    "@typescript-eslint/no-inferrable-types" : "off",
    "@typescript-eslint/no-unused-vars" : "off",
  },
  globals: {
    React: "writable"
  },
  settings: {
    react: {
      version: "detect"
    }
  }
};
