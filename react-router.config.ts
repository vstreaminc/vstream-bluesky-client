import esbuild from "esbuild";
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  serverBuildFile: "remix.js",
  buildEnd: async () => {
    await esbuild
      .build({
        alias: { "~/lib": "./app/lib", "~/types": "./app/types.ts" },
        outfile: "build/server/index.js",
        entryPoints: ["server/index.ts"],
        external: ["./build/server/*"],
        platform: "node",
        format: "esm",
        packages: "external",
        bundle: true,
        logLevel: "info",
      })
      .catch((error: unknown) => {
        console.error("Error building server:", error);
        process.exit(1);
      });
  },
} satisfies Config;
