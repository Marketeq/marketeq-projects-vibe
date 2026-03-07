export const fetchUserSkills = async (userId: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/talent/skills/${userId}`
    )

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
