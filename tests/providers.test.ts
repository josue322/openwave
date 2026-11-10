import { ProviderRegistry } from '../src/integrations/providers/provider-registry';
import { CreativeCommonsProvider } from '../src/integrations/providers/creative-commons-provider';

describe('ProviderRegistry & Open Music Providers', () => {
  test('ProviderRegistry registers and retrieves CreativeCommonsProvider by default', () => {
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getAllProviders();

    expect(providers.length).toBeGreaterThanOrEqual(1);
    const cc = registry.getProvider('cc_open_catalog');
    expect(cc).toBeDefined();
    expect(cc?.name).toContain('Creative Commons');
  });

  test('CreativeCommonsProvider search returns matching tracks', async () => {
    const provider = new CreativeCommonsProvider();
    const results = await provider.search('acoustic');

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title.toLowerCase()).toContain('acoustic');
    expect(results[0].sourceType).toBe('stream');
  });

  test('CreativeCommonsProvider resolves direct stream URL for valid track', async () => {
    const provider = new CreativeCommonsProvider();
    const url = await provider.resolveStreamUrl('cc_track_1');

    expect(url).toBeDefined();
    expect(url.startsWith('https://')).toBe(true);
  });
});
