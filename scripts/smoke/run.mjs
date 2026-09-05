import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const targets = JSON.parse(readFileSync(join(here, "targets.json"), "utf8"));

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const hit = args.find((entry) => entry.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};

const only = option("only", "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);
const workspace = resolve(
  option("dir", join(tmpdir(), "ngx-signal-plus-smoke")),
);
const keep = flag("keep");
const skipPack = flag("skip-pack");
const forceLegacyPeerDeps = flag("legacy-peer-deps");
const selected = Object.keys(targets).filter((key) =>
  only.length === 0 ? targets[key].optional !== true : only.includes(key),
);

if (selected.length === 0) {
  console.error(
    `No smoke target matches --only=${only.join(",")}. Known targets: ${Object.keys(targets).join(", ")}`,
  );
  process.exit(2);
}

const chromeBin =
  process.env.CHROME_BIN ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ].find(existsSync);

function run(label, command, cwd) {
  console.log(`\n> ${label}\n  ${command}\n  in ${cwd}`);
  const started = Date.now();
  const result = spawnSync(command, {
    cwd,
    shell: true,
    stdio: "inherit",
    env: {
      ...process.env,
      ...(chromeBin === undefined ? {} : { CHROME_BIN: chromeBin }),
    },
  });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const ok = result.status === 0;
  console.log(
    `  ${ok ? "ok" : `FAILED (exit ${result.status})`} in ${seconds}s`,
  );
  return { ok, status: result.status, seconds };
}

function isNodeOlderThan(required) {
  const current = process.versions.node.split(".").map(Number);
  const wanted = required.split(".").map(Number);
  for (let index = 0; index < wanted.length; index += 1) {
    if ((current[index] ?? 0) !== wanted[index]) {
      return (current[index] ?? 0) < wanted[index];
    }
  }
  return false;
}

function tarballsIn(directory) {
  return readdirSync(directory)
    .filter((entry) => entry.endsWith(".tgz"))
    .sort();
}

function packLibrary() {
  if (skipPack) {
    const existing = tarballsIn(workspace);
    if (existing.length === 0) {
      throw new Error(
        `--skip-pack was given but no tarball exists in ${workspace}`,
      );
    }
    return join(workspace, existing[existing.length - 1]);
  }
  const build = run("build the library", "npm run build:lib", repoRoot);
  if (!build.ok) {
    throw new Error(
      "the library did not build, so there is nothing to smoke test",
    );
  }
  for (const stale of tarballsIn(workspace)) {
    rmSync(join(workspace, stale));
  }
  const pack = run(
    "pack the library",
    `npm pack --pack-destination "${workspace}"`,
    join(repoRoot, "dist", "signal-plus"),
  );
  if (!pack.ok) {
    throw new Error("npm pack failed");
  }
  const packed = tarballsIn(workspace);
  if (packed.length !== 1) {
    throw new Error(
      `expected exactly one tarball in ${workspace}, found ${packed.length}`,
    );
  }
  return join(workspace, packed[0]);
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function removeDirectory(directory) {
  try {
    rmSync(directory, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    });
    return true;
  } catch (error) {
    console.log(
      `  could not remove ${directory}: ${error.code ?? error.message}. Something still holds a file there — close it and rerun, or pass --dir to use another location.`,
    );
    return false;
  }
}

function materialize(key, target, tarball) {
  const appDir = join(workspace, `ng${key}`);
  if (!removeDirectory(appDir)) {
    throw new Error(
      `the previous ${appDir} could not be cleared, so this lane cannot start from a clean application`,
    );
  }
  mkdirSync(appDir, { recursive: true });
  cpSync(join(here, "app", "src"), join(appDir, "src"), { recursive: true });

  writeJson(join(appDir, "package.json"), {
    name: `ngx-signal-plus-smoke-ng${key}`,
    version: "0.0.0",
    private: true,
    dependencies: {
      "@angular/common": target.angular,
      "@angular/compiler": target.angular,
      "@angular/core": target.angular,
      "@angular/forms": target.angular,
      "@angular/platform-browser": target.angular,
      ...target.dependencies,
      "ngx-signal-plus": `file:${tarball.replace(/\\/g, "/")}`,
      rxjs: "7.8.1",
      tslib: "2.8.1",
      "zone.js": target.zone,
    },
    devDependencies: {
      "@angular/cli": target.cli,
      ...target.devDependencies,
      "@types/jasmine": target.jasmineTypes,
      "jasmine-core": target.jasmineCore,
      karma: "6.4.4",
      "karma-chrome-launcher": "3.2.0",
      "karma-coverage": "2.2.1",
      "karma-jasmine": "5.1.0",
      "karma-jasmine-html-reporter": "2.1.0",
      typescript: target.typescript,
    },
  });

  writeJson(join(appDir, "angular.json"), {
    version: 1,
    newProjectRoot: "projects",
    projects: {
      smoke: {
        projectType: "application",
        root: "",
        sourceRoot: "src",
        prefix: "app",
        architect: { build: target.build, test: target.test },
      },
    },
    cli: { analytics: false },
  });

  writeJson(join(appDir, "tsconfig.json"), {
    compileOnSave: false,
    compilerOptions: {
      strict: true,
      noImplicitOverride: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      skipLibCheck: true,
      esModuleInterop: true,
      experimentalDecorators: true,
      importHelpers: true,
      moduleResolution: target.moduleResolution,
      target: "ES2022",
      module: "ES2022",
      lib: ["ES2022", "dom"],
      outDir: "./out-tsc",
    },
    angularCompilerOptions: {
      strictInjectionParameters: true,
      strictTemplates: true,
    },
  });

  writeJson(join(appDir, "tsconfig.app.json"), {
    extends: "./tsconfig.json",
    compilerOptions: { outDir: "./out-tsc/app", types: [] },
    files: ["src/main.ts"],
    include: ["src/**/*.d.ts"],
  });

  writeJson(join(appDir, "tsconfig.spec.json"), {
    extends: "./tsconfig.json",
    compilerOptions: { outDir: "./out-tsc/spec", types: ["jasmine"] },
    include: ["src/**/*.spec.ts", "src/**/*.d.ts"],
  });

  return appDir;
}

function smoke(key, target, tarball) {
  const rule = "=".repeat(72);
  console.log(`\n${rule}\n${target.label}\n${rule}`);
  if (isNodeOlderThan(target.minNode)) {
    console.log(
      `  blocked: this lane needs Node ${target.minNode} or newer and this machine runs ${process.versions.node}`,
    );
    return { key, target, appDir: null, blocked: true, phases: {} };
  }
  const legacyPeerDeps = forceLegacyPeerDeps || target.legacyPeerDeps === true;
  if (legacyPeerDeps) {
    console.log(
      `  note: installing with --legacy-peer-deps because ${forceLegacyPeerDeps ? "the flag was passed on the command line" : target.legacyPeerDepsReason}`,
    );
  }
  if (target.expectedFailure !== undefined && !forceLegacyPeerDeps) {
    console.log(`  expected to fail: ${target.expectedFailure}`);
  }
  let appDir;
  try {
    appDir = materialize(key, target, tarball);
  } catch (error) {
    console.log(`  FAILED to prepare the application: ${error.message}`);
    return {
      key,
      target,
      appDir: join(workspace, `ng${key}`),
      phases: { install: { ok: false, status: null, seconds: "0.0" } },
    };
  }
  const phases = {};
  phases.install = run(
    "install the consumer application",
    `npm install --no-audit --no-fund${legacyPeerDeps ? " --legacy-peer-deps" : ""}`,
    appDir,
  );
  if (phases.install.ok) {
    phases.build = run(
      "build the consumer application",
      "npx --no-install ng build",
      appDir,
    );
    phases.test = run(
      "run the consumer specs",
      "npx --no-install ng test --watch=false --browsers=ChromeHeadless",
      appDir,
    );
  }
  return { key, target, appDir, phases };
}

mkdirSync(workspace, { recursive: true });
console.log(`smoke workspace: ${workspace}`);
console.log(
  chromeBin === undefined
    ? "CHROME_BIN: not set and no Chrome found at the usual Windows locations, so the test phase will fail"
    : `CHROME_BIN: ${chromeBin}`,
);

let tarball;
try {
  tarball = packLibrary();
} catch (error) {
  console.error(`\n${error.message}`);
  process.exit(1);
}
console.log(`tarball: ${tarball}`);

const phaseNames = ["install", "build", "test"];
const results = selected.map((key) => smoke(key, targets[key], tarball));

const rule = "=".repeat(72);
console.log(`\n${rule}\nSummary\n${rule}`);
let failed = false;
let blocked = false;
for (const result of results) {
  if (result.blocked) {
    blocked = true;
    console.log(`BLOCKED  ${result.target.label}`);
    console.log(
      `      needs Node ${result.target.minNode} or newer, this machine runs ${process.versions.node}`,
    );
    continue;
  }
  const ok = phaseNames.every((phase) => result.phases[phase]?.ok === true);
  failed = failed || !ok;
  const line = phaseNames
    .map((phase) => {
      const phaseResult = result.phases[phase];
      if (phaseResult === undefined) {
        return `${phase}: skipped`;
      }
      return `${phase}: ${phaseResult.ok ? "pass" : "FAIL"}`;
    })
    .join("  |  ");
  console.log(`${ok ? "PASS" : "FAIL"}  ${result.target.label}`);
  console.log(`      ${line}`);
  console.log(`      ${result.appDir}`);
}

if (failed) {
  console.log(
    "\nkept the throwaway applications for inspection because at least one lane failed",
  );
} else if (!keep) {
  for (const { appDir } of results) {
    if (appDir !== null) {
      removeDirectory(appDir);
    }
  }
  console.log(
    "\nremoved the throwaway applications; pass --keep to inspect them",
  );
}

if (failed) {
  process.exit(1);
}
process.exit(blocked ? 2 : 0);
