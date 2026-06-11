import { exec, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const RUNS_DIR = path.join(__dirname, '..', '..', 'temp_runs');
if (!fs.existsSync(RUNS_DIR)) {
  fs.mkdirSync(RUNS_DIR, { recursive: true });
}

export interface RunResult {
  status: 'PASSED' | 'FAILED' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIMEOUT';
  output: string;
  error?: string;
}

export async function runCode(
  language: string,
  code: string,
  input: string,
  expectedOutput: string
): Promise<RunResult> {
  const runId = 'run_' + Math.random().toString(36).substring(2, 15) + Date.now();
  const runDir = path.join(RUNS_DIR, runId);
  fs.mkdirSync(runDir, { recursive: true });

  const inputPath = path.join(runDir, 'input.txt');
  fs.writeFileSync(inputPath, input || '');

  let codeFilename = 'solution.js';
  let compileCmd = '';
  let runCmd = '';

  const langLower = language.toLowerCase();

  if (langLower === 'javascript' || langLower === 'js') {
    codeFilename = 'solution.js';
    runCmd = `node solution.js < input.txt`;
  } else if (langLower === 'python' || langLower === 'py' || langLower === 'python3') {
    codeFilename = 'solution.py';
    runCmd = `python3 solution.py < input.txt`;
  } else if (langLower === 'typescript' || langLower === 'ts') {
    codeFilename = 'solution.ts';
    runCmd = `npx tsx solution.ts < input.txt`;
  } else if (langLower === 'cpp' || langLower === 'c++') {
    codeFilename = 'solution.cpp';
    compileCmd = `g++ -O3 solution.cpp -o solution.out`;
    runCmd = `./solution.out < input.txt`;
  } else if (langLower === 'java') {
    // Enforce class Solution
    codeFilename = 'Solution.java';
    compileCmd = `javac Solution.java`;
    runCmd = `java Solution < input.txt`;
  } else {
    // Cleanup and return unsupported
    fs.rmSync(runDir, { recursive: true, force: true });
    return {
      status: 'COMPILE_ERROR',
      output: '',
      error: `Unsupported programming language: ${language}`,
    };
  }

  const codePath = path.join(runDir, codeFilename);
  fs.writeFileSync(codePath, code);

  try {
    // 1. Compilation phase
    if (compileCmd) {
      try {
        execSync(compileCmd, {
          cwd: runDir,
          stdio: 'pipe',
          timeout: 10000, // Compilation timeout (10 seconds)
        });
      } catch (compileErr: any) {
        const stderr = compileErr.stderr ? compileErr.stderr.toString() : compileErr.message;
        return {
          status: 'COMPILE_ERROR',
          output: '',
          error: stderr,
        };
      }
    }

    // 2. Execution phase with 2-second timeout
    return new Promise<RunResult>((resolve) => {
      exec(
        runCmd,
        {
          cwd: runDir,
          timeout: 2000, // 2 seconds execution timeout
          maxBuffer: 1024 * 1024 * 5, // 5MB buffer limit
        },
        (execErr: any, stdout, stderr) => {
          if (execErr) {
            if (execErr.killed || execErr.signal === 'SIGTERM') {
              resolve({
                status: 'TIMEOUT',
                output: '',
                error: 'Execution Timed Out (Limit: 2s). Please check for infinite loops.',
              });
            } else {
              resolve({
                status: 'RUNTIME_ERROR',
                output: '',
                error: stderr || execErr.message,
              });
            }
            return;
          }

          const actual = stdout.trim();
          const expected = expectedOutput.trim();

          if (actual === expected) {
            resolve({
              status: 'PASSED',
              output: actual,
            });
          } else {
            resolve({
              status: 'FAILED',
              output: actual,
              error: `Output Mismatch.\nExpected: "${expected}"\nActual: "${actual}"`,
            });
          }
        }
      );
    });
  } catch (err: any) {
    return {
      status: 'RUNTIME_ERROR',
      output: '',
      error: err.message,
    };
  } finally {
    // Cleanup temporary folder
    setTimeout(() => {
      try {
        if (fs.existsSync(runDir)) {
          fs.rmSync(runDir, { recursive: true, force: true });
        }
      } catch (cleanupErr) {
        console.error('Failed to cleanup run folder:', runDir, cleanupErr);
      }
    }, 1000); // Small delay to release file locks on Windows/Mac if necessary
  }
}
