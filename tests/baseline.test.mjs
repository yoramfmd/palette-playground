import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const mainSource = await readFile(new URL('../electron/main.js', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../app/index.html', import.meta.url), 'utf8');

test('Electron identity remains compatible with v86', () => {
  assert.equal(packageJson.name, 'palette-playground');
  assert.equal(packageJson.build.appId, 'com.paletteplayground.app');
  assert.equal(packageJson.build.productName, 'Palette Playground');
  assert.equal(packageJson.main, 'electron/main.js');
});

test('Electron loads the stable renderer entry point', () => {
  assert.match(mainSource, /loadFile\(path\.join\(__dirname, '\.\.', 'app', 'index\.html'\)\)/);
});

test('stable image-library databases remain named and versioned compatibly', () => {
  assert.match(appSource, /DESKTOP_BACKUP_DB="PalettePlaygroundDesktopBackup"/);
  assert.match(appSource, /IMAGE_LIBRARY_DB="PalettePlaygroundImages"/);
  assert.match(appSource, /indexedDB\.open\(IMAGE_LIBRARY_DB,2\)/);
});

test('stable baseline has no destructive database reset', () => {
  assert.doesNotMatch(appSource, /indexedDB\.deleteDatabase\s*\(/);
  assert.match(appSource, /v90 SAFE: never remove duplicate records automatically/);
  assert.match(appSource, /Duplicate scanning is read-only until the user explicitly chooses Delete/);
});

test('stable baseline excludes Huemint live API experiments', () => {
  assert.doesNotMatch(appSource, /api\.huemint\.com/i);
  assert.doesNotMatch(appSource, /Generate from Huemint/i);
  assert.doesNotMatch(mainSource, /huemint/i);
});
