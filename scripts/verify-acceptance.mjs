#!/usr/bin/env node
import { spawn } from "node:child_process";

const DEFAULT_API_BASE = "http://122.51.235.145:3000/api";
const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin123";

const steps = [
  {
    name: "static contracts, typecheck and builds",
    command: "corepack",
    args: ["pnpm", "verify:static"]
  },
  {
    name: "real API smoke",
    command: "corepack",
    args: ["pnpm", "verify:api"],
    env: {
      API_BASE: process.env.API_BASE || DEFAULT_API_BASE,
      ADMIN_USERNAME: process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
      SMOKE_GENERATE_MOCK: process.env.SMOKE_GENERATE_MOCK || "true"
    }
  },
  {
    name: "mock UI regression",
    command: "corepack",
    args: ["pnpm", "verify:ui"]
  },
  {
    name: "mobile real H5 smoke",
    command: "corepack",
    args: ["pnpm", "smoke:mobile-real-h5"],
    env: {
      MOBILE_REAL_API_TARGET: process.env.MOBILE_REAL_API_TARGET || process.env.API_BASE || DEFAULT_API_BASE
    }
  },
  {
    name: "admin real UI smoke",
    command: "corepack",
    args: ["pnpm", "smoke:admin-real-ui"],
    env: {
      ADMIN_REAL_API_TARGET: process.env.ADMIN_REAL_API_TARGET || process.env.API_BASE || DEFAULT_API_BASE,
      ADMIN_USERNAME: process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME,
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD
    }
  },
  {
    name: "mobile visual audit",
    command: "corepack",
    args: ["pnpm", "audit:mobile-visuals"]
  }
];

function runStep(step) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    console.log(`\n==> ${step.name}`);
    console.log(`$ ${step.command} ${step.args.join(" ")}`);
    const child = spawn(step.command, step.args, {
      env: { ...process.env, ...step.env },
      shell: process.platform === "win32",
      stdio: "inherit"
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      if (code === 0) {
        console.log(`OK ${step.name} passed in ${seconds}s`);
        resolve();
        return;
      }
      reject(new Error(`${step.name} failed with exit code ${code} after ${seconds}s`));
    });
  });
}

async function main() {
  const started = Date.now();
  console.log("Lumi Draw acceptance verification");
  for (const step of steps) {
    await runStep(step);
  }
  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`\nAcceptance verification passed in ${minutes}m.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
