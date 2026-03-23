

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const universal = {
  "ssr": false
};
export const universal_id = "src/routes/+layout.ts";
export const imports = ["_app/immutable/nodes/0.BJ4vS8az.js","_app/immutable/chunks/BWA8-JSr.js","_app/immutable/chunks/BfM7aTa8.js","_app/immutable/chunks/DWuPVWIz.js","_app/immutable/chunks/CBUWuYqV.js","_app/immutable/chunks/Bg40vJwQ.js","_app/immutable/chunks/BhOzlmrv.js","_app/immutable/chunks/D4M9WOuG.js"];
export const stylesheets = ["_app/immutable/assets/0.B3nRNepv.css"];
export const fonts = [];
