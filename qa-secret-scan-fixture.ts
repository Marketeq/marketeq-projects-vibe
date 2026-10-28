/**
 * QA FIXTURE — DELETE WITH THIS BRANCH. DO NOT MERGE.
 *
 * Test case 14 (PMCM-750), step 2: "Replace with the fake
 * connection-string fixture; push." Expected: the secret scan fails
 * again, this time on the connection string.
 *
 * The test case expected a separate "Connection String Scan" job. No such
 * job exists. PR #825 instead added a connection-string-password rule to
 * gitleaks, which is the parenthesised path the test case allowed for
 * ("and gitleaks once ruleset extended"). This fixture targets that rule.
 *
 * The value below is invented. The host is in the RFC 2606 .invalid TLD
 * and cannot resolve. The password is not an allowlisted placeholder, so
 * the rule should fire on it.
 *
 * Branch: qa/secret-scan-pmcm-750 — close the PR without merging.
 */
export const QA_FAKE_DATABASE_URL =
  'postgresql://qa_pmcm750_user:QaFake750NotARealPassword@db.example.invalid:5432/qa_fixture_db';
