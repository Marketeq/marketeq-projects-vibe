/**
 * Fix invalid BlogPosts.body values via Payload REST API.
 *
 * Payload `richText` uses Lexical JSON. Older seeds/backfills wrote HTML strings,
 * which breaks the admin editor with:
 * "The value passed to the Lexical editor is not an object"
 *
 * Run with:
 * - CMS_SERVICE_URL=http://localhost:3001
 * - CMS_API_KEY=...
 *
 *   node scripts/fix-blog-richtext.mjs
 */
import 'dotenv/config'

const CMS_SERVICE_URL = (process.env.CMS_SERVICE_URL || '').replace(/\/+$/, '')
const CMS_API_KEY = (process.env.CMS_API_KEY || '').trim()

if (!CMS_SERVICE_URL) {
  throw new Error('CMS_SERVICE_URL is required (e.g. http://localhost:3001)')
}
if (!CMS_API_KEY) {
  throw new Error('CMS_API_KEY is required')
}

function stripHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function textToLexical(text) {
  const cleaned = String(text || '').trim()
  const paragraphs = cleaned ? cleaned.split(/\n{2,}/g) : ['']

  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: paragraphs.map((p) => ({
        type: 'paragraph',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        textFormat: 0,
        textStyle: '',
        children: [
          {
            mode: 'normal',
            text: p,
            type: 'text',
            style: '',
            detail: 0,
            format: 0,
            version: 1,
          },
        ],
      })),
    },
  }
}

let updated = 0
let scanned = 0

for (let page = 1; ; page++) {
  const res = await fetch(`${CMS_SERVICE_URL}/api/blog-posts?page=${page}&limit=100&depth=0`, {
    headers: {
      Authorization: `users API-Key ${CMS_API_KEY}`,
      Accept: 'application/json',
    },
  }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`List failed: ${r.status}`))))

  const docs = res?.docs || []
  if (docs.length === 0) break

  for (const doc of docs) {
    scanned++
    const body = doc?.body
    if (typeof body !== 'string') continue

    const asText = stripHtml(body)
    await fetch(`${CMS_SERVICE_URL}/api/blog-posts/${doc.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `users API-Key ${CMS_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ body: textToLexical(asText) }),
    }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Patch failed: ${r.status}`))))
    updated++
  }

  if (!res?.hasNextPage) break
}

console.log(`✔ Scanned ${scanned} blog posts; fixed ${updated} invalid richText bodies.`)
process.exit(0)

