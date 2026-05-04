#!/usr/bin/env node

export const INLINE_SECRET_MARKERS = [
  "gho_",
  "vca_",
  "rnd_",
  "MarketeqSmoke1!",
  "deploy-smoke@marketeq.local",
]

export function extractRunnerUrl(jsCode) {
  return (
    jsCode.match(/https:\/\/gist\.githubusercontent\.com\/CTorres9800\/[^"]+\/marketeq_orchestrator_node\.js/)?.[0] ??
    ""
  )
}

export function containsInlineSecret(jsCode) {
  return INLINE_SECRET_MARKERS.some((marker) => jsCode.includes(marker))
}

export function buildN8nBuildCommand({ runnerRawUrl, runtimeEnvFilePath }) {
  const runnerShell = [
    `if [ ! -f ${JSON.stringify(runtimeEnvFilePath)} ]; then echo "Missing runtime env file: ${runtimeEnvFilePath}" >&2; exit 1; fi`,
    `set -a`,
    `. ${JSON.stringify(runtimeEnvFilePath)}`,
    `set +a`,
    `/usr/bin/wget -qO- ${runnerRawUrl} | /usr/local/bin/node`,
  ].join("; ")

  return `const input = $input.first()?.json ?? {};
const headers = input.headers ?? {};
const payload = input.body && Object.keys(input.body).length ? input.body : input;
const event = headers['x-github-event'] || headers['X-GitHub-Event'] || payload.event || '';
const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : (payload.branch || '');
const shaInput = payload.after || payload.sha || '';
const action = payload.action || '';
const baseShaOverride = payload.baseShaOverride || '';
const envParts = [
  'EVENT=' + JSON.stringify(event),
  'BRANCH=' + JSON.stringify(branch),
  'SHA_INPUT=' + JSON.stringify(shaInput),
  'ACTION=' + JSON.stringify(action),
  'BASE_SHA_OVERRIDE=' + JSON.stringify(baseShaOverride),
];
const runner = ${JSON.stringify(runnerShell)};
const command = 'env ' + envParts.join(' ') + ' /bin/sh -c ' + JSON.stringify(runner);
return [{ json: { event, branch, shaInput, action, baseShaOverride, command } }];`
}
