import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import opentype from '../packages/core/node_modules/opentype.js/dist/opentype.module.js';
import { createTextTraceLayout, getTextTracePaths, loadTextTraceFont } from '../packages/core/dist/index.js';

test('createTextTraceLayout returns visible glyph paths with per-glyph styles', async () => {
  const result = await createTextTraceLayout({
    text: 'AB A',
    font: createTestFont(),
    style: {
      textColor: '#111111',
      guideColor: '#222222',
      glyphStyles: [
        { at: 1, style: { textColor: '#ff0000' } },
        { from: 3, to: 4, style: { guideColor: '#00ff00' } }
      ]
    }
  });

  assert.equal(result.paths.length, 3);
  assert.deepEqual(result.paths.map((path) => path.index), [0, 1, 3]);
  assert.equal(result.paths[0].style.textColor, '#111111');
  assert.equal(result.paths[1].style.textColor, '#ff0000');
  assert.equal(result.paths[2].style.guideColor, '#00ff00');
  assert.equal(result.paths[0].fillRule, undefined);
});

test('createTextTraceLayout keeps the public mergeOverlappingShapes result shape', async () => {
  const result = await createTextTraceLayout({
    text: 'A',
    font: createTestFont(),
    style: {
      mergeOverlappingShapes: true
    }
  });

  assert.equal(result.paths.length, 1);
  assert.equal(result.paths[0].fillRule, 'evenodd');
  assert.match(result.paths[0].d, /^M /);
});

test('getTextTracePaths is an alias for createTextTraceLayout', async () => {
  const result = await getTextTracePaths({
    text: 'A',
    font: createTestFont()
  });

  assert.equal(result.paths.length, 1);
});

test('loadTextTraceFont caches parsed object font buffers', async () => {
  const buffer = createTestFont().toArrayBuffer();
  const first = await loadTextTraceFont({ source: buffer });
  const second = await loadTextTraceFont({ source: buffer });

  assert.equal(first, second);
});

test('loadTextTraceFont shares concurrent function font sources', async () => {
  const buffer = createTestFont().toArrayBuffer();
  let calls = 0;
  const source = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return buffer;
  };

  const [first, second] = await Promise.all([
    loadTextTraceFont({ source }),
    loadTextTraceFont({ source })
  ]);

  assert.equal(calls, 1);
  assert.equal(first, second);
});

test('core ESM build lazy-loads polygon-clipping', () => {
  const code = readFileSync(new URL('../packages/core/dist/index.js', import.meta.url), 'utf8');

  assert.doesNotMatch(code, /^import\s+.*polygon-clipping/m);
  assert.match(code, /import\(["']polygon-clipping["']\)/);
});

function createTestFont() {
  const notdef = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 500,
    path: new opentype.Path()
  });
  const space = new opentype.Glyph({
    name: 'space',
    unicode: 32,
    advanceWidth: 300,
    path: new opentype.Path()
  });

  return new opentype.Font({
    familyName: 'TextTraceTest',
    styleName: 'Regular',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs: [
      notdef,
      space,
      createGlyph('A', 65, 600, [
        [0, 0],
        [250, 700],
        [500, 0]
      ]),
      createGlyph('B', 66, 620, [
        [0, 0],
        [0, 700],
        [460, 700],
        [460, 0]
      ])
    ]
  });
}

function createGlyph(name, unicode, advanceWidth, points) {
  const path = new opentype.Path();
  const [first, ...rest] = points;
  path.moveTo(first[0], first[1]);
  rest.forEach((point) => path.lineTo(point[0], point[1]));
  path.close();

  return new opentype.Glyph({
    name,
    unicode,
    advanceWidth,
    path
  });
}
