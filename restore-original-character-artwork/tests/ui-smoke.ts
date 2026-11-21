import { mountGame } from '../src/game/ui';
const root = document.getElementById('root')!;
const errors: string[] = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
(globalThis as any).fetch = async (u: string) => ({ ok: true, json: async () => (globalThis as any).__cfg });
const run = async (name: string, cfg: any, expect: (r: HTMLElement) => void) => {
  (globalThis as any).__cfg = cfg;
  const un = mountGame(root);
  await new Promise((r) => setTimeout(r, 50));
  for (const k of ['ArrowLeft','ArrowUp','ArrowRight','ArrowDown','a','w','d','s']) for (let i=0;i<10;i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));
  expect(root);
  un();
  console.log('ok:', name);
};
(async()=>{
await run('ads disabled', {}, (r) => {
  if (r.querySelectorAll('.tile').length < 2) throw new Error('no tiles');
  if (r.querySelectorAll('.ad-slot:not([hidden])').length) throw new Error('ad visible');
  if (!(r.querySelector('#consent') as HTMLElement).hidden) throw new Error('consent shown');
  console.log('  tiles:', r.querySelectorAll('.tile').length, 'score:', r.querySelector('#score')!.textContent, 'evo:', r.querySelector('#evoCurName')!.textContent);
});
await run('custom house ad + consent gate', { masterEnabled: true, web: { enabled: true, requireConsent: true }, placements: { topBanner: { enabled: true, network: 'custom', custom: { imageUrl: 'https://x.test/a.png', href: 'https://x.test' } } } }, (r) => {
  if (!(r.querySelector('#consent') as HTMLElement).hidden === false) throw new Error('consent expected');
  if (r.querySelector('[data-slot=topBanner]:not([hidden])')) throw new Error('ad loaded before consent');
  (r.querySelector('#consentYes') as HTMLElement).click();
  if (!r.querySelector('[data-slot=topBanner]:not([hidden]) img')) throw new Error('house ad not shown after consent');
});
await run('invalid adsense config stays hidden', { masterEnabled: true, web: { enabled: true, requireConsent: false }, placements: { topBanner: { enabled: true, network: 'adsense', adsense: { slotId: 'x' } } } }, (r) => {
  if (r.querySelector('[data-slot=topBanner]:not([hidden])')) throw new Error('invalid shown');
});
await run('adsterra banner builds sandboxed iframe', { masterEnabled: true, web: { enabled: true, requireConsent: false }, placements: { bottomBanner: { enabled: true, network: 'adsterra', adsterra: { format: 'banner', key: 'a'.repeat(32), scriptSrc: '//ads.example.com/k/invoke.js', width: 320, height: 50 } } } }, (r) => {
  const f = r.querySelector('[data-slot=bottomBanner] iframe') as HTMLIFrameElement;
  if (!f) throw new Error('no iframe');
  console.log('  sandbox:', f.getAttribute('sandbox'));
  console.log('  srcdoc has script src:', f.srcdoc.includes('https://ads.example.com/k/invoke.js'));
});
console.log('page errors:', errors.length ? errors : 'none');

})();
