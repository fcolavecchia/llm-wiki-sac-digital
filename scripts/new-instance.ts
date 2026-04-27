import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

interface Options {
  description?: string;
  install: boolean;
  name: string;
  owner?: string;
  remote: boolean;
  repoName: string;
  targetDir: string;
  title: string;
  visibility: "private" | "public";
}

const TEMPLATE_ROOT = process.cwd();
const INSTANCE_README_TEMPLATE = path.join(TEMPLATE_ROOT, "README.local.md");
const RAW_DIRS = ["raw", "raw/inbox", "raw/processed", "raw/assets"];
const WIKI_DIRS = ["wiki/concepts", "wiki/entities", "wiki/topics", "wiki/sources", "wiki/analyses"];
const EXCLUDED_NAMES = new Set([".git", ".next", "coverage", "dist", "node_modules", "out", "raw"]);

function printUsage(): never {
  console.error(`Usage: npm run new:instance -- --name <domain> [options]

Options:
  --name <domain>          Required. Domain slug, for example "salud".
  --title <title>          Optional display title. Defaults to title-cased name.
  --dir <path>             Optional target directory. Defaults to ../llm-wiki-<slug>
  --repo <name>            Optional repo name. Defaults to llm-wiki-<slug>
  --owner <owner>          Optional GitHub owner or org for gh repo create.
  --description <text>     Optional GitHub repo description.
  --public                 Create the remote repository as public.
  --private                Create the remote repository as private. Default.
  --skip-install           Skip npm install in the generated repo.
  --skip-remote            Skip gh repo create and git push.
`);
  process.exit(1);
}

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function titleCase(input: string): string {
  return input
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

function currentDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseArgs(argv: string[]): Options {
  let name = "";
  let title = "";
  let repoName = "";
  let targetDir = "";
  let owner: string | undefined;
  let description: string | undefined;
  let install = true;
  let remote = true;
  let visibility: "private" | "public" = "private";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    switch (arg) {
      case "--name":
        name = next || "";
        index += 1;
        break;
      case "--title":
        title = next || "";
        index += 1;
        break;
      case "--dir":
        targetDir = next || "";
        index += 1;
        break;
      case "--repo":
        repoName = next || "";
        index += 1;
        break;
      case "--owner":
        owner = next || "";
        index += 1;
        break;
      case "--description":
        description = next || "";
        index += 1;
        break;
      case "--public":
        visibility = "public";
        break;
      case "--private":
        visibility = "private";
        break;
      case "--skip-install":
        install = false;
        break;
      case "--skip-remote":
        remote = false;
        break;
      default:
        printUsage();
    }
  }

  if (!name) {
    printUsage();
  }

  const slug = slugify(name);
  const resolvedTitle = title || titleCase(name);
  const resolvedRepoName = repoName || `llm-wiki-${slug}`;
  const resolvedTargetDir = path.resolve(TEMPLATE_ROOT, targetDir || path.join("..", resolvedRepoName));

  return {
    description,
    install,
    name: slug,
    owner,
    remote,
    repoName: resolvedRepoName,
    targetDir: resolvedTargetDir,
    title: resolvedTitle,
    visibility,
  };
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function captureCommand(command: string, args: string[], cwd: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      resolve({
        code: code ?? 1,
        stderr,
        stdout,
      });
    });
  });
}

async function listTemplateFiles(root: string): Promise<string[]> {
  const gitDir = path.join(root, ".git");
  if (await pathExists(gitDir)) {
    const result = await captureCommand("git", ["ls-files", "--cached", "--others", "--exclude-standard"], root);
    if (result.code === 0) {
      return result.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((relativePath) => relativePath !== "README.md" && relativePath !== "README.local.md")
        .filter((relativePath) => !path.basename(relativePath).endsWith(".swp"))
        .filter((relativePath) => !relativePath.split(path.sep).some((part) => EXCLUDED_NAMES.has(part)));
    }
  }

  const files: string[] = [];

  async function walk(directory: string) {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
      if (EXCLUDED_NAMES.has(entry.name) || entry.name.startsWith(".tmp-") || entry.name.endsWith(".swp")) {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolutePath);

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        if (relativePath === "README.md" || relativePath === "README.local.md") {
          continue;
        }
        files.push(relativePath);
      }
    }
  }

  await walk(root);
  return files.sort();
}

async function copyTemplate(source: string, destination: string): Promise<void> {
  const files = await listTemplateFiles(source);
  await fs.mkdir(destination, { recursive: true });

  for (const relativeFile of files) {
    const sourcePath = path.join(source, relativeFile);
    const destinationPath = path.join(destination, relativeFile);
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(sourcePath, destinationPath);
  }
}

async function ensureDirectories(root: string, directories: string[]): Promise<void> {
  await Promise.all(directories.map((directory) => fs.mkdir(path.join(root, directory), { recursive: true })));
}

async function removeDirectoryContents(root: string, relativePath: string): Promise<void> {
  const directory = path.join(root, relativePath);
  if (!(await pathExists(directory))) {
    return;
  }

  const entries = await fs.readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      await fs.rm(path.join(directory, entry.name), { force: true, recursive: true });
    }),
  );
}

async function updatePackageJson(root: string, repoName: string): Promise<void> {
  const packageJsonPath = path.join(root, "package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8")) as {
    name: string;
    [key: string]: unknown;
  };
  packageJson.name = repoName;
  await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

async function updateEnvExample(root: string, title: string): Promise<void> {
  const envPath = path.join(root, ".env.example");
  const source = await fs.readFile(envPath, "utf8");
  const nextSiteName = `NEXT_PUBLIC_SITE_NAME=${title}`;
  const updated = source.replace(/^NEXT_PUBLIC_SITE_NAME=.*$/m, nextSiteName);
  await fs.writeFile(envPath, updated, "utf8");
}

async function updateReadme(root: string, repoName: string, title: string): Promise<void> {
  const readmePath = path.join(root, "README.md");
  const source = await fs.readFile(INSTANCE_README_TEMPLATE, "utf8");
  const updated = source
    .replaceAll("__WIKI_TITLE__", title)
    .replaceAll("__REPO_NAME__", repoName);
  await fs.writeFile(readmePath, updated, "utf8");
}

async function resetWiki(root: string, title: string, domainSlug: string): Promise<void> {
  for (const directory of WIKI_DIRS) {
    await removeDirectoryContents(root, directory);
  }

  await ensureDirectories(root, WIKI_DIRS);

  const date = currentDate();
  const overview = `---
title: Overview
type: overview
slug: overview
status: active
updated: ${date}
summary: Entry point for the ${title} wiki.
---

# Overview

This wiki is dedicated to ${title}. It is maintained by an LLM and uses \`wiki/\` as the persistent, versioned knowledge layer.

## Scope

- domain: ${title}
- repository slug: ${domainSlug}
- source location: local \`raw/inbox/\`

## Next Steps

1. Add source files to \`raw/inbox/\`.
2. Ask Codex to ingest them following \`AGENTS.md\`.
3. Review the generated pages in the web UI.
`;

  const log = `---
title: Activity Log
type: system
slug: log
status: active
updated: ${date}
summary: Chronological record of ingests, analyses, lint passes, and structural changes.
---

# Activity Log

## [${date}] bootstrap | ${title.toLowerCase()} wiki initialized
- Created a fresh wiki instance from the template.
- Reset starter content and prepared local raw directories.
`;

  const index = `---
title: Wiki Index
type: system
slug: index
status: active
updated: ${date}
summary: Generated catalog of the wiki tree for humans and agents.
---

# Wiki Index

This wiki is initialized and ready for the first ingest.

## Overview

- [Overview](/) - Entry point for the ${title} wiki. | updated ${date}
`;

  await fs.writeFile(path.join(root, "wiki", "overview.md"), overview, "utf8");
  await fs.writeFile(path.join(root, "wiki", "log.md"), log, "utf8");
  await fs.writeFile(path.join(root, "wiki", "index.md"), index, "utf8");
}

async function createLocalScaffold(root: string): Promise<void> {
  await ensureDirectories(root, RAW_DIRS);
}

async function checkGhAuth(cwd: string): Promise<void> {
  const result = await captureCommand("gh", ["auth", "status"], cwd);
  if (result.code !== 0) {
    throw new Error(`gh auth is not ready.\n${result.stderr.trim() || result.stdout.trim()}\nRun: gh auth login -h github.com`);
  }
}

async function initializeGitRepo(root: string, title: string): Promise<void> {
  await runCommand("git", ["init", "-b", "main"], root);
  await runCommand("git", ["add", "."], root);
  await runCommand("git", ["commit", "-m", `Initial scaffold for ${title}`], root);
}

async function createRemoteRepo(root: string, options: Options): Promise<void> {
  await checkGhAuth(root);

  const target = options.owner ? `${options.owner}/${options.repoName}` : options.repoName;
  const args = ["repo", "create", target, `--${options.visibility}`, "--source=.", "--remote=origin", "--push"];

  if (options.description) {
    args.splice(2, 0, "--description", options.description);
  }

  await runCommand("gh", args, root);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const relativeTarget = path.relative(TEMPLATE_ROOT, options.targetDir);

  if (relativeTarget === "" || (!relativeTarget.startsWith("..") && !path.isAbsolute(relativeTarget))) {
    throw new Error("Target directory must be outside the template repository. Use the default sibling path or pass --dir ../<new-repo>.");
  }

  if (await pathExists(options.targetDir)) {
    throw new Error(`Target directory already exists: ${options.targetDir}`);
  }

  console.log(`Creating new wiki instance at ${options.targetDir}`);
  await copyTemplate(TEMPLATE_ROOT, options.targetDir);
  await createLocalScaffold(options.targetDir);
  await updatePackageJson(options.targetDir, options.repoName);
  await updateEnvExample(options.targetDir, `${options.title} Wiki`);
  await updateReadme(options.targetDir, options.repoName, options.title);
  await resetWiki(options.targetDir, options.title, options.name);

  if (options.install) {
    console.log("Installing dependencies in the generated repository...");
    await runCommand("npm", ["install"], options.targetDir);
  }

  console.log("Initializing git repository...");
  await initializeGitRepo(options.targetDir, options.title);

  if (options.remote) {
    console.log("Creating GitHub repository and pushing initial commit...");
    await createRemoteRepo(options.targetDir, options);
  } else {
    console.log("Skipping remote repository creation.");
  }

  console.log("");
  console.log("Instance ready.");
  console.log(`Directory: ${options.targetDir}`);
  console.log(`Next step: add files to ${path.join(options.targetDir, "raw", "inbox")}`);
}

main().catch((error) => {
  console.error("");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
