/**
 * GET /health
 *
 * Lightweight liveness probe required by every Marketeq service. Returns 200
 * immediately without touching the database — Render's health check expects
 * a sub-second response. Database/RabbitMQ readiness is reported separately
 * by Payload's own internal logging on boot (see CS-08 Observability).
 */
export const dynamic = 'force-dynamic'

export function GET(): Response {
  return Response.json({ status: 'ok', service: 'cms-service' })
}
