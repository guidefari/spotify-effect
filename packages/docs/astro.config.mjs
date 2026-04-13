import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc'

export default defineConfig({
  site: 'https://guidefari.github.io',
  base: '/',
  integrations: [
    starlight({
      title: 'spotify-effect',
      description: 'Effect-native Spotify Web API client',
      head: [],
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
          tsconfig: './tsconfig.typedoc.json',
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
            { label: 'Getting Started', link: '/guides/getting-started/' },
            { label: 'Authentication', link: '/guides/authentication/' },
            { label: 'Browser (PKCE)', link: '/guides/browser/' },
            { label: 'Error Handling', link: '/guides/error-handling/' },
            { label: 'Pagination', link: '/guides/pagination/' },
            { label: 'Observability', link: '/guides/observability/' },
          ],
        },
        typeDocSidebarGroup,
      ],
    }),
  ],
})
