import pc from "picocolors";

export function fatal(message: string): never {
  console.error(`\n${pc.red("✗")} ${message}\n`);
  process.exit(1);
}

export function warn(message: string): void {
  console.error(`${pc.yellow("⚠")} ${message}`);
}

export function success(message: string): void {
  console.error(`${pc.green("✔")} ${message}`);
}

export function info(message: string): void {
  console.error(`${pc.blue("ℹ")} ${message}`);
}
