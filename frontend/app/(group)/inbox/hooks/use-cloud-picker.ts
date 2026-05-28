"use client"

// Cloud file pickers for Google Drive, Dropbox, and OneDrive.
// Each function opens the vendor's JS picker, downloads the chosen file(s)
// into memory, and returns File objects ready to feed into the existing
// `uploadFile()` flow (which uploads to Cloudflare R2).
//
// Provisioning (all three must be registered before pickers work):
//  - Google Drive: Google Cloud Console → enable Drive API + Picker API,
//    create OAuth client ID (Web app) + API key. Add JS origins.
//    Env: NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID, NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY
//  - Dropbox: dropbox.com/developers/apps → Scoped access app.
//    Settings → Chooser/Saver domains: add app hostnames.
//    Env: NEXT_PUBLIC_DROPBOX_APP_KEY
//  - OneDrive: Azure Portal → App registrations → SPA redirect URIs match origin.
//    API permissions: Microsoft Graph → Files.Read (delegated).
//    Env: NEXT_PUBLIC_ONEDRIVE_CLIENT_ID

const loadScript = (
  src: string,
  attrs?: Record<string, string>
): Promise<void> =>
  new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Cloud pickers require a browser environment"))
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-cloud-picker="${src}"]`
    )
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve()
        return
      }
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true }
      )
      return
    }
    const script = document.createElement("script")
    script.src = src
    script.async = true
    script.defer = true
    script.dataset.cloudPicker = src
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) script.setAttribute(k, v)
    }
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true"
        resolve()
      },
      { once: true }
    )
    script.addEventListener(
      "error",
      () => reject(new Error(`Failed to load ${src}`)),
      { once: true }
    )
    document.head.appendChild(script)
  })

// In-memory Google token cache. Tokens live ~1h and are not persisted —
// a full page reload forces a fresh consent.
let googleToken: { value: string; expiresAt: number } | null = null

const fetchAsFile = async (
  url: string,
  fileName: string,
  mimeType?: string,
  headers?: Record<string, string>
): Promise<File> => {
  const res = await fetch(url, headers ? { headers } : undefined)
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}) for ${fileName}`)
  }
  const blob = await res.blob()
  return new File([blob], fileName, {
    type: mimeType || blob.type || "application/octet-stream",
  })
}

export async function openGoogleDrivePicker(
  onPicked?: (count: number) => void
): Promise<File[]> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY
  if (!clientId || !apiKey) {
    throw new Error(
      "Google Drive not configured. Set NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY."
    )
  }

  await Promise.all([
    loadScript("https://apis.google.com/js/api.js"),
    loadScript("https://accounts.google.com/gsi/client"),
  ])

  const gapi = (window as any).gapi
  const google = (window as any).google
  if (!gapi || !google?.accounts?.oauth2) {
    throw new Error("Google picker libraries failed to initialize")
  }

  await new Promise<void>((resolve, reject) => {
    gapi.load("picker", {
      callback: () => resolve(),
      onerror: () => reject(new Error("gapi picker module failed to load")),
    })
  })

  // Reuse a cached token if still valid (with a 60s safety margin).
  let accessToken: string
  if (googleToken && googleToken.expiresAt > Date.now() + 60_000) {
    accessToken = googleToken.value
  } else {
    accessToken = await new Promise((resolve, reject) => {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        // drive.file is non-sensitive (no Google verification needed) and the
        // Picker UI lets users select any of their files — Google grants
        // per-file access on pick. This is the recommended scope for picker
        // flows. drive.readonly would require full app verification.
        scope: "https://www.googleapis.com/auth/drive.file",
        callback: (resp: any) => {
          if (resp.error) {
            reject(new Error(resp.error_description || resp.error))
            return
          }
          googleToken = {
            value: resp.access_token,
            expiresAt: Date.now() + (Number(resp.expires_in) || 3600) * 1000,
          }
          resolve(resp.access_token)
        },
      })
      tokenClient.requestAccessToken({ prompt: "" })
    })
  }

  // setAppId is required for drive.file scope — it tells Google which app
  // the picker belongs to so the "granted file" record persists for the
  // follow-up Drive API download. Value is the numeric project ID (the
  // prefix of the client ID before the first '-').
  const appId = clientId.split("-")[0]

  const docs: any[] = await new Promise((resolve) => {
    const picker = new google.picker.PickerBuilder()
      .addView(google.picker.ViewId.DOCS)
      .setAppId(appId)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setCallback((data: any) => {
        if (data.action === google.picker.Action.PICKED) {
          resolve(data.docs || [])
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve([])
        }
      })
      .build()
    picker.setVisible(true)
  })

  // Map Google native formats → export MIME type + filename extension.
  const GOOGLE_EXPORT: Record<string, { mime: string; ext: string }> = {
    "application/vnd.google-apps.document": {
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ext: "docx",
    },
    "application/vnd.google-apps.spreadsheet": {
      mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ext: "xlsx",
    },
    "application/vnd.google-apps.presentation": {
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ext: "pptx",
    },
    "application/vnd.google-apps.drawing": {
      mime: "image/png",
      ext: "png",
    },
  }

  if (docs.length === 0) return []
  onPicked?.(docs.length)

  const files: File[] = []
  for (const doc of docs) {
    const exportTarget = GOOGLE_EXPORT[doc.mimeType]
    let url: string
    let fileName: string
    let downloadMime: string | undefined
    if (exportTarget) {
      url = `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=${encodeURIComponent(exportTarget.mime)}`
      fileName = doc.name.endsWith(`.${exportTarget.ext}`)
        ? doc.name
        : `${doc.name}.${exportTarget.ext}`
      downloadMime = exportTarget.mime
    } else {
      url = `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`
      fileName = doc.name
      downloadMime = doc.mimeType
    }
    files.push(
      await fetchAsFile(url, fileName, downloadMime, {
        Authorization: `Bearer ${accessToken}`,
      })
    )
  }
  return files
}

export async function openDropboxChooser(
  onPicked?: (count: number) => void
): Promise<File[]> {
  const appKey = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY
  if (!appKey) {
    throw new Error("Dropbox not configured. Set NEXT_PUBLIC_DROPBOX_APP_KEY.")
  }

  await loadScript("https://www.dropbox.com/static/api/2/dropins.js", {
    id: "dropboxjs",
    "data-app-key": appKey,
  })

  const Dropbox = (window as any).Dropbox
  if (!Dropbox?.choose) {
    throw new Error("Dropbox chooser failed to initialize")
  }

  const picked: any[] = await new Promise((resolve) => {
    Dropbox.choose({
      success: (selection: any[]) => resolve(selection),
      cancel: () => resolve([]),
      linkType: "direct",
      multiselect: true,
    })
  })

  if (picked.length === 0) return []
  onPicked?.(picked.length)

  const files: File[] = []
  for (const item of picked) {
    files.push(await fetchAsFile(item.link, item.name))
  }
  return files
}

// In-memory MSAL state so repeat picks reuse the login without re-consenting.
let msalInstance: any = null
let msalAccount: any = null
const GRAPH_SCOPES = ["Files.Read", "User.Read"]

async function getMsal(clientId: string) {
  if (msalInstance) return msalInstance
  await loadScript(
    "https://cdn.jsdelivr.net/npm/@azure/msal-browser@2.38.3/lib/msal-browser.min.js"
  )
  const msal = (window as any).msal
  if (!msal?.PublicClientApplication) {
    throw new Error("MSAL failed to load")
  }
  msalInstance = new msal.PublicClientApplication({
    auth: {
      clientId,
      // `common` accepts both personal MS accounts and any org tenant,
      // matching the Azure App Registration's multitenant+personal setting.
      authority: "https://login.microsoftonline.com/common",
      redirectUri: window.location.origin,
    },
    cache: { cacheLocation: "sessionStorage" },
  })
  await msalInstance.initialize()
  return msalInstance
}

async function acquireGraphToken(
  instance: any
): Promise<{ token: string; account: any }> {
  // 1) Silent with a cached account — fastest, no popup
  if (msalAccount) {
    try {
      const r = await instance.acquireTokenSilent({
        scopes: GRAPH_SCOPES,
        account: msalAccount,
      })
      return { token: r.accessToken, account: r.account }
    } catch {
      /* fall through */
    }
  }
  // 2) ssoSilent — uses existing MS browser session cookies, no popup
  try {
    const r = await instance.ssoSilent({ scopes: GRAPH_SCOPES })
    msalAccount = r.account
    return { token: r.accessToken, account: r.account }
  } catch {
    /* fall through */
  }
  // 3) Interactive popup — consumes the user gesture
  const r = await instance.loginPopup({ scopes: GRAPH_SCOPES })
  msalAccount = r.account
  return { token: r.accessToken, account: r.account }
}

// OneDrive integration uses a custom Graph-API-based picker rendered by
// onedrive-picker-dialog.tsx rather than Microsoft's File Picker v8, which
// is SharePoint-only for the consumer endpoint. These helpers expose the
// auth + list + download pieces for that component.

export interface OneDriveItem {
  id: string
  name: string
  size?: number
  folder?: { childCount?: number }
  file?: { mimeType?: string }
  parentReference?: { driveId?: string; path?: string }
  lastModifiedDateTime?: string
  webUrl?: string
  "@microsoft.graph.downloadUrl"?: string
}

export async function getOneDriveToken(): Promise<{
  token: string
  account: any
}> {
  const clientId = process.env.NEXT_PUBLIC_ONEDRIVE_CLIENT_ID
  if (!clientId) {
    throw new Error(
      "OneDrive not configured. Set NEXT_PUBLIC_ONEDRIVE_CLIENT_ID."
    )
  }
  const instance = await getMsal(clientId)
  return acquireGraphToken(instance)
}

export async function listOneDriveFolder(
  token: string,
  folderId: string | null
): Promise<OneDriveItem[]> {
  const base = folderId
    ? `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(folderId)}/children`
    : `https://graph.microsoft.com/v1.0/me/drive/root/children`
  // Request enough fields + ask for download URLs up front so we can skip
  // a second call for each file.
  const url = `${base}?$top=200&$select=id,name,size,folder,file,parentReference,lastModifiedDateTime,webUrl&$expand=thumbnails($select=small)`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    throw new Error(`OneDrive list failed (${res.status})`)
  }
  const body = await res.json()
  return (body.value as OneDriveItem[]) || []
}

export async function downloadOneDriveItems(
  items: OneDriveItem[],
  token: string
): Promise<File[]> {
  const files: File[] = []
  for (const item of items) {
    // `/me/drive/items/{id}/content` redirects to a pre-signed URL and
    // works whether the file lives in the personal drive root or a
    // sub-folder; no need to construct the driveId path manually.
    const url = `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(item.id)}/content`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      console.warn(`OneDrive download failed (${res.status}) for ${item.name}`)
      continue
    }
    const blob = await res.blob()
    const mime = item.file?.mimeType || blob.type || "application/octet-stream"
    files.push(new File([blob], item.name, { type: mime }))
  }
  return files
}
