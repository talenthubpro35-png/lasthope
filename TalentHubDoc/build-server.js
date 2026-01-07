const esbuild = require("esbuild");
const pkg = require("./package.json");
const fs = require("fs");

const allDeps = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.devDependencies || {}),
];

const allowlist = [
  "@google/generative-ai",
  "@neondatabase/serverless",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

const externals = allDeps.filter((dep) => !allowlist.includes(dep));

esbuild
  .build({
    entryPoints: ["server/index.ts"],
    outfile: "dist/index.cjs",
    bundle: true,
    platform: "node",
    format: "cjs",
    external: externals,
    sourcemap: false,
  })
  .then(() => {
    console.log("Server built successfully");
  })
  .catch((e) => {
    console.error("Build failed:", e);
    process.exit(1);
  });
