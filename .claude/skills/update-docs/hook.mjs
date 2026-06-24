/**
 * PreToolUse hook — runs before Bash tool calls.
 * When the command is `gh pr create`, invokes the /update-docs skill
 * so that CLAUDE.md and README.md are updated before the PR is submitted.
 *
 * Claude Code passes tool-call info as JSON on stdin:
 *   { "tool_name": "Bash", "tool_input": { "command": "..." } }
 *
 * Exit 0 → allow the tool call to proceed.
 * Exit 2 → block the tool call and show stdout as a message.
 */

import { execSync } from 'child_process';

const chunks = [];
process.stdin.on('data', (d) => chunks.push(d));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    process.exit(0); // not valid JSON — let the tool call through
  }

  const cmd = input?.tool_input?.command ?? '';
  if (!/gh\s+pr\s+create/.test(cmd)) {
    process.exit(0); // not a PR creation — nothing to do
  }

  process.stdout.write('[update-docs] Updating documentation before PR creation...\n');

  try {
    execSync('claude -p "/update-docs"', {
      stdio: 'inherit',
      timeout: 180_000, // 3 min ceiling
    });
    process.stdout.write('[update-docs] Documentation updated. Proceeding with PR creation.\n');
  } catch (err) {
    // Log the warning but do NOT block — the PR can still be created.
    process.stderr.write(
      `[update-docs] Warning: doc update did not complete cleanly: ${err.message}\n`,
    );
  }

  process.exit(0);
});
