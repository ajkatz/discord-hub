import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

describe('announcer', () => {
  it('announce.mjs parses', () => {
    const r = spawnSync('node', ['--check', 'announcer/announce.mjs'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });

  it('both workflow files parse as YAML (an unquoted colon in a description broke every caller once)', () => {
    for (const f of ['.github/workflows/announce.yml', 'templates/discord-announce.yml']) {
      expect(() => parse(readFileSync(f, 'utf8')), f).not.toThrow();
    }
    const called = parse(readFileSync('.github/workflows/announce.yml', 'utf8'));
    expect(Object.keys(called.on.workflow_call.inputs)).toEqual(['project_name', 'project_description', 'hub_ref']);
  });

  it('the reusable workflow is callable and declares both secrets', () => {
    const wf = readFileSync('.github/workflows/announce.yml', 'utf8');
    expect(wf).toMatch(/workflow_call/);
    expect(wf).toMatch(/DISCORD_WEBHOOK_URL/);
    expect(wf).toMatch(/ANTHROPIC_API_KEY/);
    expect(wf).toMatch(/project_name/);
    expect(wf).toMatch(/fetch-depth: 0/);
  });

  it('the caller template points at this repo and passes both secrets by name', () => {
    const t = readFileSync('templates/discord-announce.yml', 'utf8');
    expect(t).toMatch(/uses: ajkatz\/discord-hub\/\.github\/workflows\/announce\.yml@/);
    expect(t).toMatch(/DISCORD_WEBHOOK_URL: \$\{\{ secrets\.DISCORD_WEBHOOK_URL \}\}/);
    expect(t).toMatch(/ANTHROPIC_API_KEY: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/);
    expect(t).not.toMatch(/secrets: inherit/);
    expect(t).toMatch(/branches: \[main\]/);
  });
});
