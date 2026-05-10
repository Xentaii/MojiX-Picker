import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Builder, By, Capabilities, until } from "selenium-webdriver";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const fixtureRoot = path.resolve(__dirname, "..");
const appBinaryName =
  process.platform === "win32"
    ? "mojix-tauri-fixture.exe"
    : "mojix-tauri-fixture";
const appBinary = path.resolve(
  fixtureRoot,
  "src-tauri",
  "target",
  "debug",
  appBinaryName,
);

let driver;
let tauriDriver;
let shuttingDown = false;

async function main() {
  ensureTauriDriver();
  buildDebugApp();

  tauriDriver = startTauriDriver();

  const capabilities = new Capabilities();
  capabilities.setBrowserName("wry");
  capabilities.set("tauri:options", { application: appBinary });

  driver = await new Builder()
    .withCapabilities(capabilities)
    .usingServer("http://127.0.0.1:4444/")
    .build();

  try {
    await assertFixtureLoads();
    await assertEmojiCanBeSelected();
    await assertLocaleCanSwitch();
    await assertNoPackageDataFetches();
  } finally {
    await shutdown();
  }
}

function buildDebugApp() {
  const { args, command } = createNpmCommand(["run", "tauri:build:debug"]);
  const result = spawnSync(command, args, {
    cwd: fixtureRoot,
    stdio: "inherit",
  });

  assert.equal(result.status, 0, "Tauri debug build failed");
  assert.ok(
    existsSync(appBinary),
    `Expected Tauri application binary at ${appBinary}`,
  );
}

function ensureTauriDriver() {
  const driverPath = findTauriDriver();

  if (!driverPath) {
    throw new Error(
      [
        "tauri-driver was not found.",
        "Install it with `cargo install tauri-driver --locked`.",
        "On Windows, msedgedriver.exe must also be available on PATH.",
      ].join(" "),
    );
  }
}

function startTauriDriver() {
  const command = findTauriDriver();

  assert.ok(command, "tauri-driver was not found");

  const child = spawn(command, [], {
    stdio: ["ignore", "inherit", "inherit"],
  });

  child.on("exit", (code) => {
    if (!shuttingDown) {
      console.error(`tauri-driver exited unexpectedly with code ${code}`);
      process.exit(1);
    }
  });

  return child;
}

function findTauriDriver() {
  const binaryName =
    process.platform === "win32" ? "tauri-driver.exe" : "tauri-driver";
  const cargoBin = path.resolve(os.homedir(), ".cargo", "bin", binaryName);

  return resolveCommand(binaryName) ?? (existsSync(cargoBin) ? cargoBin : null);
}

function resolveCommand(command) {
  const lookup = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(lookup, [command], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.split(/\r?\n/u).find(Boolean) ?? null;
}

function createNpmCommand(args) {
  const npmCli = process.env.npm_execpath;

  if (npmCli) {
    return {
      command: process.execPath,
      args: [npmCli, ...args],
    };
  }

  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args,
  };
}

async function assertFixtureLoads() {
  const title = await driver.wait(
    until.elementLocated(By.css('[data-testid="tauri-fixture-title"]')),
    30_000,
  );
  await driver.wait(until.elementIsVisible(title), 10_000);
  assert.equal(await title.getText(), "MojiX in Tauri WebView");

  const firstEmoji = await driver.wait(
    until.elementLocated(By.css('[data-mx-slot="emoji"]')),
    30_000,
  );
  await driver.wait(until.elementIsVisible(firstEmoji), 10_000);
}

async function assertEmojiCanBeSelected() {
  const searchSeed = await driver.findElement(
    By.css('[data-testid="search-seed"]'),
  );
  await searchSeed.clear();
  await searchSeed.sendKeys("rocket");

  const firstEmoji = await driver.wait(
    until.elementLocated(By.css('[data-mx-slot="emoji"]')),
    10_000,
  );
  await firstEmoji.click();

  await driver.wait(async () => {
    const text = await driver
      .findElement(By.css('[data-testid="selection-output"]'))
      .getText();

    return text !== "No emoji selected";
  }, 10_000);
}

async function assertLocaleCanSwitch() {
  const russianButton = await driver.findElement(
    By.css('[data-testid="locale-ru"]'),
  );
  await russianButton.click();

  await driver.wait(async () => {
    const locale = await driver
      .findElement(By.css('[data-testid="locale-output"]'))
      .getText();

    return locale === "ru";
  }, 10_000);
}

async function assertNoPackageDataFetches() {
  const fetches = await driver.executeScript(
    "return window.__MOJIX_TAURI_FETCHES__ || []",
  );

  assert.deepEqual(fetches, []);
}

async function shutdown() {
  shuttingDown = true;

  if (driver) {
    await driver.quit().catch(() => undefined);
  }

  if (tauriDriver) {
    tauriDriver.kill();
  }
}

const shutdownSignals =
  process.platform === "win32"
    ? ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]
    : ["SIGINT", "SIGTERM", "SIGHUP"];

for (const signal of shutdownSignals) {
  process.on(signal, () => {
    void shutdown().finally(() => process.exit(1));
  });
}

main().catch(async (error) => {
  await shutdown();
  console.error(error);
  process.exit(1);
});
