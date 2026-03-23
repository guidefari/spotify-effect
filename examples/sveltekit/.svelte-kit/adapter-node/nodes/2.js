

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const universal = {
  "ssr": false,
  "load": null
};
export const universal_id = "src/routes/+page.ts";
export const imports = ["_app/immutable/nodes/2.DxBRGcGs.js","_app/immutable/chunks/BWA8-JSr.js","_app/immutable/chunks/BfM7aTa8.js","_app/immutable/chunks/DWuPVWIz.js","_app/immutable/chunks/CDGSxn83.js"];
export const stylesheets = [];
export const fonts = [];
