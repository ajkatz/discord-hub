import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

describe('announcer', () => {
  it('announce.mjs parses', () => {
    const r = spawnSync('node', ['--check', 'announcer/announce.mjs'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });

  it('the reusable workflow is callable and declares both secrets', () => {
    const wf = readFileSync('.github/workflows/announce.yml', 'utf8');
    expect(wf).toMatch(/workflow_call/);
    expect(wf).toMatch(/DISCORD_WEBHOOK_URL/);
    expect(wf).toMatch(/ANTHROPIC_API_KEY/);
    expect(wf).toMatch(/project_name/);
    expect(wf).toMatch(/fetch-depth: 0/);
  });

  it('the caller template points at this repo and inherits secrets', () => {
    const t = readFileSync('templates/discord-announce.yml', 'utf8');
    expect(t).toMatch(/uses: ajkatz\/discord-hub\/\.github\/workflows\/announce\.yml@/);
    expect(t).toMatch(/secrets: inherit/);
    expect(t).toMatch(/branches: \[main\]/);
  });
});
