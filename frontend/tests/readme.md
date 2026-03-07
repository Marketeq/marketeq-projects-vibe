**_clean build cache_**
`rm -rf .next`

**_restart_**
`npm run dev`

**_Install_**
pnpm add -D @playwright/test
pnpm exec playwright install

**_.env_**
NEXT_PUBLIC_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_AUTH_URL=http://localhost:3001
NEXT_PUBLIC_USER_URL=http://localhost:3003

**_setup_**
`npx ts-node tests/setup/google.setup.ts`

**Run Linkedin Tests\***
`npx ts-node tests/setup/linkedin.setup.ts`
`npx playwright test tests/auth/linkedin/storage.linkedin.login.spec.ts --project=chrome --workers=1`
`npx playwright test tests/auth/linkedin/linkedin.login.using.api.spec.ts --project=chrome --workers=1`

**Run Google Tests\***
`npx ts-node tests/setup/google.setup.ts`
`npx playwright test tests/auth/google/storage.google.login.spec.ts --project=chrome --workers=1`
`npx playwright test tests/auth/google/google.login.using.api.spec.ts --project=chrome --workers=1`

**Run Sign-in-up Tests\***
`npx playwright test tests/auth/sign-in-up/signin.user.pwd.spec.ts --project=chrome --workers=1`
`npx playwright test tests/auth/sign-in-up/signup.work.spec.ts --project=chrome --workers=1`
`npx playwright test tests/auth/sign-in-up/signup.hire.spec.ts --project=chrome --workers=1`
`npx playwright test tests/auth/sign-in-up/signin.oauth.spec.ts --project=chrome --workers=1`

**_Open HTML report after run:_**
`npx playwright show-report report`
