import AxiosRequest from ".."

// BTB-325: the desktop tracker acknowledges the launch id it was opened with
// (marketeq://open?launch=<id>); the web app polls this to learn whether the
// app actually opened.
export const getDesktopLaunchStatus = async (
  launchId: string
): Promise<{ opened: boolean }> => {
  const res = await AxiosRequest.get(
    `/time-tracking/desktop-launch/${launchId}`
  )
  return res.data
}

// BTB-325: whether this user has ever signed in to the desktop tracker. Log
// Time uses it to offer the installer immediately, or not at all while the
// browser's "Open Marketeq?" prompt is still up.
export const getHasDesktopDevice = async (): Promise<{
  hasDevice: boolean
}> => {
  const res = await AxiosRequest.get(`/time-tracking/desktop-launch/has-device`)
  return res.data
}
