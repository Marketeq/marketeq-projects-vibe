// src/filters/python-script.service.ts
import { Injectable } from '@nestjs/common';
import { runPythonScript } from './python-runner.util';
@Injectable()
export class PythonScriptService {
  async execute(script: string, path: string): Promise<boolean> {
    return runPythonScript(script, path);
  }
}
