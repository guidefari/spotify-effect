import { e as ensure_array_like } from "../../chunks/index.js";
import { a as attr, e as escape_html } from "../../chunks/attributes.js";
import { s as session } from "../../chunks/session.svelte.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const DEFAULT_SCOPES = [
      "user-read-private",
      "user-read-email",
      "user-read-playback-state",
      "user-modify-playback-state",
      "user-read-currently-playing",
      "user-top-read",
      "user-read-recently-played",
      "playlist-read-private",
      "playlist-read-collaborative",
      "user-library-read"
    ].join(" ");
    let clientId = session.clientId;
    let scopes = DEFAULT_SCOPES;
    const formatDate = (ms) => new Date(ms).toLocaleString(void 0, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    const profileFields = [
      "display_name",
      "email",
      "country",
      "product",
      "id",
      "followers",
      "uri"
    ];
    const formatProfileValue = (key, value) => {
      if (key === "followers" && typeof value === "object" && value !== null) {
        return String(value.total ?? "—");
      }
      return String(value ?? "—");
    };
    $$renderer2.push(`<div class="stack" style="gap: 28px">`);
    if (session.isExchanging) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div class="card stack" style="align-items: center; padding: 40px"><div class="spinner"></div> <span style="color: var(--muted)">exchanging authorization code…</span></div>`);
    } else if (session.isLoggedIn) {
      $$renderer2.push("<!--[1-->");
      $$renderer2.push(`<div><div class="section-header">session</div> <div class="card stack"><div class="row" style="justify-content: space-between; flex-wrap: wrap; gap: 8px"><span class="badge green"><span class="dot green"></span>authenticated</span> <div class="row" style="gap: 8px"><button${attr("disabled", session.isFetchingProfile, true)} class="ghost">`);
      if (session.isFetchingProfile) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span class="spinner" style="display: inline-block"></span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`↻ refresh profile`);
      }
      $$renderer2.push(`<!--]--></button> <button class="danger">logout</button></div></div> <div class="kv-table" style="font-size: 12px"><span class="kv-key">access_token</span> <span class="kv-value" style="color: var(--muted)">${escape_html(session.tokens?.accessToken.slice(0, 20))}…</span> <span class="kv-key">refresh_token</span> <span class="kv-value" style="color: var(--muted)">${escape_html(session.tokens?.refreshToken ? "present" : "absent")}</span> <span class="kv-key">expires</span> <span class="kv-value">${escape_html(session.tokenExpiresLabel)} `);
      if (session.tokens) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<span style="color: var(--muted)">(${escape_html(formatDate(session.tokens.accessTokenExpiresAt))})</span>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></span></div> `);
      if (session.error) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="error-box">${escape_html(session.error)}</div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div></div> `);
      if (session.profile) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div><div class="section-header">profile</div> <div class="card stack"><div class="kv-table"><!--[-->`);
        const each_array = ensure_array_like(profileFields);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let key = each_array[$$index];
          if (session.profile[key] !== void 0) {
            $$renderer2.push("<!--[0-->");
            $$renderer2.push(`<span class="kv-key">${escape_html(key)}</span> <span class="kv-value">${escape_html(formatProfileValue(key, session.profile[key]))}</span>`);
          } else {
            $$renderer2.push("<!--[-1-->");
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]--></div> `);
        if (session.profile.images && Array.isArray(session.profile.images) && session.profile.images.length > 0) {
          $$renderer2.push("<!--[0-->");
          $$renderer2.push(`<div><img${attr("src", session.profile.images[0].url)} alt="profile" style="width: 64px; height: 64px; border-radius: 50%; border: 1px solid var(--border)"/></div>`);
        } else {
          $$renderer2.push("<!--[-1-->");
        }
        $$renderer2.push(`<!--]--> <details><summary style="cursor: pointer; color: var(--muted); font-size: 11px; user-select: none">raw json</summary> <pre style="margin-top: 8px">${escape_html(JSON.stringify(session.profile, null, 2))}</pre></details></div></div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`<div class="card" style="color: var(--muted); font-size: 12px; text-align: center; padding: 24px">click ↻ refresh profile to load user data</div>`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<div><div class="section-header">auth</div> <div class="card stack"><p style="color: var(--muted); font-size: 12px; line-height: 1.7">Enter your Spotify app client ID and click login. You'll be redirected to Spotify and back
					automatically. Add <code style="color: var(--text)">${escape_html(typeof window !== "undefined" ? window.location.origin + "/" : "http://localhost:5174/")}</code> to your app's redirect URIs in the <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Spotify dashboard</a>.</p> <div class="field"><label class="field-label" for="client-id">client_id</label> <input id="client-id" type="text"${attr("value", clientId)} placeholder="your Spotify app client ID"/></div> <div class="field"><label class="field-label" for="scopes">scopes</label> <textarea id="scopes"${attr("rows", 3)}>`);
      const $$body = escape_html(scopes);
      if ($$body) {
        $$renderer2.push(`${$$body}`);
      }
      $$renderer2.push(`</textarea></div> <button${attr("disabled", !clientId.trim(), true)}>`);
      {
        $$renderer2.push("<!--[-1-->");
        $$renderer2.push(`▶ login with spotify`);
      }
      $$renderer2.push(`<!--]--></button> `);
      if (session.error) {
        $$renderer2.push("<!--[0-->");
        $$renderer2.push(`<div class="error-box">${escape_html(session.error)}</div>`);
      } else {
        $$renderer2.push("<!--[-1-->");
      }
      $$renderer2.push(`<!--]--></div></div> <div><div class="section-header">pkce flow</div> <div class="card"><ol style="color: var(--muted); font-size: 12px; line-height: 2; padding-left: 20px"><li>enter client ID → click login</li> <li>verifier + challenge generated locally in the browser</li> <li>redirect to Spotify auth</li> <li>Spotify redirects back with <code style="color: var(--text)">?code=…</code></li> <li>code exchanged server-side, tokens stored locally</li> <li>ready to make API calls</li></ol></div></div>`);
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
