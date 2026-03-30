/**
 * github.js — GitHub CLI wrappers for issue creation, auth, and error handling
 */

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { execSync } from "child_process";

const GITHUB_REPO = "stuchapin909/Open-Eagle-Eye";

export function ghIssueCreate(title, body, label) {
  const tmpFile = path.join(os.tmpdir(), `oee-${crypto.randomBytes(4).toString('hex')}.md`);
  fs.writeFileSync(tmpFile, body, 'utf8');
  try {
    const result = execSync(
      `gh issue create --repo ${GITHUB_REPO} --title ${JSON.stringify(title)} --body-file ${JSON.stringify(tmpFile)} --label ${JSON.stringify(label)}`,
      { encoding: "utf8", timeout: 30000 }
    ).trim();
    return result;
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

export function classifyGhError(err) {
  const msg = err.stderr?.toString() || err.message || "";
  if (msg.includes("not found") && msg.includes("gh")) return { type: "gh_not_installed", message: "gh CLI is not installed", fix: "Install: https://cli.github.com/" };
  if (msg.includes("not authenticated") || msg.includes("authentication") || msg.includes("auth")) return { type: "not_authenticated", message: "gh CLI is not authenticated", fix: "Run: gh auth login" };
  if (msg.includes("not found") && msg.includes("label")) return { type: "label_missing", message: "GitHub label not found on repo", fix: "Create the label on GitHub first" };
  if (msg.includes("rate limit") || msg.includes("rate-limit") || msg.includes("secondary rate")) return { type: "rate_limited", message: "GitHub API rate limit hit", fix: "Wait a few minutes and retry" };
  if (msg.includes("timed out") || msg.includes("ETIMEDOUT") || msg.includes("ECONNREFUSED")) return { type: "network_error", message: "Network error contacting GitHub", fix: "Check your internet connection" };
  if (msg.includes("permission") || msg.includes("403") || msg.includes("Forbidden")) return { type: "permission_denied", message: "Permission denied — token may lack 'issues' scope", fix: "Run: gh auth refresh -s repo,write:issues" };
  if (msg.includes("could not add label")) return { type: "label_missing", message: msg.trim(), fix: "Label does not exist on the repo" };
  return { type: "unknown", message: msg.substring(0, 300), fix: "Check gh CLI configuration" };
}

export function checkGhAuth() {
  try {
    execSync("gh auth status", { stdio: "pipe", timeout: 5000 });
    return { ok: true };
  } catch (e) {
    return { ok: false, ...classifyGhError(e) };
  }
}

export function checkDuplicateUrls(cameraUrls) {
  try {
    const output = execSync(
      `gh issue list --repo ${GITHUB_REPO} --label webcam-submission --state open --json number,body,title --limit 50`,
      { encoding: "utf8", timeout: 15000 }
    );
    const issues = JSON.parse(output);
    const duplicates = [];
    for (const issue of issues) {
      const body = issue.body || "";
      for (const url of cameraUrls) {
        if (body.includes(url)) {
          duplicates.push({ url, issue_number: issue.number, issue_title: issue.title });
        }
      }
    }
    return duplicates;
  } catch (e) {
    // If we can't check, don't block the submission
    return [];
  }
}
