/**
 * Mock user-service for local legal-service development.
 * Returns a generic test user for the dev seed user ID so
 * the signed NDA PDF shows a real name (legally binding).
 *
 * Run with: node mock-user-service.js
 *
 * To use your own name locally, set env vars before running:
 *   DEV_NDA_FIRST_NAME=Your DEV_NDA_LAST_NAME=Name node mock-user-service.js
 */
const http = require('http')

const DEV_FIRST_NAME = process.env.DEV_NDA_FIRST_NAME || 'Test'
const DEV_LAST_NAME  = process.env.DEV_NDA_LAST_NAME  || 'UserName'
const DEV_EMAIL      = process.env.DEV_NDA_EMAIL      || 'test@legal-dev.local'

const users = {
  // Dev signer user ID — used for local NDA signing tests
  '11111111-1111-4111-a111-111111111111': {
    userId:    '11111111-1111-4111-a111-111111111111',
    firstName: DEV_FIRST_NAME,
    lastName:  DEV_LAST_NAME,
    username:  'dev_test_user',
    legalName: `${DEV_FIRST_NAME} ${DEV_LAST_NAME}`,
    email:     DEV_EMAIL,
  },
}

http.createServer((req, res) => {
  const match = req.url.match(/\/internal\/users\/([^/?]+)/)
  if (match && users[match[1]]) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(users[match[1]]))
    console.log(`✅ ${req.url} → ${DEV_FIRST_NAME} ${DEV_LAST_NAME}`)
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'User not found' }))
    console.log(`❌ ${req.url} → 404`)
  }
}).listen(3002, () => {
  console.log('Mock user-service running on http://localhost:3002')
  console.log(`Sign NDA with: "${DEV_FIRST_NAME} ${DEV_LAST_NAME}"`)
})
