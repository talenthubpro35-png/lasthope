const { build } = require('esbuild');
const { rmSync, readFileSync } = require('fs');

const allowlist = [
  '@google/generative-ai',
  '@neondatabase/serverless',
  'axios',
  'connect-pg-simple',
  'cors',
  'date-fns',
  'drizzle-orm',
  'drizzle-zod',
  'express',
  'express-rate-limit',
  'express-session',
  'jsonwebtoken',
  'memorystore',
  'multer',
  'nanoid',
  'nodemailer',
  'openai',
  'passport',
  'passport-local',
  'stripe',
  'uuid',
  'ws',
  'xlsx',
  'zod',
  'zod-validation-error',
];

async function buildServer() {
  try {
    rmSync('dist', { recursive: true, force: true });
  } catch {}

  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await build({
    entryPoints: ['server/index.ts'],
    platform: 'node',
    bundle: true,
    format: 'cjs',
    outfile: 'dist/index.cjs',
    define: { 'process.env.NODE_ENV': '"production"' },
    minify: true,
    external: externals,
    logLevel: 'info',
  });
}

buildServer().catch((err) => {
  console.error(err);
  process.exit(1);
});

