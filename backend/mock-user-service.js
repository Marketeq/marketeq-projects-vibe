/**
 * Mock user-service for local legal-service development.
 * Returns Priya Bharathi's data for the dev seed user ID so
 * the signed NDA PDF shows a real name (legally binding).
 *
 * Run with: node mock-user-service.js
 */
const http = require('http')

const users = {
  // Dev signer user ID — maps to Priya's real name
  '11111111-1111-4111-a111-111111111111': {
    userId:    '11111111-1111-4111-a111-111111111111',
    firstName: 'Priya',
    lastName:  'Bharathi',
    username:  'priyabharathi',
    legalName: 'Priya Bharathi',
    email:     'priyabharathia@email.com',
  },
}

http.createServer((req, res) => {
  const match = req.url.match(/\/internal\/users\/([^/?]+)/)
  if (match && users[match[1]]) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(users[match[1]]))
    console.log(`✅ ${req.url} → Priya Bharathi`)
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ message: 'User not found' }))
    console.log(`❌ ${req.url} → 404`)
  }
}).listen(3002, () => {
  console.log('Mock user-service running on http://localhost:3002')
  console.log('User 11111111-... → Priya Bharathi')
})
