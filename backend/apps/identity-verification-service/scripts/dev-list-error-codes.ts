import { ERROR_CODE_CATALOG } from '../src/common/errors/error-code-catalog';

function main(): void {
  console.log(`${ERROR_CODE_CATALOG.length} error codes catalogued:`);
  for (const entry of ERROR_CODE_CATALOG) {
    console.log(
      `  ${entry.code} (${entry.httpStatus}) — ${entry.callerAudience}, safeToDisplayVerbatim=${entry.safeToDisplayVerbatim}`,
    );
  }
}

main();
