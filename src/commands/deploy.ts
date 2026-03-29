import inquirer from "inquirer";
import shelljs from "shelljs";
import fs from "fs/promises";
import ora from "ora";
import pc from "picocolors";
import { generateCaddyfile } from "../generators/caddyfile.js";
import { fatal } from "../utils/log.js";

function assertSafeShellArg(val: string, name: string): void {
  if (/[;&|`$(){}[\]<>!#"'\\]/.test(val)) {
    fatal(`${name} contains invalid characters`);
  }
}

export async function deployCommand(): Promise<void> {
  const answers = await inquirer.prompt([
    { type: "input", name: "host", message: "SSH host (user@host):" },
    { type: "input", name: "keyPath", message: "SSH key path:", default: "~/.ssh/id_rsa" },
    { type: "input", name: "domain", message: "Domain name (for SSL):" },
  ]);

  assertSafeShellArg(answers.host, "SSH host");
  assertSafeShellArg(answers.keyPath, "SSH key path");
  assertSafeShellArg(answers.domain, "Domain name");

  const testSpinner = ora("Testing SSH connection...").start();
  const sshTest = shelljs.exec(
    `ssh -i ${answers.keyPath} -o ConnectTimeout=10 ${answers.host} "echo ok"`,
    { silent: true }
  );

  if (sshTest.code !== 0) {
    testSpinner.fail("SSH connection failed");
    fatal(`Cannot connect to ${answers.host}. Check your SSH key and host.`);
  }
  testSpinner.succeed("SSH connection OK");

  const caddyfile = generateCaddyfile(answers.domain);
  await fs.writeFile("Caddyfile", caddyfile, "utf-8");

  const syncSpinner = ora("Syncing files to remote...").start();
  const rsyncResult = shelljs.exec(
    `rsync -avz --exclude node_modules --exclude dist -e "ssh -i ${answers.keyPath}" ./ ${answers.host}:~/company-agents/`,
    { silent: true }
  );

  if (rsyncResult.code !== 0) {
    syncSpinner.fail("Rsync failed");
    fatal(rsyncResult.stderr || "Rsync exited with a non-zero status code");
  }
  syncSpinner.succeed("Files synced");

  const deploySpinner = ora("Starting services on remote...").start();
  const deployResult = shelljs.exec(
    `ssh -i ${answers.keyPath} ${answers.host} "cd ~/company-agents && docker compose --profile production up -d --build"`,
    { silent: true }
  );

  if (deployResult.code !== 0) {
    deploySpinner.fail("Remote deploy failed");
    fatal(deployResult.stderr || "Remote deploy exited with a non-zero status code");
  }
  deploySpinner.succeed("Services running on remote");

  console.log(`\n  ${pc.green("🎉")} Live at: ${pc.bold(`https://${answers.domain}`)}\n`);
}
