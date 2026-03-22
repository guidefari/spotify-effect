import * as Effect from "effect/Effect"
import { SpotifyWebApi } from "spotify-effect"
import type { AuthorizationScope } from "spotify-effect"

const accessTokenInput = document.querySelector<HTMLTextAreaElement>("#access-token")
const trackIdInput = document.querySelector<HTMLInputElement>("#track-id")
const fetchButton = document.querySelector<HTMLButtonElement>("#fetch-track")
const authClientIdInput = document.querySelector<HTMLInputElement>("#auth-client-id")
const authRedirectUriInput = document.querySelector<HTMLInputElement>("#auth-redirect-uri")
const authStateInput = document.querySelector<HTMLInputElement>("#auth-state")
const authScopeInput = document.querySelector<HTMLInputElement>("#auth-scope")
const authCodeButton = document.querySelector<HTMLButtonElement>("#generate-auth-code-url")
const pkceButton = document.querySelector<HTMLButtonElement>("#generate-pkce-url")
const exchangePkceButton = document.querySelector<HTMLButtonElement>("#exchange-pkce-code")
const fetchCurrentUserButton = document.querySelector<HTMLButtonElement>("#fetch-current-user")
const callbackCodeInput = document.querySelector<HTMLInputElement>("#callback-code")
const codeVerifierInput = document.querySelector<HTMLInputElement>("#code-verifier")
const authOutput = document.querySelector<HTMLElement>("#auth-output")
const profileOutput = document.querySelector<HTMLElement>("#profile-output")
const output = document.querySelector<HTMLElement>("#output")
const status = document.querySelector<HTMLElement>("#status")
const sessionStatus = document.querySelector<HTMLElement>("#session-status")

const authorizationScopes: ReadonlyArray<AuthorizationScope> = [
  "ugc-image-upload",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "app-remote-control",
  "user-read-email",
  "user-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-read-private",
  "playlist-modify-private",
  "user-library-modify",
  "user-library-read",
  "user-top-read",
  "user-read-playback-position",
  "user-read-recently-played",
  "user-follow-read",
  "user-follow-modify",
]

const defaultRedirectUri = `http://127.0.0.1:${window.location.port || "3012"}/`

const storageKeys = {
  pkceVerifier: "spotify-effect:pkce-verifier",
  clientId: "spotify-effect:client-id",
  redirectUri: "spotify-effect:redirect-uri",
  authState: "spotify-effect:auth-state",
  tokens: "spotify-effect:tokens",
} as const

interface RefreshableTokensState {
  readonly accessToken: string
  readonly refreshToken: string
  readonly accessTokenExpiresAt: number
}

const setStatus = (message: string): void => {
  if (status !== null) {
    status.textContent = message
  }
}

const setSessionStatus = (message: string): void => {
  if (sessionStatus !== null) {
    sessionStatus.textContent = message
  }
}

const setOutput = (element: HTMLElement | null, value: unknown): void => {
  if (element !== null) {
    element.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2)
  }
}

const formatError = (error: unknown): unknown => {
  if (typeof error !== "object" || error === null) {
    return error
  }

  const record = error as Record<string, unknown>

  if (record._tag === "SpotifyHttpError") {
    return {
      _tag: record._tag,
      status: record.status,
      method: record.method,
      url: record.url,
      apiMessage: record.apiMessage,
      body: record.body,
    }
  }

  return record
}

const parseScopes = (value: string): ReadonlyArray<AuthorizationScope> =>
  value
    .split(" ")
    .map((item) => item.trim())
    .filter(
      (item): item is AuthorizationScope =>
        item.length > 0 && authorizationScopes.some((scope) => scope === item),
    )

const readAuthorizationInputs = (): {
  clientId: string
  redirectUri: string
  state?: string
  scope?: ReadonlyArray<AuthorizationScope>
} => {
  const state = authStateInput?.value.trim() ?? ""
  const scope = parseScopes(authScopeInput?.value ?? "")
  const redirectUri = authRedirectUriInput?.value.trim() ?? defaultRedirectUri

  return {
    clientId: authClientIdInput?.value.trim() ?? "",
    redirectUri,
    ...(state.length === 0 ? null : { state }),
    ...(scope.length === 0 ? null : { scope }),
  }
}

const toBase64Url = (value: Uint8Array): string => {
  let binary = ""

  value.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

const createCodeVerifier = (): string => {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

const createCodeChallenge = async (verifier: string): Promise<string> => {
  const encoded = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", encoded)
  return toBase64Url(new Uint8Array(digest))
}

const readStoredTokens = (): RefreshableTokensState | undefined => {
  const raw = localStorage.getItem(storageKeys.tokens)

  if (raw === null) {
    return undefined
  }

  try {
    return JSON.parse(raw) as RefreshableTokensState
  } catch {
    return undefined
  }
}

const readStoredValue = (key: string): string =>
  sessionStorage.getItem(key) ?? localStorage.getItem(key) ?? ""

const storeValue = (key: string, value: string): void => {
  sessionStorage.setItem(key, value)
  localStorage.setItem(key, value)
}

const storeTokens = (tokens: RefreshableTokensState): void => {
  localStorage.setItem(storageKeys.tokens, JSON.stringify(tokens))
}

const syncStoredStateToUi = (): void => {
  const code = new URL(window.location.href).searchParams.get("code") ?? ""
  const verifier = readStoredValue(storageKeys.pkceVerifier)
  const clientId = readStoredValue(storageKeys.clientId) || authClientIdInput?.value || ""
  const redirectUri = readStoredValue(storageKeys.redirectUri) || defaultRedirectUri
  const storedState = readStoredValue(storageKeys.authState)
  const tokens = readStoredTokens()

  if (callbackCodeInput !== null) {
    callbackCodeInput.value = code
  }

  if (codeVerifierInput !== null) {
    codeVerifierInput.value = verifier
  }

  if (authClientIdInput !== null && clientId.length > 0) {
    authClientIdInput.value = clientId
  }

  if (authRedirectUriInput !== null && redirectUri.length > 0) {
    authRedirectUriInput.value = redirectUri
  }

  if (authStateInput !== null) {
    authStateInput.value = new URL(window.location.href).searchParams.get("state") ?? storedState
  }

  if (accessTokenInput !== null && tokens !== undefined) {
    accessTokenInput.value = tokens.accessToken
  }

  if (tokens !== undefined) {
    setOutput(profileOutput, {
      message: "Stored refreshable tokens available",
      accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    })
    setSessionStatus("Refreshable session available in this browser")
  } else {
    setSessionStatus("No stored browser auth session yet")
  }
}

const fetchTrack = async (): Promise<void> => {
  const accessToken = accessTokenInput?.value.trim() ?? ""
  const trackId = trackIdInput?.value.trim() ?? ""

  if (accessToken.length === 0 || trackId.length === 0) {
    setStatus("Provide both an access token and a track ID.")
    return
  }

  fetchButton!.disabled = true
  setStatus("Fetching track...")

  try {
    const response = await fetch("/api/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accessToken,
        trackId,
      }),
    })

    const payload = await response.json()

    if (!response.ok) {
      throw payload
    }

    const track = payload
    setOutput(output, track)
    setStatus("Track fetched successfully.")
  } catch (error) {
    setOutput(output, formatError(error))
    setStatus("Request failed.")
  } finally {
    fetchButton!.disabled = false
  }
}

const generateAuthorizationCodeUrl = (): void => {
  const inputs = readAuthorizationInputs()

  if (inputs.clientId.length === 0 || inputs.redirectUri.length === 0) {
    setOutput(authOutput, "Provide both client ID and redirect URI.")
    return
  }

  const spotify = new SpotifyWebApi({
    clientId: inputs.clientId,
    redirectUri: inputs.redirectUri,
  })

  setOutput(authOutput, spotify.getAuthorizationCodeUrl(inputs))
}

const startPkceLogin = async (): Promise<void> => {
  const inputs = readAuthorizationInputs()

  if (inputs.clientId.length === 0 || inputs.redirectUri.length === 0) {
    setOutput(authOutput, "Provide both client ID and redirect URI.")
    return
  }

  const verifier = createCodeVerifier()
  const challenge = await createCodeChallenge(verifier)
  const spotify = new SpotifyWebApi({
    clientId: inputs.clientId,
    redirectUri: inputs.redirectUri,
  })
  const url = spotify.getAuthorizationCodePKCEUrl(inputs.clientId, {
    ...inputs,
    code_challenge: challenge,
    code_challenge_method: "S256",
  })

  sessionStorage.setItem(storageKeys.pkceVerifier, verifier)
  localStorage.setItem(storageKeys.pkceVerifier, verifier)
  storeValue(storageKeys.clientId, inputs.clientId)
  storeValue(storageKeys.redirectUri, inputs.redirectUri)
  storeValue(storageKeys.authState, inputs.state ?? "")

  if (codeVerifierInput !== null) {
    codeVerifierInput.value = verifier
  }

  setOutput(authOutput, url)
  setStatus("Redirecting to Spotify for PKCE login...")
  window.location.assign(url)
}

const exchangePkceCode = async (): Promise<void> => {
  const code = callbackCodeInput?.value.trim() ?? ""
  const verifier = codeVerifierInput?.value.trim() || readStoredValue(storageKeys.pkceVerifier)
  const clientId = authClientIdInput?.value.trim() || readStoredValue(storageKeys.clientId)
  const redirectUri =
    authRedirectUriInput?.value.trim() || readStoredValue(storageKeys.redirectUri) || defaultRedirectUri

  if (code.length === 0 || verifier.length === 0 || clientId.length === 0) {
    setOutput(profileOutput, {
      message: "Missing values required for PKCE exchange.",
      callbackCodePresent: code.length > 0,
      verifierPresent: verifier.length > 0,
      clientIdPresent: clientId.length > 0,
      hint: "Use Start PKCE login from this page so the verifier and client ID are stored automatically.",
    })
    return
  }

  exchangePkceButton!.disabled = true
  setStatus("Exchanging PKCE code for tokens...")

  try {
    const response = await fetch("/api/pkce/exchange", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId,
        redirectUri,
        code,
        codeVerifier: verifier,
      }),
    })

    const tokens = await response.json()

    if (!response.ok) {
      throw tokens
    }

    const storedTokens: RefreshableTokensState = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessTokenExpiresAt: Date.now() + tokens.expires_in * 1000,
    }

    storeTokens(storedTokens)

    if (accessTokenInput !== null) {
      accessTokenInput.value = tokens.access_token
    }

    setOutput(profileOutput, {
      tokens,
      message: "Tokens exchanged and stored locally for this browser example.",
    })
    setSessionStatus("Refreshable tokens stored. You can now fetch the current user profile.")
    setStatus("PKCE code exchange succeeded.")
    window.history.replaceState({}, document.title, defaultRedirectUri)
  } catch (error) {
    setOutput(profileOutput, formatError(error))
    setStatus("PKCE code exchange failed.")
  } finally {
    exchangePkceButton!.disabled = false
  }
}

const fetchCurrentUserProfile = async (): Promise<void> => {
  const clientId = authClientIdInput?.value.trim() ?? sessionStorage.getItem(storageKeys.clientId) ?? ""
  const resolvedClientId = clientId || readStoredValue(storageKeys.clientId)
  const redirectUri =
    authRedirectUriInput?.value.trim() || readStoredValue(storageKeys.redirectUri) || defaultRedirectUri
  const tokens = readStoredTokens()

  if (tokens === undefined) {
    setOutput(profileOutput, "Exchange a PKCE code first so the browser example has refreshable tokens.")
    return
  }

  fetchCurrentUserButton!.disabled = true
  setStatus("Fetching current user profile...")

  try {
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: resolvedClientId,
        redirectUri,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt,
      }),
    })

    const payload = (await response.json()) as {
      profile?: unknown
      credentials?: Partial<RefreshableTokensState>
    }

    if (!response.ok || payload.profile === undefined || payload.credentials === undefined) {
      throw payload
    }

    storeTokens({
      accessToken: payload.credentials.accessToken ?? tokens.accessToken,
      refreshToken: payload.credentials.refreshToken ?? tokens.refreshToken,
      accessTokenExpiresAt: payload.credentials.accessTokenExpiresAt ?? tokens.accessTokenExpiresAt,
    })

    if (accessTokenInput !== null) {
      accessTokenInput.value = payload.credentials.accessToken ?? tokens.accessToken
    }

    setOutput(profileOutput, payload.profile)
    setSessionStatus("Logged in and ready. Stored tokens will be reused for this browser example.")
    setStatus("Fetched current user profile.")
  } catch (error) {
    setOutput(profileOutput, formatError(error))
    setStatus("Current user profile request failed.")
  } finally {
    fetchCurrentUserButton!.disabled = false
  }
}

fetchButton?.addEventListener("click", () => {
  void fetchTrack()
})

authCodeButton?.addEventListener("click", generateAuthorizationCodeUrl)

pkceButton?.addEventListener("click", () => {
  void startPkceLogin()
})

exchangePkceButton?.addEventListener("click", () => {
  void exchangePkceCode()
})

fetchCurrentUserButton?.addEventListener("click", () => {
  void fetchCurrentUserProfile()
})

syncStoredStateToUi()
