import { redirect } from "next/navigation"

type ConfirmationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CheckoutConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const confirmationParams = await searchParams
  const nextSearchParams = new URLSearchParams()

  Object.entries(confirmationParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => nextSearchParams.append(key, item))
    } else if (value !== undefined) {
      nextSearchParams.set(key, value)
    }
  })

  const query = nextSearchParams.toString()
  redirect(`/checkout/success${query ? `?${query}` : ""}`)
}
