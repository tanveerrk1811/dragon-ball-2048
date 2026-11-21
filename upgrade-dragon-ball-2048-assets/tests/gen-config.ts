import { writeFileSync } from 'node:fs';
import { defaultConfig } from '../src/game/ads/ad-config';

writeFileSync('public/ad-config.json', JSON.stringify(defaultConfig(), null, 2) + '\n');
console.log('wrote public/ad-config.json (all advertising disabled)');
