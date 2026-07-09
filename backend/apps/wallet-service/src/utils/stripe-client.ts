import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  // eslint-disable-next-line no-console
  console.warn('STRIPE_SECRET_KEY is not defined — Stripe calls will fail at runtime')
}

export const stripe = new Stripe(key || 'sk_missing', {
  apiVersion: '2023-10-16',
})
