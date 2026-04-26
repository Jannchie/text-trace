import { createTextTrace } from '@text-trace/core';
import type { TextTraceFontKey } from '@text-trace/core';
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import { jannchieLight } from '@jannchie/shiki-theme';
import './styles.css';

const SHIKI_THEME = jannchieLight.name;
const highlighterPromise: Promise<HighlighterCore> = createHighlighterCore({
  themes: [jannchieLight],
  langs: [
    import('shiki/langs/typescript.mjs'),
    import('shiki/langs/vue.mjs'),
    import('shiki/langs/tsx.mjs')
  ],
  engine: createJavaScriptRegexEngine()
});
let highlighter: HighlighterCore | undefined;

const DEFAULT_TEXT = 'Hello, world!';
const URL_PARAMS = {
  text: 'text',
  fontKey: 'font',
  textColor: 'textColor',
  guideColor: 'guideColor',
  duration: 'duration',
  horizontal: 'horizontal',
  guide: 'guide',
  stroke: 'stroke',
  fill: 'fill',
  erase: 'erase',
  verticalOvershoot: 'verticalOvershoot',
  verticalProbability: 'verticalProbability',
  mergeOverlappingShapes: 'mergeOverlappingShapes'
};

const DEFAULTS = {
  text: DEFAULT_TEXT,
  fontKey: 'noto-sc',
  textColor: '#111827',
  guideColor: '#111827',
  duration: 1000,
  horizontal: 0,
  guide: 0.1,
  stroke: 0.4,
  fill: 0.8,
  erase: 1,
  verticalGuideOvershoot: 28,
  verticalGuideProbability: 0.45,
  mergeOverlappingShapes: false
} as const;

const svg = readElement('trace-stage', SVGSVGElement);
const textInput = readElement('text-input', HTMLInputElement);
const fontSelect = readElement('font-select', HTMLSelectElement);
const textColorInput = readElement('text-color-input', HTMLInputElement);
const guideColorInput = readElement('guide-color-input', HTMLInputElement);
const durationInput = readElement('duration-input', HTMLInputElement);
const horizontalTimeInput = readElement('horizontal-time-input', HTMLInputElement);
const guideTimeInput = readElement('guide-time-input', HTMLInputElement);
const strokeTimeInput = readElement('stroke-time-input', HTMLInputElement);
const fillTimeInput = readElement('fill-time-input', HTMLInputElement);
const eraseTimeInput = readElement('erase-time-input', HTMLInputElement);
const verticalOvershootInput = readElement('vertical-overshoot-input', HTMLInputElement);
const verticalProbabilityInput = readElement('vertical-probability-input', HTMLInputElement);
const mergeOverlapsInput = readElement('merge-overlaps-input', HTMLInputElement);
const replayButton = readElement('replay-button', HTMLButtonElement);
const phaseReadout = readElement('phase-readout', HTMLElement);
const snippetTs = readElement('snippet-ts', HTMLElement);
const snippetVue = readElement('snippet-vue', HTMLElement);
const snippetReact = readElement('snippet-react', HTMLElement);
const copyButton = readElement('copy-button', HTMLButtonElement);
const tabButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.usage-tabs button[role="tab"]'));
const codeBlocks = Array.from(document.querySelectorAll<HTMLElement>('.usage-code'));

restoreFromUrl();

function setPhase(phase: string | null | undefined): void {
  phaseReadout.textContent = phase || 'Idle';
}

const trace = createTextTrace(svg, {
  onPhaseChange: setPhase
});

interface Snapshot {
  text: string;
  fontKey: TextTraceFontKey;
  textColor: string;
  guideColor: string;
  duration: number;
  horizontal: number;
  guide: number;
  stroke: number;
  fill: number;
  erase: number;
  verticalGuideOvershoot: number;
  verticalGuideProbability: number;
  mergeOverlappingShapes: boolean;
}

function readSnapshot(): Snapshot {
  return {
    text: textInput.value || DEFAULT_TEXT,
    fontKey: fontSelect.value as TextTraceFontKey,
    textColor: textColorInput.value || DEFAULTS.textColor,
    guideColor: guideColorInput.value || DEFAULTS.guideColor,
    duration: readDuration(durationInput),
    horizontal: readFraction(horizontalTimeInput),
    guide: readFraction(guideTimeInput),
    stroke: readFraction(strokeTimeInput),
    fill: readFraction(fillTimeInput),
    erase: readFraction(eraseTimeInput),
    verticalGuideOvershoot: readDelay(verticalOvershootInput),
    verticalGuideProbability: readProbability(verticalProbabilityInput),
    mergeOverlappingShapes: mergeOverlapsInput.checked
  };
}

function render() {
  const snap = readSnapshot();
  writeUrl(snap);
  updateSnippets(snap);

  void trace.update({
    text: snap.text,
    fontKey: snap.fontKey,
    textColor: snap.textColor,
    guideColor: snap.guideColor,
    duration: snap.duration,
    timing: {
      horizontal: snap.horizontal,
      guide: snap.guide,
      stroke: snap.stroke,
      fill: snap.fill,
      erase: snap.erase
    },
    verticalGuideOvershoot: snap.verticalGuideOvershoot,
    verticalGuideProbability: snap.verticalGuideProbability,
    mergeOverlappingShapes: snap.mergeOverlappingShapes,
    onPhaseChange: setPhase
  });
}

textInput.addEventListener('input', render);
fontSelect.addEventListener('change', render);
textColorInput.addEventListener('input', render);
guideColorInput.addEventListener('input', render);
durationInput.addEventListener('input', render);
horizontalTimeInput.addEventListener('input', render);
guideTimeInput.addEventListener('input', render);
strokeTimeInput.addEventListener('input', render);
fillTimeInput.addEventListener('input', render);
eraseTimeInput.addEventListener('input', render);
verticalOvershootInput.addEventListener('input', render);
verticalProbabilityInput.addEventListener('input', render);
mergeOverlapsInput.addEventListener('change', render);
replayButton.addEventListener('click', render);

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab || 'ts'));
});

copyButton.addEventListener('click', () => {
  const active = codeBlocks.find((block) => block.dataset.active === 'true');
  if (!active) return;
  const text = active.dataset.code || active.textContent || '';
  void navigator.clipboard.writeText(text).then(() => {
    copyButton.textContent = 'Copied';
    copyButton.dataset.state = 'copied';
    window.setTimeout(() => {
      copyButton.textContent = 'Copy';
      delete copyButton.dataset.state;
    }, 1400);
  });
});

render();

function activateTab(tab: string): void {
  tabButtons.forEach((btn) => {
    btn.setAttribute('aria-selected', String(btn.dataset.tab === tab));
  });
  codeBlocks.forEach((block) => {
    block.dataset.active = String(block.dataset.tab === tab);
  });
}

function updateSnippets(snap: Snapshot): void {
  const opts = buildOptionsObject(snap);
  setSnippet(snippetTs, renderTsSnippet(opts), 'typescript');
  setSnippet(snippetVue, renderVueSnippet(opts), 'vue');
  setSnippet(snippetReact, renderReactSnippet(opts), 'tsx');
}

function setSnippet(target: HTMLElement, code: string, lang: 'typescript' | 'vue' | 'tsx'): void {
  target.dataset.code = code;
  if (highlighter) {
    target.innerHTML = highlighter.codeToHtml(code, { lang, theme: SHIKI_THEME });
  } else {
    target.textContent = code;
  }
}

void highlighterPromise.then((instance) => {
  highlighter = instance;
  render();
});

interface OptionsView {
  text?: string;
  fontKey?: string;
  textColor?: string;
  guideColor?: string;
  duration?: number;
  timing?: Record<string, number>;
  verticalGuideOvershoot?: number;
  verticalGuideProbability?: number;
  mergeOverlappingShapes?: boolean;
}

function buildOptionsObject(snap: Snapshot): OptionsView {
  const view: OptionsView = {};
  if (snap.text !== DEFAULTS.text) view.text = snap.text;
  if (snap.fontKey !== DEFAULTS.fontKey) view.fontKey = snap.fontKey;
  if (snap.textColor !== DEFAULTS.textColor) view.textColor = snap.textColor;
  if (snap.guideColor !== DEFAULTS.guideColor) view.guideColor = snap.guideColor;
  if (snap.duration !== DEFAULTS.duration) view.duration = snap.duration;

  const timing: Record<string, number> = {};
  if (snap.horizontal !== DEFAULTS.horizontal) timing.horizontal = snap.horizontal;
  if (snap.guide !== DEFAULTS.guide) timing.guide = snap.guide;
  if (snap.stroke !== DEFAULTS.stroke) timing.stroke = snap.stroke;
  if (snap.fill !== DEFAULTS.fill) timing.fill = snap.fill;
  if (snap.erase !== DEFAULTS.erase) timing.erase = snap.erase;
  if (Object.keys(timing).length > 0) view.timing = timing;

  if (snap.verticalGuideOvershoot !== DEFAULTS.verticalGuideOvershoot) view.verticalGuideOvershoot = snap.verticalGuideOvershoot;
  if (snap.verticalGuideProbability !== DEFAULTS.verticalGuideProbability) view.verticalGuideProbability = snap.verticalGuideProbability;
  if (snap.mergeOverlappingShapes !== DEFAULTS.mergeOverlappingShapes) view.mergeOverlappingShapes = snap.mergeOverlappingShapes;
  return view;
}

function renderTsSnippet(opts: OptionsView): string {
  const lines = [
    `import { createTextTrace } from '@text-trace/core';`,
    ``,
    `const svg = document.querySelector<SVGSVGElement>('svg')!;`,
    ``
  ];

  const body = formatTsObject(opts, 0);
  if (body === '{}') {
    lines.push(`createTextTrace(svg);`);
  } else {
    lines.push(`createTextTrace(svg, ${body});`);
  }

  return lines.join('\n');
}

function renderVueSnippet(opts: OptionsView): string {
  const attrs = formatVueAttrs(opts);
  const tag = attrs ? `<TextTrace\n${attrs}\n/>` : `<TextTrace />`;
  return [
    `<script setup lang="ts">`,
    `import { TextTrace } from '@text-trace/vue';`,
    `</script>`,
    ``,
    `<template>`,
    indent(tag, 1),
    `</template>`
  ].join('\n');
}

function renderReactSnippet(opts: OptionsView): string {
  const attrs = formatReactAttrs(opts);
  const tag = attrs ? `<TextTrace\n${attrs}\n    />` : `<TextTrace />`;
  return [
    `import { TextTrace } from '@text-trace/react';`,
    ``,
    `export function App() {`,
    `  return (`,
    `    ${tag}`,
    `  );`,
    `}`
  ].join('\n');
}

function formatTsObject(value: unknown, depth: number): string {
  if (value === null || value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'object') return String(value);

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return '{}';

  const pad = '  '.repeat(depth + 1);
  const closePad = '  '.repeat(depth);
  const lines = entries.map(([k, v]) => `${pad}${k}: ${formatTsObject(v, depth + 1)}`);
  return `{\n${lines.join(',\n')}\n${closePad}}`;
}

function formatVueAttrs(opts: OptionsView): string {
  const lines: string[] = [];
  if (opts.text !== undefined) lines.push(`  text=${JSON.stringify(opts.text)}`);
  if (opts.fontKey !== undefined) lines.push(`  font-key=${JSON.stringify(opts.fontKey)}`);
  if (opts.textColor !== undefined) lines.push(`  text-color=${JSON.stringify(opts.textColor)}`);
  if (opts.guideColor !== undefined) lines.push(`  guide-color=${JSON.stringify(opts.guideColor)}`);
  if (opts.duration !== undefined) lines.push(`  :duration="${opts.duration}"`);
  if (opts.timing) lines.push(`  :timing="${formatInlineObject(opts.timing)}"`);
  if (opts.verticalGuideOvershoot !== undefined) lines.push(`  :vertical-guide-overshoot="${opts.verticalGuideOvershoot}"`);
  if (opts.verticalGuideProbability !== undefined) lines.push(`  :vertical-guide-probability="${opts.verticalGuideProbability}"`);
  if (opts.mergeOverlappingShapes) lines.push(`  merge-overlapping-shapes`);
  return lines.join('\n');
}

function formatReactAttrs(opts: OptionsView): string {
  const pad = '      ';
  const lines: string[] = [];
  if (opts.text !== undefined) lines.push(`${pad}text=${JSON.stringify(opts.text)}`);
  if (opts.fontKey !== undefined) lines.push(`${pad}fontKey=${JSON.stringify(opts.fontKey)}`);
  if (opts.textColor !== undefined) lines.push(`${pad}textColor=${JSON.stringify(opts.textColor)}`);
  if (opts.guideColor !== undefined) lines.push(`${pad}guideColor=${JSON.stringify(opts.guideColor)}`);
  if (opts.duration !== undefined) lines.push(`${pad}duration={${opts.duration}}`);
  if (opts.timing) lines.push(`${pad}timing={${formatInlineObject(opts.timing)}}`);
  if (opts.verticalGuideOvershoot !== undefined) lines.push(`${pad}verticalGuideOvershoot={${opts.verticalGuideOvershoot}}`);
  if (opts.verticalGuideProbability !== undefined) lines.push(`${pad}verticalGuideProbability={${opts.verticalGuideProbability}}`);
  if (opts.mergeOverlappingShapes) lines.push(`${pad}mergeOverlappingShapes`);
  return lines.join('\n');
}

function formatInlineObject(obj: Record<string, number>): string {
  const parts = Object.entries(obj).map(([k, v]) => `${k}: ${v}`);
  return `{ ${parts.join(', ')} }`;
}

function indent(text: string, levels: number): string {
  const pad = '  '.repeat(levels);
  return text
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n');
}

function restoreFromUrl(): void {
  const params = new URLSearchParams(window.location.search);

  const text = params.get(URL_PARAMS.text);
  if (text !== null) textInput.value = text;

  setSelectFromUrl(fontSelect, params.get(URL_PARAMS.fontKey));
  setColorFromUrl(textColorInput, params.get(URL_PARAMS.textColor));
  setColorFromUrl(guideColorInput, params.get(URL_PARAMS.guideColor));
  setInputFromUrl(durationInput, params.get(URL_PARAMS.duration));
  setInputFromUrl(horizontalTimeInput, params.get(URL_PARAMS.horizontal));
  setInputFromUrl(guideTimeInput, params.get(URL_PARAMS.guide));
  setInputFromUrl(strokeTimeInput, params.get(URL_PARAMS.stroke));
  setInputFromUrl(fillTimeInput, params.get(URL_PARAMS.fill));
  setInputFromUrl(eraseTimeInput, params.get(URL_PARAMS.erase));
  setInputFromUrl(verticalOvershootInput, params.get(URL_PARAMS.verticalOvershoot));
  setInputFromUrl(verticalProbabilityInput, params.get(URL_PARAMS.verticalProbability));
  setCheckboxFromUrl(mergeOverlapsInput, params.get(URL_PARAMS.mergeOverlappingShapes));
}

function writeUrl(snap: Snapshot): void {
  const params = new URLSearchParams();
  params.set(URL_PARAMS.text, snap.text);
  params.set(URL_PARAMS.fontKey, snap.fontKey);
  params.set(URL_PARAMS.textColor, snap.textColor);
  params.set(URL_PARAMS.guideColor, snap.guideColor);
  params.set(URL_PARAMS.duration, String(snap.duration));
  params.set(URL_PARAMS.horizontal, String(snap.horizontal));
  params.set(URL_PARAMS.guide, String(snap.guide));
  params.set(URL_PARAMS.stroke, String(snap.stroke));
  params.set(URL_PARAMS.fill, String(snap.fill));
  params.set(URL_PARAMS.erase, String(snap.erase));
  params.set(URL_PARAMS.verticalOvershoot, String(snap.verticalGuideOvershoot));
  params.set(URL_PARAMS.verticalProbability, String(snap.verticalGuideProbability));
  params.set(URL_PARAMS.mergeOverlappingShapes, String(snap.mergeOverlappingShapes));

  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
}

function setSelectFromUrl(select: HTMLSelectElement, value: string | null): void {
  if (value === null) return;
  const hasOption = Array.from(select.options).some((option) => option.value === value);
  if (hasOption) select.value = value;
}

function setInputFromUrl(input: HTMLInputElement, value: string | null): void {
  if (value !== null && value !== '') input.value = value;
}

function setColorFromUrl(input: HTMLInputElement, value: string | null): void {
  if (value !== null && /^#[0-9a-f]{6}$/i.test(value)) {
    input.value = value;
  }
}

function setCheckboxFromUrl(input: HTMLInputElement, value: string | null): void {
  if (value !== null) input.checked = value === 'true';
}

function readDuration(input: HTMLInputElement): number {
  const value = Number(input.value);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function readDelay(input: HTMLInputElement): number {
  const value = Number(input.value);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function readFraction(input: HTMLInputElement): number {
  const value = Number(input.value);
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function readProbability(input: HTMLInputElement): number {
  const value = Number(input.value);
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function readElement<T extends Element>(
  id: string,
  constructor: new (...args: never[]) => T
): T {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) {
    throw new Error(`Missing #${id}`);
  }
  return element;
}
