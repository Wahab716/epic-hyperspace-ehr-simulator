import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../public/clinical/app.js', import.meta.url), 'utf8');

export function workspace(initial, { blocked = false } = {}) {
  const stored = new Map(initial === undefined ? [] : [['hyperspace-v1', initial]]);
  const nodes = { '#app': { innerHTML: '' }, '#overlay': { innerHTML: '' }, '#toast': { textContent: '', style: {} } };
  const listeners = {};
  const storage = {
    getItem(key) { if (blocked) throw new Error('Storage blocked'); return stored.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error('Storage blocked'); stored.set(key, value); },
    removeItem(key) { stored.delete(key); },
  };
  const context = vm.createContext({
    document: {
      querySelector: selector => nodes[selector],
      querySelectorAll: () => [],
      addEventListener(type, handler) { listeners[type] = handler; },
    },
    localStorage: storage,
    window: { print() {} },
    location: { reload() {} },
    setTimeout() { return 1; },
    clearTimeout() {},
  });
  // No fetch global: these workflows must run without a backend.
  vm.runInContext(source, context);
  return {
    html: () => nodes['#app'].innerHTML,
    run: expression => vm.runInContext(expression, context),
    data: () => JSON.parse(vm.runInContext('JSON.stringify(state)', context)),
    saved: () => stored.get('hyperspace-v1'),
    control(selector, value = '') {
      return nodes[selector] = { value, innerHTML: '', textContent: '', disabled: false, style: {}, focus() {}, reset() {} };
    },
  };
}
