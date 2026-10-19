export type WalletBrowserSupport = {
  googlePay: boolean
  applePay: boolean
}

type ApplePaySessionLike = {
  canMakePayments: () => boolean
}

export const isGooglePayBrowser = (userAgent: string) =>
  /\b(Chrome|Edg)\//.test(userAgent) &&
  !/\b(OPR|SamsungBrowser)\//.test(userAgent)

export const isApplePayBrowser = (applePaySession?: ApplePaySessionLike) => {
  if (!applePaySession) return false

  try {
    return applePaySession.canMakePayments() === true
  } catch {
    return false
  }
}

export const getWalletBrowserSupport = (): WalletBrowserSupport => ({
  googlePay: isGooglePayBrowser(window.navigator.userAgent),
  applePay: isApplePayBrowser(
    (window as unknown as { ApplePaySession?: ApplePaySessionLike })
      .ApplePaySession
  ),
})
