import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ExecCheckConfig {
  command: string;
  expectOutput?: string;
  timeoutMs?: number;
}

export interface ExecCheckResult {
  ok: boolean;
  output: string;
  error?: string;
}

export async function checkExec(config: ExecCheckConfig): Promise<ExecCheckResult> {
  const { command, expectOutput, timeoutMs = 10_000 } = config;

  // Split into executable + args; use shell=false for safety
  const [bin, ...args] = command.split(/\s+/);

  try {
    const { stdout, stderr } = await execFileAsync(bin, args, { timeout: timeoutMs });
    const output = stdout.trim() || stderr.trim();

    if (expectOutput !== undefined) {
      // Exact match — `includes` would return true for 'inactive' against
      // an expectOutput of 'active', which is exactly the wrong answer.
      const ok = output === expectOutput;
      return { ok, output, ...(ok ? {} : { error: `expected "${expectOutput}" in output` }) };
    }

    return { ok: true, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const output = (err as { stdout?: string }).stdout?.trim() ?? '';
    return { ok: false, output, error: message };
  }
}
