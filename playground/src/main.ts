import { createTextTrace, DEFAULT_WAWOFF2_URL, loadTextTraceFont, TEXT_TRACE_FONT_URLS } from '@text-trace/core';
import type { TextTraceError, TextTraceFontKey, TextTracePhase } from '@text-trace/core';
import type { HighlighterCore } from 'shiki/core';
import './styles.css';

interface HighlighterState {
  highlighter: HighlighterCore;
  themeName: string;
}

let highlighterState: HighlighterState | undefined;
let highlighterPromise: Promise<HighlighterState> | undefined;
let renderFrame: number | undefined;
let renderRun = 0;

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

function setPhase(phase: TextTracePhase | null | undefined): void {
  phaseReadout.textContent = phase || 'Idle';
}

function setError(error: TextTraceError | unknown): void {
  phaseReadout.textContent = error instanceof Error ? error.message : 'error';
}

const trace = createTextTrace(svg);

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

async function render(): Promise<void> {
  const run = ++renderRun;
  const snap = readSnapshot();
  writeUrl(snap);
  updateSnippets(snap);

  try {
    const font = await loadTextTraceFont({
      source: TEXT_TRACE_FONT_URLS[snap.fontKey],
      woff2: { url: DEFAULT_WAWOFF2_URL }
    });
    if (run !== renderRun) return;

    await trace.update({
      content: {
        text: snap.text,
        font
      },
      style: {
        textColor: snap.textColor,
        guideColor: snap.guideColor,
        mergeOverlappingShapes: snap.mergeOverlappingShapes
      },
      animation: {
        duration: snap.duration,
        timing: {
          horizontal: snap.horizontal,
          guide: snap.guide,
          stroke: snap.stroke,
          fill: snap.fill,
          erase: snap.erase
        }
      },
      guide: {
        verticalOvershoot: snap.verticalGuideOvershoot,
        verticalProbability: snap.verticalGuideProbability
      },
      events: {
        onPhaseChange: setPhase,
        onError: setError
      }
    });
  } catch (error) {
    if (run === renderRun) setError(error);
  }
}

function scheduleRender(): void {
  if (renderFrame !== undefined) return;
  renderFrame = window.requestAnimationFrame(() => {
    renderFrame = undefined;
    void render();
  });
}

textInput.addEventListener('input', scheduleRender);
fontSelect.addEventListener('change', scheduleRender);
textColorInput.addEventListener('input', scheduleRender);
guideColorInput.addEventListener('input', scheduleRender);
durationInput.addEventListener('input', scheduleRender);
horizontalTimeInput.addEventListener('input', scheduleRender);
guideTimeInput.addEventListener('input', scheduleRender);
strokeTimeInput.addEventListener('input', scheduleRender);
fillTimeInput.addEventListener('input', scheduleRender);
eraseTimeInput.addEventListener('input', scheduleRender);
verticalOvershootInput.addEventListener('input', scheduleRender);
verticalProbabilityInput.addEventListener('input', scheduleRender);
mergeOverlapsInput.addEventListener('change', scheduleRender);
replayButton.addEventListener('click', scheduleRender);

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

void render();
window.setTimeout(() => {
  void loadHighlighter().then((state) => {
    highlighterState = state;
    updateSnippets(readSnapshot());
  });
}, 0);

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
  if (highlighterState) {
    target.innerHTML = highlighterState.highlighter.codeToHtml(code, { lang, theme: highlighterState.themeName });
  } else {
    target.textContent = code;
  }
}

function loadHighlighter(): Promise<HighlighterState> {
  highlighterPromise ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }, { jannchieLight }] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('@jannchie/shiki-theme')
    ]);

    return {
      highlighter: await createHighlighterCore({
        themes: [jannchieLight],
        langs: [
          import('shiki/langs/typescript.mjs'),
          import('shiki/langs/vue.mjs'),
          import('shiki/langs/tsx.mjs')
        ],
        engine: createJavaScriptRegexEngine()
      }),
      themeName: jannchieLight.name
    };
  })();

  return highlighterPromise;
}

interface OptionsView {
  fontKey?: string;
  content?: {
    text?: string;
  };
  style?: {
    textColor?: string;
    guideColor?: string;
    mergeOverlappingShapes?: boolean;
  };
  animation?: {
    duration?: number;
    timing?: Record<string, number>;
  };
  guide?: {
    verticalOvershoot?: number;
    verticalProbability?: number;
  };
}

function buildOptionsObject(snap: Snapshot): OptionsView {
  const view: OptionsView = {};
  if (snap.fontKey !== DEFAULTS.fontKey) view.fontKey = snap.fontKey;
  if (snap.text !== DEFAULTS.text) view.content = { text: snap.text };

  const style: OptionsView['style'] = {};
  if (snap.textColor !== DEFAULTS.textColor) style.textColor = snap.textColor;
  if (snap.guideColor !== DEFAULTS.guideColor) style.guideColor = snap.guideColor;
  if (snap.mergeOverlappingShapes !== DEFAULTS.mergeOverlappingShapes) style.mergeOverlappingShapes = snap.mergeOverlappingShapes;
  if (Object.keys(style).length > 0) view.style = style;

  const animation: OptionsView['animation'] = {};
  if (snap.duration !== DEFAULTS.duration) animation.duration = snap.duration;

  const timing: Record<string, number> = {};
  if (snap.horizontal !== DEFAULTS.horizontal) timing.horizontal = snap.horizontal;
  if (snap.guide !== DEFAULTS.guide) timing.guide = snap.guide;
  if (snap.stroke !== DEFAULTS.stroke) timing.stroke = snap.stroke;
  if (snap.fill !== DEFAULTS.fill) timing.fill = snap.fill;
  if (snap.erase !== DEFAULTS.erase) timing.erase = snap.erase;
  if (Object.keys(timing).length > 0) animation.timing = timing;
  if (Object.keys(animation).length > 0) view.animation = animation;

  const guide: OptionsView['guide'] = {};
  if (snap.verticalGuideOvershoot !== DEFAULTS.verticalGuideOvershoot) guide.verticalOvershoot = snap.verticalGuideOvershoot;
  if (snap.verticalGuideProbability !== DEFAULTS.verticalGuideProbability) guide.verticalProbability = snap.verticalGuideProbability;
  if (Object.keys(guide).length > 0) view.guide = guide;

  return view;
}

function renderTsSnippet(opts: OptionsView): string {
  const body = formatTsObject({
    content: {
      font: '__TEXT_TRACE_FONT__',
      ...opts.content
    },
    ...(opts.style ? { style: opts.style } : {}),
    ...(opts.animation ? { animation: opts.animation } : {}),
    ...(opts.guide ? { guide: opts.guide } : {})
  }, 0).replace(JSON.stringify('__TEXT_TRACE_FONT__'), 'font');

  const lines = [
    `import { createTextTrace, loadTextTraceFont, TEXT_TRACE_FONT_URLS } from '@text-trace/core';`,
    ``,
    `const svg = document.querySelector<SVGSVGElement>('svg')!;`,
    `const font = await loadTextTraceFont({ source: TEXT_TRACE_FONT_URLS${formatFontKeyAccess(opts.fontKey ?? DEFAULTS.fontKey)} });`,
    ``,
    `const trace = createTextTrace(svg, ${body});`,
    `await trace.play();`
  ];

  return lines.join('\n');
}

function renderVueSnippet(opts: OptionsView): string {
  const attrs = formatVueAttrs(opts);
  const tag = `<TextTrace\n  :font="font"${attrs ? `\n${attrs}` : ''}\n/>`;
  return [
    `<script setup lang="ts">`,
    `import { loadTextTraceFont, TEXT_TRACE_FONT_URLS } from '@text-trace/core';`,
    `import { TextTrace } from '@text-trace/vue';`,
    ``,
    `const font = await loadTextTraceFont({ source: TEXT_TRACE_FONT_URLS${formatFontKeyAccess(opts.fontKey ?? DEFAULTS.fontKey)} });`,
    `</script>`,
    ``,
    `<template>`,
    indent(tag, 1),
    `</template>`
  ].join('\n');
}

function renderReactSnippet(opts: OptionsView): string {
  const attrs = formatReactAttrs(opts);
  const tag = `<TextTrace\n      font={font}${attrs ? `\n${attrs}` : ''}\n    />`;
  return [
    `import { loadTextTraceFont, TEXT_TRACE_FONT_URLS } from '@text-trace/core';`,
    `import { TextTrace } from '@text-trace/react';`,
    ``,
    `const font = await loadTextTraceFont({ source: TEXT_TRACE_FONT_URLS${formatFontKeyAccess(opts.fontKey ?? DEFAULTS.fontKey)} });`,
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
  if (opts.content?.text !== undefined) lines.push(`  text=${JSON.stringify(opts.content.text)}`);
  if (opts.style) lines.push(`  :style-options="${formatInlineObject(opts.style)}"`);
  if (opts.animation) lines.push(`  :animation="${formatInlineObject(opts.animation)}"`);
  if (opts.guide) lines.push(`  :guide="${formatInlineObject(opts.guide)}"`);
  return lines.join('\n');
}

function formatReactAttrs(opts: OptionsView): string {
  const pad = '      ';
  const lines: string[] = [];
  if (opts.content?.text !== undefined) lines.push(`${pad}text=${JSON.stringify(opts.content.text)}`);
  if (opts.style) lines.push(`${pad}styleOptions={${formatInlineObject(opts.style)}}`);
  if (opts.animation) lines.push(`${pad}animation={${formatInlineObject(opts.animation)}}`);
  if (opts.guide) lines.push(`${pad}guide={${formatInlineObject(opts.guide)}}`);
  return lines.join('\n');
}

function formatInlineObject(obj: Record<string, unknown>): string {
  const parts = Object.entries(obj).map(([k, v]) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return `${k}: ${formatInlineObject(v as Record<string, unknown>)}`;
    }
    return `${k}: ${JSON.stringify(v)}`;
  });
  return `{ ${parts.join(', ')} }`;
}

function formatFontKeyAccess(fontKey: string): string {
  return /^[a-zA-Z_$][\w$]*$/.test(fontKey) ? `.${fontKey}` : `[${JSON.stringify(fontKey)}]`;
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
