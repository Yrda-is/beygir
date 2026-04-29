import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

const TS_NAFNAUKI = String.raw`^\.{1,2}\/.+\.ts$`;
const NAFNAUKABANN = [
  ["ImportDeclaration", "import"],
  ["ExportNamedDeclaration", "export"],
  ["ExportAllDeclaration", "export"],
].map(([tegund, heiti]) => ({
  selector: `${tegund}[source.value=/${TS_NAFNAUKI}/]`,
  message: `Slepptu .ts endingunni í staðbundnu ${heiti}.`,
}));
const LAGSKIPTINGARSVÆÐI = [
  {
    target: "./kóði/málfræði",
    from: "./kóði",
    except: ["./málfræði"],
    message: "málfræði er grunnlag og má ekki treysta á önnur lög.",
  },
  {
    target: "./kóði/kristínarsnið",
    from: "./kóði",
    except: ["./kristínarsnið", "./málfræði"],
    message: "kristínarsnið má aðeins nota sjálft sig og málfræði.",
  },
  {
    target: "./kóði/kjarni",
    from: "./kóði",
    except: ["./kjarni", "./málfræði"],
    message: "kjarni má aðeins nota sjálft sig og grunnlögin undir sér.",
  },
  {
    target: "./kóði/smiður",
    from: "./kóði",
    except: ["./smiður", "./kjarni", "./kristínarsnið", "./málfræði"],
    message: "smiður má aðeins nota kjarna og grunnlögin undir sér.",
  },
];

export default tseslint.config({
  ignores: ["dreifing/**"],
  files: ["**/*.{ts,tsx}"],
  extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
  plugins: {
    import: importPlugin,
  },
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  settings: {
    "import/resolver": {
      node: true,
      typescript: true,
    },
  },
  rules: {
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "@typescript-eslint/no-import-type-side-effects": "error",
    "@typescript-eslint/prefer-for-of": "off",
    "@typescript-eslint/restrict-template-expressions": [
      "error",
      {
        allowNumber: true,
      },
    ],
    "import/no-cycle": ["error", { ignoreExternal: true }],
    "import/no-duplicates": "error",
    "import/no-restricted-paths": ["error", { zones: LAGSKIPTINGARSVÆÐI }],
    "import/no-self-import": "error",
    "import/no-useless-path-segments": ["error", { noUselessIndex: true }],
    "no-restricted-syntax": ["error", ...NAFNAUKABANN],
  },
});
