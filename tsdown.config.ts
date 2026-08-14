import { clientBundle } from './shared/tsdown.client.ts'

export default clientBundle('dsh-ocgo-usage', [
  'src/index.ts',
  'src/invariant.ts',
], {
  lib: {
    // The host half resolves cordis and the web-server route seam at runtime
    // from the dsh profile tree, not from this repo's install. Their built
    // declarations carry .ts-suffixed relative imports rolldown cannot
    // follow, so they stay external.
    external: [
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-host-webserver',
    ],
  },
})
