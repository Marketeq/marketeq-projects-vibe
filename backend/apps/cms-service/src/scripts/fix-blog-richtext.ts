/**
 * Fix invalid BlogPosts.body values using Payload local API (overrideAccess).
 *
 * Payload `richText` uses Lexical JSON. Older seeds/backfills wrote HTML strings,
 * which breaks the admin editor with:
 * "The value passed to the Lexical editor is not an object"
 *
 * Run via:
 *   npx -s ts-node-dev --transpile-only --no-respawn --exit-child src/scripts/fix-blog-richtext.ts
 */
import 'dotenv/config'
import payload from 'payload'

function stripHtml(html: string): string {
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

function textToLexical(text: string) {
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

async function main() {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) {
    throw new Error('PAYLOAD_SECRET environment variable is required')
  }

  // Match the Projects seed runner approach (works in this repo).
  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info('Payload CMS initialized (blog richText fixer)')
    },
  })

  let scanned = 0
  let fixed = 0

  for (let page = 1; ; page++) {
    const res = await payload.find({
      collection: 'blog-posts',
      page,
      limit: 100,
      overrideAccess: true,
    })

    const docs = res?.docs || []
    if (docs.length === 0) break

    for (const doc of docs) {
      scanned++
      const body = (doc as any)?.body
      if (typeof body !== 'string') continue

      await payload.update({
        collection: 'blog-posts',
        id: (doc as any).id,
        overrideAccess: true,
        data: {
          body: textToLexical(stripHtml(body)),
        },
      })
      fixed++
    }

    if (!res?.hasNextPage) break
  }

  // eslint-disable-next-line no-console
  console.log(`✔ Scanned ${scanned} blog posts; fixed ${fixed} invalid richText bodies.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err)
    process.exit(1)
  })

