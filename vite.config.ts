import * as fs from "node:fs/promises";
import * as path from "node:path";
import DataLoader from "dataloader";
import babel, { type PluginItem } from "@babel/core";
import stringify from "json-stable-stringify";
import fg from "fast-glob";
import { reactRouter } from "@react-router/dev/vite";
import optimizeLocales from "@react-aria/optimize-locales-plugin";
import { compile, extract } from "@formatjs/cli-lib";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { safeRoutes } from "safe-routes/vite";
import { DEFAULT_LOCALE } from "./app/lib/locale";

const ID_INTERPOLATION = "[sha512:contenthash:base64:6]";

// vite plugin for running the babel format-js plugin
const formatJsTransform = (additionalConfigs = {}): Plugin => {
  const options = {
    idInterpolationPattern: ID_INTERPOLATION,
    ...additionalConfigs,
  };
  const plugin = ["formatjs", options];
  const pluginsMap = new Map<string | undefined, PluginItem[]>();
  pluginsMap.set(undefined, [plugin]);
  pluginsMap.set("ts", [plugin, "@babel/syntax-typescript"]);
  pluginsMap.set("tsx", [plugin, ["@babel/syntax-typescript", { isTSX: true }]]);

  return {
    name: "formatjs/transform",
    enforce: "pre",
    async transform(code, id) {
      if (id.includes("/node_modules/")) {
        return;
      }

      const filepath = id.split("?")[0]!;

      const extensionsRE = /\.(jsx?|tsx?|mdx?)$/;
      if (!extensionsRE.test(filepath)) {
        return;
      }

      const ext = path.extname(filepath).slice(1);

      const result = await babel.transformAsync(code, {
        filename: id,
        sourceFileName: filepath,
        parserOpts: {
          sourceType: "module",
          allowAwaitOutsideFunction: true,
        },
        plugins: pluginsMap.get(pluginsMap.has(ext) ? ext : undefined),
        sourceMaps: true,
      });

      if (result === null) {
        return;
      }

      return { code: result.code!, map: result.map };
    },
  };
};

const formatJsExtract: Plugin = (() => {
  const dts = "**/*.d.ts";
  const langPath = `./lang/${DEFAULT_LOCALE}.json`;
  // Use dataloader to collapse all transforms into single extract call
  const extracter = new DataLoader<string, null>(
    async (files) => {
      const extracted = await extract(
        await fg("./app/**/*.{j,t}s{,x}", {
          ignore: [dts],
        }),
        {
          idInterpolationPattern: ID_INTERPOLATION,
          flatten: true,
        },
      );
      // Nothing to extract
      if (extracted === "{\n}") return files.map(() => null);
      // Write merged object to default lang file
      await fs.writeFile(langPath, stringify(JSON.parse(extracted), { space: 2 }) + "\n", "utf8");
      return files.map(() => null);
    },
    {
      cache: false,
      // Batch every 10ms
      batchScheduleFn: (callback) => setTimeout(callback, 10),
    },
  );

  return {
    name: "formatjs/extract",
    configureServer(server) {
      async function handleAppFile(file: string) {
        if (/node_modules/.test(file) || !/\.[tj]sx?$/.test(file)) return;

        await extracter.load(file);
      }

      server.watcher.on("change", handleAppFile);
      server.watcher.on("add", handleAppFile);
      server.watcher.on("remove", handleAppFile);
    },
    async config() {
      await extracter.load("FAKE");
      return null;
    },
  };
})();

const compileFormatJS: Plugin = (() => {
  const compileAndParse = async (file: string): Promise<Record<string, unknown>> =>
    JSON.parse(
      await compile([file], {
        ast: true,
      }),
    );

  const write = async (locale: string, contents: Record<string, unknown>) => {
    await fs.writeFile(
      `./.compiled-lang/${locale}.json`,
      stringify(contents, { space: 2 }),
      "utf8",
    );
  };

  const compiler = new DataLoader<string, null>(async (files) => {
    for (const file of files) {
      const locale = path.parse(file).name;
      if (locale === ".gitkeep") continue;

      if (locale === DEFAULT_LOCALE) {
        await write(locale, await compileAndParse(file));
        continue;
      }

      const defaultCompiled = await compileAndParse(path.resolve(`./lang/${DEFAULT_LOCALE}.json`));
      const messages = await compileAndParse(file);
      await write(locale, { ...defaultCompiled, ...messages });
    }
    return files.map(() => null);
  });

  return {
    name: "formatjs/compile",
    configureServer(server) {
      server.watcher.on("change", async (file) => {
        if (/node_modules/.test(file) || !/\/lang\/[\w-]+\.json$/.test(file)) {
          return;
        }
        await compiler.load(file);
      });
    },
    async config() {
      // Ensure directory exists
      await fs.mkdir(".compiled-lang", { recursive: true });

      const defaultCompiled = await compileAndParse(path.resolve(`./lang/${DEFAULT_LOCALE}.json`));

      const files = await fs.readdir("lang");
      await Promise.all(
        files
          .map((file) => ({
            locale: path.parse(file).name,
            file: path.join("./lang", file),
          }))
          .map(async ({ locale, file }) => {
            if (locale === ".gitkeep") return;
            if (locale === DEFAULT_LOCALE) {
              await write(locale, defaultCompiled);
              return;
            }
            const messages = await compileAndParse(file);
            await write(locale, { ...defaultCompiled, ...messages });
          }),
      );

      return null;
    },
  };
})();

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      // We only use asts for all of our ICU messges
      "@formatjs/icu-messageformat-parser": "@formatjs/icu-messageformat-parser/no-parser",
    },
  },
  plugins: [
    reactRouter(),
    safeRoutes(),
    tsconfigPaths(),
    // Don't include any locale strings in the client JS bundle.
    // See: https://react-spectrum.adobe.com/react-aria/ssr.html
    { ...optimizeLocales.vite({ locales: [] }), enforce: "pre" },
    formatJsExtract,
    compileFormatJS,
    {
      ...formatJsTransform(
        mode === "production"
          ? {
              removeDefaultMessage: true,
            }
          : {
              ast: true,
            },
      ),
    },
  ],
}));
