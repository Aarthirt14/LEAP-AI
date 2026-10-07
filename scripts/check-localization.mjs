import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => load(path.resolve(path.dirname(file), name + '.ts')) }, { filename: file });
  return module.exports;
}
const { LOCALES, languageOptions, normalizeLocale, getVoiceLocale, t } = load('lib/i18n.ts');
const { extraLocales, extraCopy } = load('lib/locales/extra.ts');
assert.equal(LOCALES.length, 10);
for (const option of languageOptions) {
  for (const alias of [option.value, option.name, option.label, `${option.value}-IN`]) assert.equal(normalizeLocale(alias), option.value);
  assert.equal(getVoiceLocale(option.value), `${option.value}-IN`);
  for (const key of ['nav.signIn', 'auth.createAccount', 'onboarding.consent', 'interview.build']) {
    assert.notEqual(t(key, option.value), key);
    if (option.value !== 'en') assert.notEqual(t(key, option.value), t(key, 'en'));
  }
}
for (const locale of extraLocales) {
  assert.equal(Object.keys(extraCopy[locale]).length, Object.keys(extraCopy.te).length);
  for (const [source, translation] of Object.entries(extraCopy[locale])) assert.ok(translation.trim() && translation !== source);
  for (const file of ['workspace-copy', 'journey-copy', 'review-copy']) {
    const table = load(`lib/${file}.ts`)[file.replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
    assert.ok(table[locale]);
  }
}
assert.equal(normalizeLocale('unknown'), 'en');
console.log(`PASS: 10 language aliases/voice tags, critical translated controls, ${Object.keys(extraCopy.te).length} messages × 7 languages, and workspace fallbacks`);
