import { c as ensure_array_like, d as attr_class } from './index-DLjTBDNl.js';
import { p as page } from './index3-CqvhIJaj.js';
import { s as session } from './session.svelte-Dr2HCVqU.js';
import { a as attr, e as escape_html } from './attributes-EgZVT-og.js';
import './exports-DeC_PzxH.js';
import './index2-D5GVHfyz.js';
import 'effect/Effect';
import 'effect/Schema';
import 'effect/Data';
import 'effect/unstable/http';
import 'effect/Clock';
import 'effect/SynchronizedRef';

function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { children } = $$props;
    const links = [
      { href: "/", label: "home" },
      { href: "/track", label: "track" }
    ];
    $$renderer2.push(`<div class="app-shell svelte-12qhfyh"><nav class="svelte-12qhfyh"><span class="brand svelte-12qhfyh">spotify-effect</span> <div class="nav-links svelte-12qhfyh"><!--[-->`);
    const each_array = ensure_array_like(links);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let link = each_array[$$index];
      $$renderer2.push(`<a${attr("href", link.href)}${attr_class("svelte-12qhfyh", void 0, { "active": page.url.pathname === link.href })}>${escape_html(link.label)}</a>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="session-indicator svelte-12qhfyh">`);
    if (session.isLoggedIn) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<span class="dot green"></span> <span class="session-name svelte-12qhfyh">${escape_html(session.profile?.display_name ?? "authenticated")} · ${escape_html(session.tokenExpiresLabel)}</span>`);
    } else {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`<span class="dot muted"></span> <span class="session-name svelte-12qhfyh">not logged in</span>`);
    }
    $$renderer2.push(`<!--]--></div></nav> <main class="svelte-12qhfyh">`);
    children($$renderer2);
    $$renderer2.push(`<!----></main></div>`);
  });
}

export { _layout as default };
//# sourceMappingURL=_layout.svelte-4IrcmTsW.js.map
