import { getPublicBackendUrl } from "@/lib/runtime-urls"

export const fetchUserSkills = async (userId: string) => {
  try {
    const backendBase = getPublicBackendUrl()
    const response = await fetch(`${backendBase}/talent/skills/${userId}`)

    if (!response.ok) {
      throw new Error(`Error fetching skills: ${response.statusText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("API fetchUserSkills error:", error)
    return { skills: [] }
  }
}
