import 'dotenv/config'
import payload from 'payload'
import { seedDefaultContent } from './default-content.seed'

async function main() {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET environment variable is required')

  await payload.init({
    secret,
    local: true,
    onInit: async () => {
      payload.logger.info('Payload CMS initialized (default content seed runner)')
    },
  })

  await seedDefaultContent(payload)

  payload.logger.info('Default content seed complete.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Default content seed failed:', err)
  process.exit(1)
})

