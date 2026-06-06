import { MAP_REGIONS } from './config';

export const CURRENT_REGION_KEY = 'gal_current_region';
const DEFAULT_REGION = MAP_REGIONS[0]?.name ?? '圣光教会圣地';

export function read_current_region(): string {
  const raw = _.get(getVariables({ type: 'chat' }), CURRENT_REGION_KEY, DEFAULT_REGION);
  return typeof raw === 'string' && raw.trim() ? raw.trim() : DEFAULT_REGION;
}

export function write_current_region(region_name: string) {
  replaceVariables(klona({ ...getVariables({ type: 'chat' }), [CURRENT_REGION_KEY]: region_name }), {
    type: 'chat',
  });
}

export function is_valid_map_region(region_name: string): boolean {
  return MAP_REGIONS.some(r => r.name === region_name);
}
