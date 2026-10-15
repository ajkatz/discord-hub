import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('systemd unit', () => {
  it('restarts always, loads env from a file, runs the built bot', () => {
    const unit = readFileSync('deploy/discord-hub-bot.service', 'utf8');
    expect(unit).toMatch(/^Restart=always$/m);
    expect(unit).toMatch(/^EnvironmentFile=\/home\/andrew\/discord-hub\.env$/m);
    expect(unit).toMatch(/^ExecStart=\/usr\/bin\/node dist\/bot\/index\.js$/m);
    expect(unit).toMatch(/^WorkingDirectory=\/home\/andrew\/discord-hub$/m);
    expect(unit).toMatch(/^User=andrew$/m);
    expect(unit).toMatch(/^WantedBy=multi-user\.target$/m);
  });
});

describe('deploy-pi.sh', () => {
  it('passes bash -n', () => {
    const r = spawnSync('bash', ['-n', 'scripts/deploy-pi.sh'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
  });

  it('DRY_RUN=1 prints rsync and ssh for the target and executes nothing', () => {
    const marker = mkdtempSync(join(tmpdir(), 'deploy-'));
    const r = spawnSync('bash', ['scripts/deploy-pi.sh', 'andrew@example.test'], { encoding: 'utf8', env: { ...process.env, DRY_RUN: '1', DEPLOY_MARKER: join(marker, 'ran') } });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/rsync .*andrew@example\.test:/);
    expect(r.stdout).toMatch(/ssh andrew@example\.test .*npm ci --omit=dev/);
    expect(r.stdout).toMatch(/sudo systemctl/);
    expect(existsSync(join(marker, 'ran'))).toBe(false);
  });

  it('defaults the target to pi5 over the LAN', () => {
    const r = spawnSync('bash', ['scripts/deploy-pi.sh'], { encoding: 'utf8', env: { ...process.env, DRY_RUN: '1' } });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/andrew@pi5\.localdomain/);
  });
});
