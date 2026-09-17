import { redirect } from "next/navigation"

type ConfirmationPageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CheckoutConfirmationPage({
  params,
  searchParams,
}: ConfirmationPageProps) {
  const [{ slug }, confirmationParams] = await Promise.all([
    params,
    searchParams,
  ])
  const nextSearchParams = new URLSearchParams()

  Object.entries(confirmationParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => nextSearchParams.append(key, item))
    } else if (value !== undefined) {
      nextSearchParams.set(key, value)
    }
  })

  const query = nextSearchParams.toString()
  redirect(
    `/checkout/${encodeURIComponent(slug)}/success${query ? `?${query}` : ""}`
  )
}
