import type { AdConfig, Network, PlacementCfg } from './ad-config';

export type SlotStatus =
  | 'disabled'
  | 'waiting-consent'
  | 'loading'
  | 'loaded'
  | 'unfilled'
  | 'error'
  | 'skipped-device'
  | 'invalid-config';

export interface AdContext {
  cfg: AdConfig;
  testMode: boolean;
  report: (status: SlotStatus, detail?: string) => void;
}

export interface AdAdapter {
  id: Network;
  /** Renders the ad into `body`. Returns a cleanup function. Must never throw into the game. */
  mount(body: HTMLElement, placement: PlacementCfg, ctx: AdContext): () => void;
}
