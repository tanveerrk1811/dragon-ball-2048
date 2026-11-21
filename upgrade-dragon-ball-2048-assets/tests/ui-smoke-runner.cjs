const {JSDOM}=require('jsdom');
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://game.test/',pretendToBeVisual:true});
for (const k of ['window','document','navigator','location','HTMLElement','KeyboardEvent','MutationObserver','Node','URL','URLSearchParams','HTMLDialogElement']) { try{ Object.defineProperty(globalThis,k,{value:dom.window[k],configurable:true,writable:true}); }catch(e){} }
globalThis.requestAnimationFrame=(f)=>setTimeout(f,0);
dom.window.requestAnimationFrame=globalThis.requestAnimationFrame;
require('/tmp/ui-smoke.cjs');
