/**
 * QA FIXTURE — DELETE WITH THIS BRANCH. DO NOT MERGE.
 *
 * Test case 14 (PMCM-750), step 1: "Add a fake AWS-style key (AKIA + 16
 * fake chars) to a tracked file; open PR." The expected result is that
 * the secret scan fails and reports file and line.
 *
 * The value below is invented. It is not a credential, has never been
 * issued by AWS, and grants access to nothing. It exists only to match
 * the aws-access-token detection rule.
 *
 * Branch: qa/secret-scan-pmcm-750 — close the PR without merging.
 */
export const QA_FAKE_AWS_ACCESS_KEY_ID = 'AKIAQA7PMCM750FAKE00';
