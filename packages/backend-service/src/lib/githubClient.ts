import path from "node:path";
import { Buffer } from "node:buffer";
import { config } from "./config.js";

export interface GitHubTextFile {
  filePath: string;
  content: string;
  sha: string;
  githubUrl: string;
}

const FILE_SUFFIXES = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  "/index.ts",
  "/index.tsx",
  "/index.js",
  "/index.jsx"
];

function getHeaders(): HeadersInit {
  if (!config.githubToken) {
    throw new Error("GITHUB_TOKEN is missing");
  }

  return {
    Authorization: `Bearer ${config.githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

export async function verifyGithubRepoAccess(): Promise<"ok" | "missing" | "error"> {
  if (!config.githubToken) {
    return "missing";
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${config.githubRepo}`, {
      headers: getHeaders()
    });
    return response.ok ? "ok" : "error";
  } catch {
    return "error";
  }
}

function normalizeCandidate(candidate: string): string {
  return candidate.replace(/\\/g, "/").replace(/^\/+/, "");
}

function resolveCandidates(fromFilePath: string, specifier: string): string[] {
  if (specifier.startsWith("libs/")) {
    return FILE_SUFFIXES.map((suffix) => normalizeCandidate(`${specifier}${suffix}`));
  }

  if (!specifier.startsWith(".")) {
    return [];
  }

  const baseDir = path.posix.dirname(fromFilePath);
  return FILE_SUFFIXES.map((suffix) => normalizeCandidate(path.posix.join(baseDir, `${specifier}${suffix}`)));
}

export async function getGithubTextFile(filePath: string, branch: string): Promise<GitHubTextFile> {
  const response = await fetch(
    `https://api.github.com/repos/${config.githubRepo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
    {
      headers: getHeaders()
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub lookup failed for ${filePath}`);
  }

  const payload = await response.json() as {
    content?: string;
    encoding?: string;
    sha: string;
    html_url: string;
    type: string;
  };

  if (payload.type !== "file" || !payload.content || payload.encoding !== "base64") {
    throw new Error(`GitHub file content unavailable for ${filePath}`);
  }

  return {
    filePath,
    content: Buffer.from(payload.content, "base64").toString("utf8"),
    sha: payload.sha,
    githubUrl: payload.html_url
  };
}

export async function findGithubFilePathByHint(filePath: string, branch: string): Promise<string | null> {
  const basename = path.posix.basename(filePath);
  const normalizedHint = normalizeCandidate(filePath);
  const hintTail = normalizedHint.split("/").slice(-3).join("/");

  const query = encodeURIComponent(`repo:${config.githubRepo} filename:${basename}`);
  const response = await fetch(`https://api.github.com/search/code?q=${query}&per_page=20`, {
    headers: getHeaders()
  });

  if (!response.ok) {
    throw new Error(`GitHub code search failed for ${basename}`);
  }

  const payload = await response.json() as {
    items?: Array<{
      path: string;
    }>;
  };

  const items = payload.items?.map((item) => item.path) ?? [];
  const exactMatch = items.find((candidate) => candidate === normalizedHint);
  if (exactMatch) {
    return exactMatch;
  }

  const tailMatch = items.find((candidate) => candidate.endsWith(hintTail));
  if (tailMatch) {
    return tailMatch;
  }

  return items[0] ?? null;
}

function extractImportSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();
  const importPattern = /(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g;
  let match = importPattern.exec(source);
  while (match) {
    specifiers.add(match[1]);
    match = importPattern.exec(source);
  }
  return Array.from(specifiers);
}

export async function getRelatedGithubFiles(
  targetFilePath: string,
  source: string,
  branch: string,
  limit = 4
): Promise<GitHubTextFile[]> {
  const files: GitHubTextFile[] = [];
  const seen = new Set<string>([targetFilePath]);
  const specifiers = extractImportSpecifiers(source);

  for (const specifier of specifiers) {
    const candidates = resolveCandidates(targetFilePath, specifier);
    for (const candidate of candidates) {
      if (seen.has(candidate)) {
        continue;
      }

      try {
        const file = await getGithubTextFile(candidate, branch);
        seen.add(candidate);
        files.push(file);
        break;
      } catch {
        continue;
      }
    }

    if (files.length >= limit) {
      break;
    }
  }

  return files;
}
