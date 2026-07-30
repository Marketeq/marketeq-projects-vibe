const INVALID_TOKEN_MESSAGES = [
  "Invalid Google token",
  "Invalid Google access token",
  "Invalid Google auth code",
  "Invalid LinkedIn token",
  "Invalid LinkedIn auth code",
]

export const getOAuthErrorMessage = (error: any): string => {
  const status = error?.response?.status
  const serverMessage: unknown =
    error?.response?.data?.message ?? error?.response?.data?.errors?.message

  if (status === 423) {
    return "Your account is temporarily locked. Please try again later or reset your password."
  }

  if (status === 408 || error?.code === "ECONNABORTED") {
    return "The login request timed out. Please try again."
  }

  if (!error?.response) {
    return "Service unavailable. Please try again shortly."
  }

  if (
    typeof serverMessage === "string" &&
    serverMessage.toLowerCase().includes("session")
  ) {
    return "Your session has expired. Please log in again."
  }

  if (
    typeof serverMessage === "string" &&
    INVALID_TOKEN_MESSAGES.includes(serverMessage)
  ) {
    return "Invalid attempt"
  }

  return "Something went wrong. Please try again shortly."
}
