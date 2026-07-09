import { exec } from 'child_process';
import { existsSync } from 'fs';
import { join, resolve as pathResolve } from 'path';

export function runPythonScript(scriptName: string, mediaPath: string): Promise<boolean> {
  return new Promise((promiseResolve, reject) => {
    const candidateScriptPaths = [
      join(__dirname, 'python', scriptName),
      pathResolve(process.cwd(), 'apps/content-moderation-service/src/filters/python', scriptName),
    ];
    const fullPath = candidateScriptPaths.find((scriptPath) => existsSync(scriptPath));

    if (!fullPath) {
      console.error(`Error: Python script not found for ${scriptName}`);
      return reject(false);
    }

    const interpreters = process.platform === 'win32'
      ? ['python3', 'py']
      : ['python3'];

    const tryInterpreter = (index: number) => {
      if (index >= interpreters.length) {
        console.error(`Error: unable to run ${scriptName}. Python interpreter not found.`);
        return reject(false);
      }

      const interpreter = interpreters[index];
      exec(`${interpreter} ${fullPath} "${mediaPath}"`, (error, stdout, stderr) => {
        if (error) {
          const stderrText = (stderr || '').trim();
          const errorText = `${error.message || ''} ${stderrText}`.toLowerCase();
          const isCommandNotFound =
            errorText.includes('not recognized') ||
            errorText.includes('not found') ||
            errorText.includes('enoent');

          if (isCommandNotFound && index < interpreters.length - 1) {
            return tryInterpreter(index + 1);
          }

          console.error(`Error: ${stderrText || error.message}`);
          return reject(false);
        }

        const result = stdout.trim().toLowerCase();
        promiseResolve(result === 'true');
      });
    };

    tryInterpreter(0);
  });
}
