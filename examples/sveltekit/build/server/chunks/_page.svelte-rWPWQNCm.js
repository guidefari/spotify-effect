import { a as attr } from './attributes-EgZVT-og.js';
import { s as session } from './session.svelte-Dr2HCVqU.js';
import './index2-D5GVHfyz.js';
import 'effect/Effect';
import 'effect/Schema';
import 'effect/Data';
import 'effect/unstable/http';
import 'effect/Clock';
import 'effect/SynchronizedRef';

function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let input = "";
    $$renderer2.push(`<div class="stack" style="gap: 20px"><div><div class="section-header">track lookup</div> <div class="card stack">`);
    if (!session.isLoggedIn) {
      $$renderer2.push("<!--[0-->");
      $$renderer2.push(`<div style="color: var(--warn); font-size: 12px">⚠ not logged in — log in on the home page or paste an access token in the input below</div>`);
    } else {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="field"><label class="field-label" for="track-input">track id / spotify url / uri</label> <input id="track-input" type="text"${attr("value", input)} placeholder="https://open.spotify.com/track/… or 4iV5W9uYEdYUVa79Axb7Rh"/></div> <button${attr("disabled", !input.trim(), true)}>`);
    {
      $$renderer2.push("<!--[-1-->");
      $$renderer2.push(`fetch track`);
    }
    $$renderer2.push(`<!--]--></button> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}

export { _page as default };
//# sourceMappingURL=_page.svelte-rWPWQNCm.js.map
