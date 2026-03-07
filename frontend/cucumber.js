//RUNNER FILE FOR CUCUMBER TESTS
module.exports = {
  // ── default shared config ──────────────────────────────────────────────
  default: {
    requireModule: ["ts-node/register"],
    require: ["e2e-cucumber/common/common.steps.ts", "e2e-cucumber/hooks/hooks.ts"],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
    parallel: 1,
  },

  // ── 02 talent onboarding / signup email set password ──────────────────
  talentOnboarding: {
    requireModule: ["ts-node/register"],
    require: [
      "e2e-cucumber/common/common.steps.ts",
      "e2e-cucumber/stepDefinitions/02-signup-email-setpassword.steps.ts",
      "e2e-cucumber/hooks/hooks.ts"
    ],
    paths: ["e2e-cucumber/features/02-signup-email-setpassword.feature"],
    format: [
      "progress",
      "html:reports/signup-email-setpassword.html",
      "json:reports/signup-email-setpassword.json",
    ],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
  },

  // ── 04 google signup/signin ───────────────────────────────────────────
  googleSignupSignin: {
    requireModule: ["ts-node/register"],
    require: [
      "e2e-cucumber/common/common.steps.ts",
      "e2e-cucumber/stepDefinitions/04-google-signup-signin.steps.ts",
      "e2e-cucumber/hooks/hooks.ts"
    ],
    paths: ["e2e-cucumber/features/04-google-signup-signin.feature"],
    format: [
      "progress",
      "html:reports/google-signup.html",
      "json:reports/google-signup.json",
    ],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
  },

  // ── 05 sign-in data-driven ────────────────────────────────────────────
  datadrivenSignin: {
    requireModule: ["ts-node/register"],
    require: [
      "e2e-cucumber/common/common.steps.ts",
      "e2e-cucumber/stepDefinitions/05-signin-datadriven-test.steps.ts",
      "e2e-cucumber/hooks/hooks.ts"
    ],
    paths: ["e2e-cucumber/features/05-signin-datadriven-test.feature"],
    format: [
      "progress",
      "html:reports/signin-datadriven-test.html",
      "json:reports/signin-datadriven-test.json",
    ],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
  },

  // ── 07 publish project ────────────────────────────────────────────────
  publishProject: {
    requireModule: ["ts-node/register"],
    require: [
      "e2e-cucumber/common/common.steps.ts",
      "e2e-cucumber/stepDefinitions/publish-project.steps.ts",
      "e2e-cucumber/hooks/hooks.ts"
    ],
    paths: ["e2e-cucumber/features/07-publish-project.feature"],
    format: [
      "progress",
      "html:reports/publish-project.html",
      "json:reports/publish-project.json",
    ],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
  },

  // ── run only requested features: 02, 04, 05, 07 ──────────────────────
  all: {
    requireModule: ["ts-node/register"],
    require: [
      "e2e-cucumber/common/common.steps.ts",
      "e2e-cucumber/stepDefinitions/02-signup-email-setpassword.steps.ts",
      "e2e-cucumber/stepDefinitions/04-google-signup-signin.steps.ts",
      "e2e-cucumber/stepDefinitions/05-signin-datadriven-test.steps.ts",
      "e2e-cucumber/stepDefinitions/publish-project.steps.ts",
      "e2e-cucumber/hooks/hooks.ts"
    ],
    paths: [
      "e2e-cucumber/features/02-signup-email-setpassword.feature",
      "e2e-cucumber/features/04-google-signup-signin.feature",
      "e2e-cucumber/features/05-signin-datadriven-test.feature",
      "e2e-cucumber/features/07-publish-project.feature"
    ],
    format: [
      "progress",
      "html:reports/selected-features.html",
      "json:reports/selected-features.json",
    ],
    formatOptions: { snippetInterface: "async-await" },
    publishQuiet: true,
  },
};
