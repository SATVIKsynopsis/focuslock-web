import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const url = process.env.OG_URL || "http://localhost:4321/og-image";
const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
execFileSync(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "og-"))}`,
  "--window-size=1200,630",
  "--virtual-time-budget=3000",
  `--screenshot=${join(process.cwd(), "public/og.png")}`,
  url,
], { stdio: "ignore" });
console.log("wrote public/og.png from", url);
