import { createSignal, For, onMount, Show } from "solid-js";
import type { PrivateUser, SavedAlbum, SavedTrack } from "@spotify-effect/core";
import {
  clientId,
  DEFAULT_SCOPES,
  exchangeCode,
  fetchLibrary,
  fetchProfile,
  isFetchingProfile,
  isExchanging,
  isLoadingLibrary,
  isLoggedIn,
  libraryData,
  libraryError,
  logout,
  profile,
  sessionError,
  setClientId,
  startPkceLogin,
  tokenExpiresAt,
  tokenExpiresLabel,
  tokens,
} from "./session";

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginView() {
  const [scopes, setScopes] = createSignal(DEFAULT_SCOPES);
  const [isStarting, setIsStarting] = createSignal(false);
  const [loginError, setLoginError] = createSignal<string | null>(null);

  async function handleLogin() {
    setLoginError(null);
    if (!clientId().trim()) {
      setLoginError("Client ID is required.");
      return;
    }
    setIsStarting(true);
    try {
      await startPkceLogin(scopes());
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : String(err));
      setIsStarting(false);
    }
  }

  return (
    <div class="stack" style={{ gap: "28px" }}>
      <div>
        <div class="section-header">auth</div>
        <div class="card stack">
          <p style={{ color: "var(--muted)", "font-size": "12px", "line-height": "1.7" }}>
            Enter your Spotify app client ID and click login. You'll be redirected to Spotify and
            back automatically. Add{" "}
            <code style={{ color: "var(--text)" }}>{window.location.origin + "/"}</code> to your
            app's redirect URIs in the{" "}
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">
              Spotify dashboard
            </a>
            .
          </p>

          <div class="field">
            <label class="field-label" for="client-id">
              client_id
            </label>
            <input
              id="client-id"
              type="text"
              value={clientId()}
              onInput={(e) => setClientId(e.currentTarget.value)}
              placeholder="your Spotify app client ID"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleLogin();
              }}
            />
          </div>

          <div class="field">
            <label class="field-label" for="scopes">
              scopes
            </label>
            <textarea
              id="scopes"
              rows={3}
              value={scopes()}
              onInput={(e) => setScopes(e.currentTarget.value)}
            />
          </div>

          <button onClick={() => void handleLogin()} disabled={isStarting() || !clientId().trim()}>
            <Show when={isStarting()} fallback="▶ login with spotify">
              <span class="spinner" />
            </Show>
          </button>

          <Show when={loginError() ?? sessionError()}>
            <div class="error-box">{loginError() ?? sessionError()}</div>
          </Show>
        </div>
      </div>

      <div>
        <div class="section-header">pkce flow</div>
        <div class="card">
          <ol
            style={{
              color: "var(--muted)",
              "font-size": "12px",
              "line-height": "2",
              "padding-left": "20px",
            }}
          >
            <li>enter client ID → click login</li>
            <li>verifier + challenge generated locally in the browser</li>
            <li>redirect to Spotify auth</li>
            <li>
              Spotify redirects back with <code style={{ color: "var(--text)" }}>?code=…</code>
            </li>
            <li>
              code exchanged <em>directly in the browser</em> via{" "}
              <code style={{ color: "var(--text)" }}>Effect.runPromise</code>
            </li>
            <li>tokens stored in localStorage, ready to make API calls</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// ─── Session ──────────────────────────────────────────────────────────────────

function SessionView() {
  const profileFields = [
    "display_name",
    "email",
    "country",
    "product",
    "id",
    "uri",
  ] as const satisfies ReadonlyArray<keyof PrivateUser>;

  const formatProfileValue = (key: keyof PrivateUser, value: unknown): string => {
    if (key === "followers" && typeof value === "object" && value !== null) {
      return String((value as Record<string, unknown>).total ?? "—");
    }
    return String(value ?? "—");
  };

  return (
    <div class="stack" style={{ gap: "28px" }}>
      <div>
        <div class="section-header">session</div>
        <div class="card stack">
          <div
            class="row"
            style={{ "justify-content": "space-between", "flex-wrap": "wrap", gap: "8px" }}
          >
            <span class="badge green">
              <span class="dot green" />
              authenticated
            </span>
            <div class="row" style={{ gap: "8px" }}>
              <button
                class="ghost"
                onClick={() => void fetchProfile()}
                disabled={isFetchingProfile()}
              >
                <Show when={isFetchingProfile()} fallback="↻ refresh profile">
                  <span class="spinner" />
                </Show>
              </button>
              <button class="danger" onClick={logout}>
                logout
              </button>
            </div>
          </div>

          <div class="kv-table" style={{ "font-size": "12px" }}>
            <span class="kv-key">access_token</span>
            <span class="kv-value" style={{ color: "var(--muted)" }}>
              {tokens()?.accessToken.slice(0, 20)}…
            </span>

            <span class="kv-key">refresh_token</span>
            <span class="kv-value" style={{ color: "var(--muted)" }}>
              {tokens()?.refreshToken ? "present" : "absent"}
            </span>

            <span class="kv-key">expires</span>
            <span class="kv-value">
              {tokenExpiresLabel()}{" "}
              <span style={{ color: "var(--muted)" }}>({tokenExpiresAt()})</span>
            </span>
          </div>

          <Show when={sessionError()}>
            <div class="error-box">{sessionError()}</div>
          </Show>
        </div>
      </div>

      <Show
        when={profile()}
        fallback={
          <div
            class="card"
            style={{
              color: "var(--muted)",
              "font-size": "12px",
              "text-align": "center",
              padding: "24px",
            }}
          >
            click ↻ refresh profile to load user data
          </div>
        }
      >
        {(p) => (
          <div>
            <div class="section-header">profile</div>
            <div class="card stack">
              <div class="kv-table">
                <For each={profileFields}>
                  {(key) => (
                    <Show when={p()[key] !== undefined}>
                      <span class="kv-key">{key}</span>
                      <span class="kv-value">{formatProfileValue(key, p()[key])}</span>
                    </Show>
                  )}
                </For>
              </div>

              <Show
                when={
                  Array.isArray(p().images) && p().images.length > 0
                    ? (p().images[0] as { url: string }).url
                    : null
                }
              >
                {(url) => (
                  <img
                    src={url()}
                    alt="profile"
                    style={{
                      width: "64px",
                      height: "64px",
                      "border-radius": "50%",
                      border: "1px solid var(--border)",
                    }}
                  />
                )}
              </Show>

              <details>
                <summary
                  style={{
                    cursor: "pointer",
                    color: "var(--muted)",
                    "font-size": "11px",
                    "user-select": "none",
                  }}
                >
                  raw json
                </summary>
                <pre style={{ "margin-top": "8px" }}>{JSON.stringify(p(), null, 2)}</pre>
              </details>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

// ─── Library ──────────────────────────────────────────────────────────────────

function AlbumCard(props: { item: SavedAlbum }) {
  const album = () => props.item.album;
  const artists = () =>
    album()
      .artists.map((a) => a.name)
      .join(", ");
  const imageUrl = () => album().images[0]?.url;

  return (
    <div
      class="card"
      style={{
        padding: "0",
        overflow: "hidden",
        display: "flex",
        "flex-direction": "column",
      }}
    >
      <Show when={imageUrl()}>
        {(url) => (
          <img
            src={url()}
            alt={album().name}
            style={{
              width: "100%",
              "aspect-ratio": "1",
              "object-fit": "cover",
              "border-bottom": "1px solid var(--border)",
            }}
          />
        )}
      </Show>
      <div style={{ padding: "12px", flex: "1" }}>
        <div
          style={{
            "font-weight": "600",
            "font-size": "12px",
            "white-space": "nowrap",
            overflow: "hidden",
            "text-overflow": "ellipsis",
            "margin-bottom": "3px",
          }}
        >
          {album().name}
        </div>
        <div
          style={{
            "font-size": "11px",
            color: "var(--muted)",
            "white-space": "nowrap",
            overflow: "hidden",
            "text-overflow": "ellipsis",
          }}
        >
          {artists()}
        </div>
        <div style={{ "font-size": "11px", color: "var(--muted)", "margin-top": "3px" }}>
          {album().release_date.slice(0, 4)} · {album().total_tracks} tracks
        </div>
      </div>
    </div>
  );
}

function TrackRow(props: { item: SavedTrack }) {
  const track = () => props.item.track;
  const artists = () =>
    track()
      .artists.map((a) => a.name)
      .join(", ");
  const duration = () => {
    const ms = track().duration_ms;
    const m = Math.floor(ms / 60_000);
    const s = String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div
      style={{
        display: "flex",
        "justify-content": "space-between",
        "align-items": "center",
        padding: "8px 0",
        "border-top": "1px solid var(--border)",
        gap: "12px",
      }}
    >
      <div style={{ "min-width": "0" }}>
        <div
          style={{
            "font-size": "12px",
            "white-space": "nowrap",
            overflow: "hidden",
            "text-overflow": "ellipsis",
          }}
        >
          {track().name}
        </div>
        <div
          style={{
            "font-size": "11px",
            color: "var(--muted)",
            "white-space": "nowrap",
            overflow: "hidden",
            "text-overflow": "ellipsis",
          }}
        >
          {artists()}
        </div>
      </div>
      <span style={{ "font-size": "11px", color: "var(--muted)", "flex-shrink": "0" }}>
        {duration()}
      </span>
    </div>
  );
}

function LibraryView() {
  const data = libraryData;

  return (
    <div>
      <div class="section-header">library</div>
      <div class="stack" style={{ gap: "20px" }}>
        <div class="card stack">
          <p style={{ color: "var(--muted)", "font-size": "12px", "line-height": "1.7" }}>
            Fetches saved albums and tracks directly from the Spotify API using{" "}
            <code style={{ color: "var(--text)" }}>Effect.runPromise</code> — no server required.
          </p>
          <button onClick={() => void fetchLibrary()} disabled={isLoadingLibrary()}>
            <Show when={isLoadingLibrary()} fallback="load saved items">
              <span class="spinner" /> loading…
            </Show>
          </button>
          <Show when={libraryError()}>
            <div class="error-box">{libraryError()}</div>
          </Show>
        </div>

        <Show when={data()}>
          {(d) => (
            <>
              <Show when={d().albumsError}>
                <div class="error-box">albums: {d().albumsError}</div>
              </Show>
              <Show when={d().tracksError}>
                <div class="error-box">tracks: {d().tracksError}</div>
              </Show>

              <Show when={d().albums}>
                {(albums) => (
                  <div>
                    <div class="section-header">saved albums</div>
                    <Show
                      when={albums().items.length > 0}
                      fallback={
                        <div style={{ "font-size": "12px", color: "var(--muted)" }}>
                          No saved albums returned.
                        </div>
                      }
                    >
                      <div
                        style={{
                          display: "grid",
                          "grid-template-columns": "repeat(auto-fill, minmax(160px, 1fr))",
                          gap: "16px",
                        }}
                      >
                        <For each={albums().items}>{(item) => <AlbumCard item={item} />}</For>
                      </div>
                    </Show>
                  </div>
                )}
              </Show>

              <Show when={d().tracks}>
                {(tracks) => (
                  <div>
                    <div class="section-header">saved tracks</div>
                    <div class="card stack" style={{ gap: "0" }}>
                      <Show
                        when={tracks().items.length > 0}
                        fallback={
                          <div style={{ "font-size": "12px", color: "var(--muted)" }}>
                            No saved tracks returned.
                          </div>
                        }
                      >
                        <For each={tracks().items}>
                          {(item, i) => (
                            <div style={{ "padding-top": i() === 0 ? "0" : undefined }}>
                              <TrackRow item={item} />
                            </div>
                          )}
                        </For>
                      </Show>
                    </div>
                  </div>
                )}
              </Show>
            </>
          )}
        </Show>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const callbackError = params.get("error");

    if (callbackError) {
      // sessionError will be set but we're not logged in — show login with error
      return;
    }

    if (code && !isLoggedIn()) {
      void exchangeCode(code).then(() => {
        if (isLoggedIn()) void fetchProfile();
      });
    }
  });

  return (
    <div
      style={{
        "min-height": "100vh",
        background:
          "radial-gradient(circle at top left, rgba(29, 185, 84, 0.08), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.01), transparent 20%)",
      }}
    >
      <header
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "space-between",
          padding: "20px 32px 0",
          "margin-bottom": "32px",
          "flex-wrap": "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div
            style={{
              color: "var(--accent)",
              "font-weight": "800",
              "font-size": "15px",
              "letter-spacing": "-0.03em",
            }}
          >
            spotify-effect
          </div>
          <div
            style={{
              "font-size": "11px",
              color: "var(--muted)",
              "letter-spacing": "0.08em",
              "text-transform": "uppercase",
              "margin-top": "3px",
            }}
          >
            solid · browser example
          </div>
        </div>

        <Show when={isLoggedIn()}>
          <div
            style={{
              display: "flex",
              "align-items": "center",
              gap: "10px",
              padding: "10px 14px",
              border: "1px solid var(--border)",
              "border-radius": "var(--radius-lg)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <span class="dot green" />
            <div>
              <div style={{ "font-size": "12px", color: "var(--text)" }}>
                {profile()?.display_name ?? "authenticated"}
              </div>
              <div style={{ "font-size": "11px", color: "var(--muted)" }}>
                {tokenExpiresLabel()}
              </div>
            </div>
          </div>
        </Show>
      </header>

      <main
        style={{
          "max-width": "960px",
          margin: "0 auto",
          padding: "0 32px 72px",
        }}
      >
        <Show when={isExchanging()}>
          <div class="card stack" style={{ "align-items": "center", padding: "40px" }}>
            <div class="spinner" />
            <span style={{ color: "var(--muted)" }}>exchanging authorization code…</span>
          </div>
        </Show>

        <Show when={!isExchanging()}>
          <Show when={isLoggedIn()} fallback={<LoginView />}>
            <div class="stack" style={{ gap: "40px" }}>
              <SessionView />
              <LibraryView />
            </div>
          </Show>
        </Show>
      </main>
    </div>
  );
}
