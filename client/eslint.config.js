import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src/shared/contracts"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ["scripts/**", "*.config.*"],
    languageOptions: {
      globals: globals.node,
    },
  },
);
