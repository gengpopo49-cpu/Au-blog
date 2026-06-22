import { execSync } from "node:child_process";
import { chmodSync, existsSync } from "node:fs";
import { join } from "node:path";

const HUGO_VERSION = process.env.HUGO_VERSION || "0.163.3";
const isCloudflare = process.env.CF_PAGES === "1";

function resolveHugoBin() {
  if (!isCloudflare) {
    return "hugo";
  }

  const binDir = "/tmp/hugo-bin";
  const bin = join(binDir, "hugo");

  if (!existsSync(bin)) {
    const archive = `hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz`;
    const url = `https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/${archive}`;
    execSync(`mkdir -p "${binDir}" && curl -sL "${url}" | tar xz -C "${binDir}"`, {
      stdio: "inherit",
    });
    chmodSync(bin, 0o755);
  }

  return bin;
}

const hugoBin = resolveHugoBin();
const args = ["build", "--cleanDestinationDir"];

if (process.env.CF_PAGES_URL) {
  args.push("--baseURL", process.env.CF_PAGES_URL);
}

execSync([hugoBin, ...args].join(" "), { stdio: "inherit" });
