import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc'

export default defineConfig({
  site: 'https://guidefari.github.io',
  base: '/spotify-effect',
  integrations: [
    starlight({
      title: 'spotify-effect',
      description: 'Effect-native Spotify Web API client',
      social: {
        github: 'https://github.com/guidefari/spotify-effect',
      },
      plugins: [
        starlightTypeDoc({
          entryPoints: [
            '../../packages/spotify-effect/src/index.ts',
            '../../packages/browser/src/index.ts',
            '../../packages/otel-node/src/index.ts',
          ],
          tsconfig: '../../packages/spotify-effect/tsconfig.json',
          output: 'api',
          typeDoc: {
            entryPointStrategy: 'resolve',
          },
          sidebar: {
            label: 'API Reference',
            collapsed: true,
          },
        }),
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Getting Started', slug: 'guides/getting-started' },
            { label: 'Authentication', slug: 'guides/authentication' },
            { label: 'Browser (PKCE)', slug: 'guides/browser' },
            { label: 'Error Handling', slug: 'guides/error-handling' },
            { label: 'Pagination', slug: 'guides/pagination' },
            { label: 'Observability', slug: 'guides/observability' },
          ],
        },
        typeDocSidebarGroup,
      ],
    }),
  ],
})
