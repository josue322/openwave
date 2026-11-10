import { IMusicProvider } from './i-music-provider';
import { CreativeCommonsProvider } from './creative-commons-provider';

export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private providers: Map<string, IMusicProvider> = new Map();

  private constructor() {
    // Register default open-source provider
    this.registerProvider(new CreativeCommonsProvider());
  }

  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  public registerProvider(provider: IMusicProvider): void {
    this.providers.set(provider.id, provider);
  }

  public getProvider(id: string): IMusicProvider | undefined {
    return this.providers.get(id);
  }

  public getAllProviders(): IMusicProvider[] {
    return Array.from(this.providers.values());
  }
}
