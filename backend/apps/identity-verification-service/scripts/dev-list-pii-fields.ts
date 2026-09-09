import { PII_FIELD_CATALOG } from '../src/common/security/pii-classification';

function main(): void {
  console.log(`${PII_FIELD_CATALOG.length} PII fields catalogued:`);
  for (const entry of PII_FIELD_CATALOG) {
    console.log(
      `  ${entry.table}.${entry.column} (${entry.sensitivity}) — logging: ${entry.loggingRedactionStatus}`,
    );
  }
}

main();
