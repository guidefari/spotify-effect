export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.hmm5RpO1.js",app:"_app/immutable/entry/app.CSyznH9b.js",imports:["_app/immutable/entry/start.hmm5RpO1.js","_app/immutable/chunks/BhOzlmrv.js","_app/immutable/chunks/D4M9WOuG.js","_app/immutable/chunks/BWA8-JSr.js","_app/immutable/chunks/CBUWuYqV.js","_app/immutable/entry/app.CSyznH9b.js","_app/immutable/chunks/D4M9WOuG.js","_app/immutable/chunks/BWA8-JSr.js","_app/immutable/chunks/CBUWuYqV.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./nodes/0.js')),
			__memo(() => import('./nodes/1.js')),
			__memo(() => import('./nodes/2.js')),
			__memo(() => import('./nodes/3.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/api/pkce/exchange",
				pattern: /^\/api\/pkce\/exchange\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/pkce/exchange/_server.ts.js'))
			},
			{
				id: "/api/profile",
				pattern: /^\/api\/profile\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/profile/_server.ts.js'))
			},
			{
				id: "/api/track",
				pattern: /^\/api\/track\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./entries/endpoints/api/track/_server.ts.js'))
			},
			{
				id: "/track",
				pattern: /^\/track\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();
