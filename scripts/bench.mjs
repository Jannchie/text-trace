import { performance } from 'node:perf_hooks';
import opentype from '../packages/core/node_modules/opentype.js/dist/opentype.module.js';
import { createTextTraceLayout } from '../packages/core/dist/index.js';

const font = createTestFont();
const cases = [
  { text: 'Hello, world!', style: { mergeOverlappingShapes: false } },
  { text: 'Hello, world!', style: { mergeOverlappingShapes: true } },
  { text: 'Text Trace '.repeat(8), style: { mergeOverlappingShapes: false } },
  { text: 'Text Trace '.repeat(8), style: { mergeOverlappingShapes: true } }
];

for (const options of cases) {
  await createTextTraceLayout({ ...options, font });
  const samples = [];

  for (let i = 0; i < 30; i += 1) {
    const start = performance.now();
    await createTextTraceLayout({ ...options, font });
    samples.push(performance.now() - start);
  }

  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)];
  const p90 = samples[Math.floor(samples.length * 0.9)];
  console.log(`${JSON.stringify(options)} median=${median.toFixed(2)}ms p90=${p90.toFixed(2)}ms`);
}

function createTestFont() {
  const notdef = new opentype.Glyph({
    name: '.notdef',
    unicode: 0,
    advanceWidth: 500,
    path: new opentype.Path()
  });
  const glyphs = [notdef, createRectGlyph(' ', 32, 300, 0, 0), createRectGlyph('A', 65, 600, 500, 700)];

  'Hello,world!TextTrace'.split('').forEach((ch) => {
    if (glyphs.some((glyph) => glyph.unicode === ch.codePointAt(0))) return;
    glyphs.push(createRectGlyph(ch, ch.codePointAt(0), 520, 420, 680));
  });

  return new opentype.Font({
    familyName: 'TextTraceBench',
    styleName: 'Regular',
    unitsPerEm: 1000,
    ascender: 800,
    descender: -200,
    glyphs
  });
}

function createRectGlyph(name, unicode, advanceWidth, width, height) {
  const path = new opentype.Path();
  if (width > 0 && height > 0) {
    path.moveTo(0, 0);
    path.lineTo(width, 0);
    path.lineTo(width, height);
    path.lineTo(0, height);
    path.close();
  }

  return new opentype.Glyph({
    name,
    unicode,
    advanceWidth,
    path
  });
}
