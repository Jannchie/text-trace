import { createTextTrace } from '@text-trace/core';
import type { TextTraceDramaMode, TextTraceFontKey } from '@text-trace/core';
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
  dramaMode: 'drama',
  horizontalDelay: 'horizontalDelay',
  guideDelay: 'guideDelay',
  strokeDelay: 'strokeDelay',
  fillDelay: 'fillDelay',
  eraseDelay: 'eraseDelay',
  verticalOvershoot: 'verticalOvershoot',
  verticalProbability: 'verticalProbability',
  guideExitExtension: 'guideExitExtension',
  mergeOverlappingShapes: 'mergeOverlappingShapes'
};

const DEFAULTS = {
  text: DEFAULT_TEXT,
  fontKey: 'noto-sc',
  dramaMode: 'subtle',
  horizontalDelay: 0,
  guideDelay: 100,
  strokeDelay: 400,
  fillDelay: 800,
  eraseDelay: 1000,
  verticalGuideOvershoot: 28,
  verticalGuideProbability: 0.45,
  guideExitExtension: 18,
  mergeOverlappingShapes: false
} as const;

const svg = readElement('trace-stage', SVGSVGElement);
const textInput = readElement('text-input', HTMLInputElement);
const fontSelect = readElement('font-select', HTMLSelectElement);
const dramaSelect = readElement('drama-select', HTMLSelectElement);
const horizontalDelayInput = readElement('horizontal-delay-input', HTMLInputElement);
const guideDelayInput = readElement('guide-delay-input', HTMLInputElement);
const strokeDelayInput = readElement('stroke-delay-input', HTMLInputElement);
const fillDelayInput = readElement('fill-delay-input', HTMLInputElement);
const eraseDelayInput = readElement('erase-delay-input', HTMLInputElement);
const verticalOvershootInput = readElement('vertical-overshoot-input', HTMLInputElement);
const verticalProbabilityInput = readElement('vertical-probability-input', HTMLInputElement);
const guideExitExtensionInput = readElement('guide-exit-extension-input', HTMLInputElement);
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
  dramaMode: TextTraceDramaMode;
  horizontalDelay: number;
  guideDelay: number;
  strokeDelay: number;
  fillDelay: number;
  eraseDelay: number;
  verticalGuideOvershoot: number;
  verticalGuideProbability: number;
  guideExitExtension: number;
  mergeOverlappingShapes: boolean;
}

function readSnapshot(): Snapshot {
  return {
    text: textInput.value || DEFAULT_TEXT,
    fontKey: fontSelect.value as TextTraceFontKey,
    dramaMode: dramaSelect.value as TextTraceDramaMode,
    horizontalDelay: readDelay(horizontalDelayInput),
    guideDelay: readDelay(guideDelayInput),
    strokeDelay: readDelay(strokeDelayInput),
    fillDelay: readDelay(fillDelayInput),
    eraseDelay: readDelay(eraseDelayInput),
    verticalGuideOvershoot: readDelay(verticalOvershootInput),
    verticalGuideProbability: readProbability(verticalProbabilityInput),
    guideExitExtension: readDelay(guideExitExtensionInput),
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
    dramaMode: snap.dramaMode,
    timing: {
      horizontalDelay: snap.horizontalDelay,
      guideDelay: snap.guideDelay,
      circleDelay: snap.guideDelay + 50,
      strokeDelay: snap.strokeDelay,
      fillDelay: snap.fillDelay,
      eraseDelay: snap.eraseDelay,
      horizontalEraseDelay: snap.eraseDelay
    },
    verticalGuideOvershoot: snap.verticalGuideOvershoot,
    verticalGuideProbability: snap.verticalGuideProbability,
    guideExitExtension: snap.guideExitExtension,
    mergeOverlappingShapes: snap.mergeOverlappingShapes,
    onPhaseChange: setPhase
  });
}

textInput.addEventListener('input', render);
fontSelect.addEventListener('change', render);
dramaSelect.addEventListener('change', render);
horizontalDelayInput.addEventListener('input', render);
guideDelayInput.addEventListener('input', render);
strokeDelayInput.addEventListener('input', render);
fillDelayInput.addEventListener('input', render);
eraseDelayInput.addEventListener('input', render);
verticalOvershootInput.addEventListener('input', render);
verticalProbabilityInput.addEventListener('input', render);
guideExitExtensionInput.addEventListener('input', render);
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
  dramaMode?: string;
  timing?: Record<string, number>;
  verticalGuideOvershoot?: number;
  verticalGuideProbability?: number;
  guideExitExtension?: number;
  mergeOverlappingShapes?: boolean;
}

function buildOptionsObject(snap: Snapshot): OptionsView {
  const view: OptionsView = {};
  if (snap.text !== DEFAULTS.text) view.text = snap.text;
  if (snap.fontKey !== DEFAULTS.fontKey) view.fontKey = snap.fontKey;
  if (snap.dramaMode !== DEFAULTS.dramaMode) view.dramaMode = snap.dramaMode;

  const timing: Record<string, number> = {};
  if (snap.horizontalDelay !== DEFAULTS.horizontalDelay) timing.horizontalDelay = snap.horizontalDelay;
  if (snap.guideDelay !== DEFAULTS.guideDelay) timing.guideDelay = snap.guideDelay;
  if (snap.strokeDelay !== DEFAULTS.strokeDelay) timing.strokeDelay = snap.strokeDelay;
  if (snap.fillDelay !== DEFAULTS.fillDelay) timing.fillDelay = snap.fillDelay;
  if (snap.eraseDelay !== DEFAULTS.eraseDelay) timing.eraseDelay = snap.eraseDelay;
  if (Object.keys(timing).length > 0) view.timing = timing;

  if (snap.verticalGuideOvershoot !== DEFAULTS.verticalGuideOvershoot) view.verticalGuideOvershoot = snap.verticalGuideOvershoot;
  if (snap.verticalGuideProbability !== DEFAULTS.verticalGuideProbability) view.verticalGuideProbability = snap.verticalGuideProbability;
  if (snap.guideExitExtension !== DEFAULTS.guideExitExtension) view.guideExitExtension = snap.guideExitExtension;
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
  if (opts.dramaMode !== undefined) lines.push(`  drama-mode=${JSON.stringify(opts.dramaMode)}`);
  if (opts.timing) lines.push(`  :timing="${formatInlineObject(opts.timing)}"`);
  if (opts.verticalGuideOvershoot !== undefined) lines.push(`  :vertical-guide-overshoot="${opts.verticalGuideOvershoot}"`);
  if (opts.verticalGuideProbability !== undefined) lines.push(`  :vertical-guide-probability="${opts.verticalGuideProbability}"`);
  if (opts.guideExitExtension !== undefined) lines.push(`  :guide-exit-extension="${opts.guideExitExtension}"`);
  if (opts.mergeOverlappingShapes) lines.push(`  merge-overlapping-shapes`);
  return lines.join('\n');
}

function formatReactAttrs(opts: OptionsView): string {
  const pad = '      ';
  const lines: string[] = [];
  if (opts.text !== undefined) lines.push(`${pad}text=${JSON.stringify(opts.text)}`);
  if (opts.fontKey !== undefined) lines.push(`${pad}fontKey=${JSON.stringify(opts.fontKey)}`);
  if (opts.dramaMode !== undefined) lines.push(`${pad}dramaMode=${JSON.stringify(opts.dramaMode)}`);
  if (opts.timing) lines.push(`${pad}timing={${formatInlineObject(opts.timing)}}`);
  if (opts.verticalGuideOvershoot !== undefined) lines.push(`${pad}verticalGuideOvershoot={${opts.verticalGuideOvershoot}}`);
  if (opts.verticalGuideProbability !== undefined) lines.push(`${pad}verticalGuideProbability={${opts.verticalGuideProbability}}`);
  if (opts.guideExitExtension !== undefined) lines.push(`${pad}guideExitExtension={${opts.guideExitExtension}}`);
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
  setSelectFromUrl(dramaSelect, params.get(URL_PARAMS.dramaMode));
  setInputFromUrl(horizontalDelayInput, params.get(URL_PARAMS.horizontalDelay));
  setInputFromUrl(guideDelayInput, params.get(URL_PARAMS.guideDelay));
  setInputFromUrl(strokeDelayInput, params.get(URL_PARAMS.strokeDelay));
  setInputFromUrl(fillDelayInput, params.get(URL_PARAMS.fillDelay));
  setInputFromUrl(eraseDelayInput, params.get(URL_PARAMS.eraseDelay));
  setInputFromUrl(verticalOvershootInput, params.get(URL_PARAMS.verticalOvershoot));
  setInputFromUrl(verticalProbabilityInput, params.get(URL_PARAMS.verticalProbability));
  setInputFromUrl(guideExitExtensionInput, params.get(URL_PARAMS.guideExitExtension));
  setCheckboxFromUrl(mergeOverlapsInput, params.get(URL_PARAMS.mergeOverlappingShapes));
}

function writeUrl(snap: Snapshot): void {
  const params = new URLSearchParams();
  params.set(URL_PARAMS.text, snap.text);
  params.set(URL_PARAMS.fontKey, snap.fontKey);
  params.set(URL_PARAMS.dramaMode, snap.dramaMode);
  params.set(URL_PARAMS.horizontalDelay, String(snap.horizontalDelay));
  params.set(URL_PARAMS.guideDelay, String(snap.guideDelay));
  params.set(URL_PARAMS.strokeDelay, String(snap.strokeDelay));
  params.set(URL_PARAMS.fillDelay, String(snap.fillDelay));
  params.set(URL_PARAMS.eraseDelay, String(snap.eraseDelay));
  params.set(URL_PARAMS.verticalOvershoot, String(snap.verticalGuideOvershoot));
  params.set(URL_PARAMS.verticalProbability, String(snap.verticalGuideProbability));
  params.set(URL_PARAMS.guideExitExtension, String(snap.guideExitExtension));
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

function setCheckboxFromUrl(input: HTMLInputElement, value: string | null): void {
  if (value !== null) input.checked = value === 'true';
}

function readDelay(input: HTMLInputElement): number {
  const value = Number(input.value);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
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
