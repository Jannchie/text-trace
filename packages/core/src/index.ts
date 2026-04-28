import opentype from 'opentype.js';
import type { BoundingBox, Font, Path } from 'opentype.js';
import type { MultiPolygon, Polygon, Ring } from 'polygon-clipping';

export type TextTraceFontKey = 'inter' | 'garamond' | 'noto-sc' | 'noto-jp';
export type TextTraceFont = Font;
export type TextTraceFontData = string | ArrayBuffer | Uint8Array | Font;
export type TextTraceFontSource = TextTraceFontData | (() => TextTraceFontData | Promise<TextTraceFontData>);
export type TextTraceWoff2Source =
  | TextTraceWawoff2Module
  | Promise<TextTraceWawoff2Module>
  | (() => TextTraceWawoff2Module | Promise<TextTraceWawoff2Module>);
export type TextTraceWawoff2Source = TextTraceWoff2Source;
export type TextTracePhase =
  | 'idle'
  | 'drawing-guides'
  | 'stroking'
  | 'filling'
  | 'erasing-guides'
  | 'done'
  | 'error';
export type TextTraceErrorCode = 'missing-font' | 'render-failed';

export interface LoadTextTraceFontOptions {
  source: TextTraceFontSource;
  woff2?: {
    url?: string;
    module?: TextTraceWoff2Source;
  };
}

export interface TextTraceError {
  code: TextTraceErrorCode;
  message: string;
  cause?: unknown;
}

export interface TextTraceTiming {
  horizontal?: number;
  guide?: number;
  stroke?: number;
  fill?: number;
  erase?: number;
}

export interface TextTraceGlyphStyle {
  textColor?: string;
  guideColor?: string;
}

export type TextTraceGlyphStyleRule =
  | {
      at: number | number[];
      style: TextTraceGlyphStyle;
    }
  | {
      from: number;
      to: number;
      style: TextTraceGlyphStyle;
    };

export interface TextTraceContentOptions {
  text?: string;
  font?: TextTraceFont;
}

export interface TextTraceStyleOptions {
  textColor?: string;
  guideColor?: string;
  mergeOverlappingShapes?: boolean;
  mergeCurveSegments?: number;
  glyphStyles?: TextTraceGlyphStyleRule[];
}

export interface TextTraceGuideOptions {
  verticalOvershoot?: number;
  verticalProbability?: number;
  seed?: string | number | null;
}

export interface TextTraceAnimationOptions {
  duration?: number;
  timing?: TextTraceTiming;
}

export interface TextTraceAccessibilityOptions {
  ariaLabel?: string | null;
  decorative?: boolean;
}

export interface TextTraceEventOptions {
  onPhaseChange?: (phase: TextTracePhase) => void;
  onError?: (error: TextTraceError) => void;
}

export interface TextTraceRenderOptions {
  content?: TextTraceContentOptions;
  style?: TextTraceStyleOptions;
  guide?: TextTraceGuideOptions;
  animation?: TextTraceAnimationOptions;
  accessibility?: TextTraceAccessibilityOptions;
  events?: TextTraceEventOptions;
}

export interface TextTraceLayoutOptions {
  text?: string;
  font: TextTraceFont;
  style?: TextTraceStyleOptions;
}

export interface TextTracePathItem {
  index: number;
  text: string;
  d: string;
  bbox: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  style: Required<TextTraceGlyphStyle>;
  fillRule?: 'evenodd';
}

export interface TextTracePathResult {
  viewBox: string;
  width: number;
  height: number;
  charCount: number;
  topY: number;
  bottomY: number;
  xL: number;
  xR: number;
  paths: TextTracePathItem[];
}

export interface TextTraceController {
  render(options?: TextTraceRenderOptions): Promise<void>;
  update(options: TextTraceRenderOptions): Promise<void>;
  setContent(content: TextTraceContentOptions): Promise<void>;
  setStyle(style: TextTraceStyleOptions): Promise<void>;
  setAnimation(animation: TextTraceAnimationOptions): Promise<void>;
  play(): Promise<void>;
  replay(): Promise<void>;
  renderLayout(layout: TextTracePathResult, options?: TextTraceRenderOptions): Promise<void>;
  destroy(): void;
}

interface ResolvedTextTraceOptions {
  content: {
    text: string;
    font?: TextTraceFont;
  };
  style: Required<Pick<TextTraceStyleOptions, 'textColor' | 'guideColor' | 'mergeOverlappingShapes' | 'mergeCurveSegments'>> & {
    glyphStyles: TextTraceGlyphStyleRule[];
  };
  guide: Required<Pick<TextTraceGuideOptions, 'verticalOvershoot' | 'verticalProbability'>> & {
    seed?: string | number | null;
  };
  animation: Required<Pick<TextTraceAnimationOptions, 'duration'>> & {
    timing: TextTraceTiming;
  };
  accessibility: Required<Pick<TextTraceAccessibilityOptions, 'decorative'>> & {
    ariaLabel: string | null;
  };
  events: TextTraceEventOptions;
};

type ResolvedTextTraceStyle = ResolvedTextTraceOptions['style'];

interface ResolvedTextTraceTiming {
  horizontalDelay: number;
  horizontalDuration: number;
  guideDelay: number;
  guideStagger: number;
  guideDuration: number;
  circleDelay: number;
  circleDuration: number;
  strokeDelay: number;
  strokeStagger: number;
  strokeDuration: number;
  fillDelay: number;
  fillDuration: number;
  eraseDelay: number;
  guideEraseDuration: number;
  circleEraseDuration: number;
  horizontalEraseDelay: number;
  horizontalEraseDuration: number;
}

export interface TextTraceWawoff2Module {
  decompress?: (input: Uint8Array) => Uint8Array | false | Promise<Uint8Array | false>;
  onRuntimeInitialized?: () => void;
}

declare global {
  interface Window {
    Module?: TextTraceWawoff2Module;
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 640;
const HEIGHT = 240;
const VIEW_BOX_PAD_X = 48;
const VIEW_BOX_PAD_Y = 28;
const HORIZONTAL_GUIDE_PAD_Y = 4;
const GUIDE_TAIL_LENGTH = 36;
const NORM_LEN = 1000;
const DEFAULT_DURATION = 1000;
const ROUND_LATIN = new Set(['O', 'Q', 'C', 'G', 'D', 'U', 'o', 'c', 'e', 'a', 'b', 'd', 'g', 'p', 'q', '0', '6', '8', '9']);
const DEFAULT_TEXT = 'Hello, world!';

export const TEXT_TRACE_VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`;
export const DEFAULT_WAWOFF2_URL = 'https://unpkg.com/wawoff2@2.0.1/build/decompress_binding.js';

export const TEXT_TRACE_FONT_URLS: Record<TextTraceFontKey, string> = {
  inter: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.16/files/inter-latin-400-normal.woff2',
  garamond: 'https://cdn.jsdelivr.net/npm/@fontsource/eb-garamond@5.0.18/files/eb-garamond-latin-400-normal.woff2',
  'noto-sc': 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.2.9/files/noto-sans-sc-chinese-simplified-400-normal.woff2',
  'noto-jp': 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.14/files/noto-sans-jp-japanese-400-normal.woff2'
};
export const TEXT_TRACE_CDN_FONT_URLS = TEXT_TRACE_FONT_URLS;

const DEFAULT_OPTIONS: ResolvedTextTraceOptions = {
  content: {
    text: DEFAULT_TEXT
  },
  style: {
    textColor: '#111827',
    guideColor: '#111827',
    glyphStyles: [],
    mergeOverlappingShapes: false,
    mergeCurveSegments: 12
  },
  guide: {
    verticalOvershoot: 28,
    verticalProbability: 0.45
  },
  animation: {
    duration: DEFAULT_DURATION,
    timing: {}
  },
  accessibility: {
    ariaLabel: null,
    decorative: false
  },
  events: {}
};

const DEFAULT_TIMING: Required<TextTraceTiming> = {
  horizontal: 0,
  guide: 0.1,
  stroke: 0.4,
  fill: 0.8,
  erase: 1
};

const TIMING_RATIOS = {
  horizontalDuration: 0.7,
  guideStagger: 0.03,
  guideDuration: 0.55,
  circleOffset: 0.05,
  circleDuration: 0.8,
  strokeStagger: 0.04,
  strokeDuration: 1.1,
  fillDuration: 0.6,
  guideEraseDuration: 0.38,
  circleEraseDuration: 0.6,
  horizontalEraseDuration: 0.6
};

type PolygonUnion = typeof import('polygon-clipping')['union'];
type CompiledGlyphStyleRule = {
  style: TextTraceGlyphStyle;
  matches: (index: number) => boolean;
};

const fontCache = new Map<string, Font>();
const fontLoaders = new Map<string, Promise<Font>>();
const objectFontCache = new WeakMap<object, Font>();
const objectFontLoaders = new WeakMap<object, Promise<Font>>();
const sourceFontLoaders = new WeakMap<Extract<TextTraceFontSource, (...args: never[]) => unknown>, Promise<Font>>();
const wawoff2Loaders = new Map<string, Promise<TextTraceWawoff2Module>>();
let polygonUnionLoader: Promise<PolygonUnion> | undefined;

export async function loadTextTraceFont(options: LoadTextTraceFontOptions): Promise<TextTraceFont> {
  const { source } = options;
  const woff2Url = options.woff2?.url ?? DEFAULT_WAWOFF2_URL;
  const woff2 = options.woff2?.module;

  if (typeof source === 'function') {
    const existing = sourceFontLoaders.get(source);
    if (existing) return existing;

    const loader = (async () => loadResolvedTextTraceFont(await source(), woff2Url, woff2))();
    sourceFontLoaders.set(source, loader);
    try {
      return await loader;
    } finally {
      sourceFontLoaders.delete(source);
    }
  }

  return loadResolvedTextTraceFont(source, woff2Url, woff2);
}

async function loadResolvedTextTraceFont(
  resolvedSource: TextTraceFontData,
  wawoff2Url: string,
  wawoff2?: TextTraceWawoff2Source
): Promise<TextTraceFont> {
  if (isOpenTypeFont(resolvedSource)) return resolvedSource;

  const objectCacheKey = typeof resolvedSource === 'object' ? resolvedSource : undefined;
  if (objectCacheKey) {
    const cached = objectFontCache.get(objectCacheKey);
    if (cached) return cached;

    const existing = objectFontLoaders.get(objectCacheKey);
    if (existing) return existing;
  }

  const cacheKey = typeof resolvedSource === 'string' ? resolvedSource : undefined;
  const cached = cacheKey ? fontCache.get(cacheKey) : undefined;
  if (cached) return cached;

  const existing = cacheKey ? fontLoaders.get(cacheKey) : undefined;
  if (existing) return existing;

  const loader = (async () => {
    const buffer = await loadFontBuffer(resolvedSource);
    let parsedBuffer: ArrayBuffer = buffer;

    if (isWoff2Buffer(buffer)) {
      const module = await ensureWawoff2(wawoff2Url, wawoff2);
      if (!module.decompress) {
        throw new Error('wawoff2 initialized without decompress');
      }
      const decompressed = await module.decompress(new Uint8Array(buffer));
      if (decompressed === false) {
        throw new Error('wawoff2 failed to decompress font');
      }
      const fontBuffer = new ArrayBuffer(decompressed.byteLength);
      new Uint8Array(fontBuffer).set(decompressed);
      parsedBuffer = fontBuffer;
    }

    const font = opentype.parse(parsedBuffer);
    if (cacheKey) fontCache.set(cacheKey, font);
    if (objectCacheKey) objectFontCache.set(objectCacheKey, font);
    return font;
  })();

  if (cacheKey) fontLoaders.set(cacheKey, loader);
  if (objectCacheKey) objectFontLoaders.set(objectCacheKey, loader);

  try {
    return await loader;
  } finally {
    if (cacheKey) fontLoaders.delete(cacheKey);
    if (objectCacheKey) objectFontLoaders.delete(objectCacheKey);
  }
}

export async function createTextTraceLayout(options: TextTraceLayoutOptions): Promise<TextTracePathResult> {
  const style = resolveStyleOptions(options.style);
  const text = options.text || DEFAULT_TEXT;
  const layout = layoutText(options.font, text);
  const polygonUnion = style.mergeOverlappingShapes ? await loadPolygonUnion() : undefined;
  const resolveStyle = createGlyphStyleResolver(style);

  return {
    viewBox: layout.viewBox,
    width: layout.viewBoxWidth,
    height: layout.viewBoxHeight,
    charCount: layout.charCount,
    topY: layout.topY,
    bottomY: layout.bottomY,
    xL: layout.xL,
    xR: layout.xR,
    paths: layout.visibleItems.map((item) => ({
      index: item.index,
      text: item.ch,
      d: getGlyphPathData(item.path, style, polygonUnion),
      bbox: {
        x1: item.bbox.x1,
        y1: item.bbox.y1,
        x2: item.bbox.x2,
        y2: item.bbox.y2
      },
      style: resolveStyle(item.index),
      fillRule: style.mergeOverlappingShapes ? 'evenodd' : undefined
    }))
  };
}

export const getTextTracePaths = createTextTraceLayout;

export function createTextTrace(svg: SVGSVGElement, options: TextTraceRenderOptions = {}): TextTraceController {
  return new TextTrace(svg, options);
}

export class TextTrace implements TextTraceController {
  private options: ResolvedTextTraceOptions;
  private timers: number[] = [];
  private timerBatches = new Map<number, Array<{ fn: () => void; phase?: TextTracePhase }>>();
  private runId = 0;
  private destroyed = false;

  constructor(private readonly svg: SVGSVGElement, options: TextTraceRenderOptions = {}) {
    this.options = mergeOptions(DEFAULT_OPTIONS, options);
    this.svg.setAttribute('viewBox', TEXT_TRACE_VIEW_BOX);
    this.svg.setAttribute('xmlns', SVG_NS);
    this.applyAccessibility(this.options.content.text);
  }

  async render(options: TextTraceRenderOptions = {}): Promise<void> {
    this.options = mergeOptions(this.options, options);

    const runId = ++this.runId;
    this.clearTimers();
    this.svg.replaceChildren();
    this.svg.style.color = this.options.style.textColor;
    this.svg.style.transform = 'scale(1)';
    this.setPhase('idle');

    const text = this.options.content.text || DEFAULT_TEXT;
    const timing = resolveTiming(this.options.animation.duration, this.options.animation.timing);
    const verticalGuideOvershoot = Math.max(0, this.options.guide.verticalOvershoot);
    const verticalGuideProbability = clampProbability(this.options.guide.verticalProbability);
    const guideTailLength = GUIDE_TAIL_LENGTH;
    this.applyAccessibility(text);

    if (!this.options.content.font) {
      this.fail({
        code: 'missing-font',
        message: 'TextTrace requires content.font. Load a font with loadTextTraceFont() before rendering.'
      });
      return;
    }

    if (!this.isCurrent(runId)) return;

    let layout: TextTracePathResult;
    try {
      layout = await createTextTraceLayout({
        text,
        font: this.options.content.font,
        style: this.options.style
      });
    } catch (cause) {
      this.fail({
        code: 'render-failed',
        message: cause instanceof Error ? cause.message : String(cause),
        cause
      });
      return;
    }
    if (!this.isCurrent(runId)) return;
    this.drawLayout(runId, layout, timing, verticalGuideOvershoot, verticalGuideProbability, guideTailLength);
  }

  update(options: TextTraceRenderOptions): Promise<void> {
    return this.render(options);
  }

  setContent(content: TextTraceContentOptions): Promise<void> {
    return this.render({ content });
  }

  setStyle(style: TextTraceStyleOptions): Promise<void> {
    return this.render({ style });
  }

  setAnimation(animation: TextTraceAnimationOptions): Promise<void> {
    return this.render({ animation });
  }

  play(): Promise<void> {
    return this.render();
  }

  replay(): Promise<void> {
    return this.render();
  }

  async renderLayout(layout: TextTracePathResult, options: TextTraceRenderOptions = {}): Promise<void> {
    this.options = mergeOptions(this.options, options);

    const runId = ++this.runId;
    this.clearTimers();
    this.svg.replaceChildren();
    this.svg.style.color = this.options.style.textColor;
    this.svg.style.transform = 'scale(1)';
    this.setPhase('idle');

    const timing = resolveTiming(this.options.animation.duration, this.options.animation.timing);
    const verticalGuideOvershoot = Math.max(0, this.options.guide.verticalOvershoot);
    const verticalGuideProbability = clampProbability(this.options.guide.verticalProbability);
    const guideTailLength = GUIDE_TAIL_LENGTH;
    this.applyAccessibility(this.options.content.text);

    this.drawLayout(runId, layout, timing, verticalGuideOvershoot, verticalGuideProbability, guideTailLength);
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimers();
    this.svg.replaceChildren();
  }

  private drawLayout(
    runId: number,
    layout: TextTracePathResult,
    timing: ResolvedTextTraceTiming,
    verticalGuideOvershoot: number,
    verticalGuideProbability: number,
    guideTailLength: number
  ): void {
    const text = this.options.content.text || DEFAULT_TEXT;
    this.svg.setAttribute('viewBox', layout.viewBox);
    const resolveStyle = createGlyphStyleResolver(this.options.style);
    const fragment = this.svg.ownerDocument.createDocumentFragment();

    const topLine = this.el('path', {
      d: makeLinePath(layout.xL, layout.topY, layout.xR + guideTailLength, layout.topY),
      fill: 'none',
      stroke: this.options.style.guideColor,
      'stroke-width': 0.6,
      opacity: 0.55
    });
    fragment.appendChild(topLine);
    setupUnifiedWipe(topLine);

    const bottomLine = this.el('path', {
      d: makeLinePath(layout.xR, layout.bottomY, layout.xL - guideTailLength, layout.bottomY),
      fill: 'none',
      stroke: this.options.style.guideColor,
      'stroke-width': 0.6,
      opacity: 0.55
    });
    fragment.appendChild(bottomLine);
    setupUnifiedWipe(bottomLine);

    topLine.style.transition = `stroke-dashoffset ${timing.horizontalDuration}ms cubic-bezier(.5,.05,.2,1)`;
    bottomLine.style.transition = `stroke-dashoffset ${timing.horizontalDuration}ms cubic-bezier(.5,.05,.2,1)`;

    this.later(runId, () => {
      topLine.setAttribute('stroke-dashoffset', '0');
      bottomLine.setAttribute('stroke-dashoffset', '0');
    }, timing.horizontalDelay, 'drawing-guides');

    const allCharGuides: Array<{ node: SVGPathElement; eraseDur: number }> = [];

    const firstVisibleIndex = layout.paths[0]?.index ?? -1;

    layout.paths.forEach(({ index, text: ch, d, bbox, fillRule }) => {
      const glyphStyle = resolveStyle(index);
      const charIsCJK = isCJK(ch);
      const wantCircle = shouldHaveCircle(ch, index, charIsCJK);

      const guideDelay = index * timing.guideStagger;
      const strokeDelay = index * timing.strokeStagger;
      const verticalGuideTopY = bbox.y1 - verticalGuideOvershoot;
      const verticalGuideBottomY = bbox.y2 + verticalGuideOvershoot;

      [bbox.x1, bbox.x2].forEach((vx, side) => {
        if (!shouldDrawVerticalGuide(this.options.guide.seed, text, index, side, verticalGuideProbability)) return;

        const guide = this.el('path', {
          d: makeLinePath(vx, verticalGuideBottomY, vx, verticalGuideTopY - guideTailLength),
          fill: 'none',
          stroke: glyphStyle.guideColor,
          'stroke-width': 0.5,
          opacity: 0.45
        });
        fragment.appendChild(guide);
        setupUnifiedWipe(guide);
        guide.style.transition = `stroke-dashoffset ${timing.guideDuration}ms ease`;
        allCharGuides.push({ node: guide, eraseDur: timing.guideEraseDuration });
        this.later(runId, () => guide.setAttribute('stroke-dashoffset', '0'), timing.guideDelay + guideDelay);
      });

      if (wantCircle) {
        const cx = (bbox.x1 + bbox.x2) / 2;
        const cy = (bbox.y1 + bbox.y2) / 2;
        const r = Math.max(bbox.x2 - bbox.x1, bbox.y2 - bbox.y1) / 2 + (charIsCJK ? 3 : 2);
        const circle = this.el('path', {
          d: `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r}`,
          fill: 'none',
          stroke: glyphStyle.guideColor,
          'stroke-width': 0.6,
          opacity: 0.5
        });
        fragment.appendChild(circle);
        setupUnifiedWipe(circle);
        circle.style.transition = `stroke-dashoffset ${timing.circleDuration}ms cubic-bezier(.5,.05,.2,1)`;
        allCharGuides.push({ node: circle, eraseDur: timing.circleEraseDuration });
        this.later(runId, () => circle.setAttribute('stroke-dashoffset', '0'), timing.circleDelay + guideDelay);
      }

      const charAttrs: Record<string, string | number> = {
        d,
        fill: glyphStyle.textColor,
        'fill-opacity': 0,
        stroke: glyphStyle.textColor,
        'stroke-width': charIsCJK ? 0.9 : 1.1,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        pathLength: NORM_LEN,
        'stroke-dasharray': `${NORM_LEN} ${NORM_LEN * 2}`,
        'stroke-dashoffset': NORM_LEN
      };
      if (fillRule) {
        charAttrs['fill-rule'] = fillRule;
      }

      const charPath = this.el('path', charAttrs);
      charPath.style.transition = `stroke-dashoffset ${timing.strokeDuration}ms cubic-bezier(.45,.05,.3,1), fill-opacity ${timing.fillDuration}ms ease`;
      fragment.appendChild(charPath);

      const isFirstVisible = index === firstVisibleIndex;
      this.later(
        runId,
        () => charPath.setAttribute('stroke-dashoffset', '0'),
        timing.strokeDelay + strokeDelay,
        isFirstVisible ? 'stroking' : undefined
      );
      this.later(
        runId,
        () => charPath.setAttribute('fill-opacity', '1'),
        timing.fillDelay + strokeDelay,
        isFirstVisible ? 'filling' : undefined
      );

    });

    this.svg.appendChild(fragment);

    this.later(runId, () => {
      allCharGuides.forEach((guide) => {
        guide.node.style.transition = `stroke-dashoffset ${guide.eraseDur}ms cubic-bezier(.4,.05,.3,1)`;
        guide.node.setAttribute('stroke-dashoffset', String(-NORM_LEN));
      });
    }, timing.eraseDelay, 'erasing-guides');

    this.later(runId, () => {
      topLine.style.transition = `stroke-dashoffset ${timing.horizontalEraseDuration}ms cubic-bezier(.4,.05,.3,1)`;
      bottomLine.style.transition = `stroke-dashoffset ${timing.horizontalEraseDuration}ms cubic-bezier(.4,.05,.3,1)`;
      topLine.setAttribute('stroke-dashoffset', String(-NORM_LEN));
      bottomLine.setAttribute('stroke-dashoffset', String(-NORM_LEN));
    }, timing.horizontalEraseDelay);

    this.later(runId, () => {
      this.setPhase('done');
    }, getDoneDelay(timing, layout.charCount));
  }

  private el<T extends keyof SVGElementTagNameMap>(
    tag: T,
    attrs: Record<string, string | number>
  ): SVGElementTagNameMap[T] {
    const element = this.svg.ownerDocument.createElementNS(SVG_NS, tag) as SVGElementTagNameMap[T];
    Object.entries(attrs).forEach(([key, value]) => {
      element.setAttribute(key, String(value));
    });
    return element;
  }

  private later(runId: number, fn: () => void, ms: number, phase?: TextTracePhase): void {
    const delay = Math.max(0, ms);
    const key = delay;
    const batch = this.timerBatches.get(key);
    if (batch) {
      batch.push({ fn, phase });
      return;
    }

    this.timerBatches.set(key, [{ fn, phase }]);
    this.timers.push(window.setTimeout(() => {
      const callbacks = this.timerBatches.get(key) ?? [];
      this.timerBatches.delete(key);
      if (!this.isCurrent(runId)) return;
      callbacks.forEach((callback) => {
        if (callback.phase) this.setPhase(callback.phase);
        callback.fn();
      });
    }, delay));
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
    this.timerBatches.clear();
  }

  private setPhase(phase: TextTracePhase): void {
    this.options.events.onPhaseChange?.(phase);
  }

  private fail(error: TextTraceError): void {
    this.setPhase('error');
    this.options.events.onError?.(error);
  }

  private applyAccessibility(text: string): void {
    removeSvgTitles(this.svg);

    if (this.options.accessibility.decorative) {
      this.svg.setAttribute('aria-hidden', 'true');
      this.svg.removeAttribute('aria-label');
      this.svg.removeAttribute('role');
      return;
    }

    const label = resolveAccessibleLabel(this.options.accessibility.ariaLabel, text);
    this.svg.removeAttribute('aria-hidden');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', label);

    const title = this.el('title', {});
    title.textContent = label;
    this.svg.appendChild(title);
  }

  private isCurrent(runId: number): boolean {
    return !this.destroyed && runId === this.runId;
  }
}

function ensureWawoff2(
  url: string | undefined,
  source?: TextTraceWawoff2Source
): Promise<TextTraceWawoff2Module> {
  if (source) return resolveWawoff2Source(source);
  if (!url) {
    return Promise.reject(new Error('woff2.url or woff2.module is required for WOFF2 fonts'));
  }

  const existing = wawoff2Loaders.get(url);
  if (existing) return existing;

  const loader = new Promise<TextTraceWawoff2Module>((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('wawoff2 requires a browser environment'));
      return;
    }

    if (window.Module?.decompress) {
      resolve(window.Module);
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onerror = () => reject(new Error('wawoff2 load failed'));

    window.Module = {
      onRuntimeInitialized: () => {
        if (window.Module?.decompress) {
          resolve(window.Module);
        } else {
          reject(new Error('wawoff2 initialized without decompress'));
        }
      }
    };

    document.head.appendChild(script);
  });

  wawoff2Loaders.set(url, loader);
  return loader;
}

function loadPolygonUnion(): Promise<PolygonUnion> {
  if (!polygonUnionLoader) {
    polygonUnionLoader = import('polygon-clipping').then((module) => {
      const namespace = module as typeof import('polygon-clipping') & {
        default?: typeof import('polygon-clipping');
      };
      const polygonUnion = namespace.union ?? namespace.default?.union;
      if (!polygonUnion) {
        throw new Error('polygon-clipping loaded without union');
      }
      return polygonUnion;
    });
  }
  return polygonUnionLoader;
}

function mergeOptions(base: ResolvedTextTraceOptions, options: TextTraceRenderOptions): ResolvedTextTraceOptions {
  return {
    content: {
      ...base.content,
      ...options.content,
      text: options.content?.text ?? base.content.text
    },
    style: resolveStyleOptions(options.style, base.style),
    guide: {
      ...base.guide,
      ...options.guide,
      verticalOvershoot: options.guide?.verticalOvershoot ?? base.guide.verticalOvershoot,
      verticalProbability: options.guide?.verticalProbability ?? base.guide.verticalProbability,
      seed: options.guide && 'seed' in options.guide ? options.guide.seed : base.guide.seed
    },
    animation: {
      duration: options.animation?.duration ?? base.animation.duration,
      timing: {
        ...base.animation.timing,
        ...options.animation?.timing
      }
    },
    accessibility: {
      ariaLabel: options.accessibility && 'ariaLabel' in options.accessibility
        ? options.accessibility.ariaLabel ?? null
        : base.accessibility.ariaLabel,
      decorative: options.accessibility?.decorative ?? base.accessibility.decorative
    },
    events: {
      ...base.events,
      ...options.events
    }
  };
}

function resolveStyleOptions(
  style: TextTraceStyleOptions | undefined,
  base: ResolvedTextTraceStyle = DEFAULT_OPTIONS.style
): ResolvedTextTraceStyle {
  return {
    textColor: style?.textColor ?? base.textColor,
    guideColor: style?.guideColor ?? base.guideColor,
    glyphStyles: style?.glyphStyles ?? base.glyphStyles,
    mergeOverlappingShapes: style?.mergeOverlappingShapes ?? base.mergeOverlappingShapes,
    mergeCurveSegments: style?.mergeCurveSegments ?? base.mergeCurveSegments
  };
}

interface TextTraceLayoutItem {
  index: number;
  ch: string;
  path: Path;
  bbox: BoundingBox;
  charIsCJK: boolean;
  wantCircle: boolean;
}

interface TextTraceLayout {
  viewBox: string;
  viewBoxWidth: number;
  viewBoxHeight: number;
  charCount: number;
  topY: number;
  bottomY: number;
  xL: number;
  xR: number;
  visibleItems: TextTraceLayoutItem[];
}

async function resolveWawoff2Source(source: TextTraceWawoff2Source): Promise<TextTraceWawoff2Module> {
  return typeof source === 'function' ? source() : source;
}

async function loadFontBuffer(source: Exclude<TextTraceFontData, Font>): Promise<ArrayBuffer> {
  if (typeof source === 'string') {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Font request failed: ${response.status}`);
    }
    return response.arrayBuffer();
  }

  if (source instanceof ArrayBuffer) {
    return source.slice(0);
  }

  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy.buffer;
}

function isOpenTypeFont(source: TextTraceFontData): source is Font {
  return typeof source === 'object' &&
    source !== null &&
    'charToGlyph' in source &&
    'unitsPerEm' in source;
}

function isWoff2Buffer(buffer: ArrayBuffer): boolean {
  const signature = new Uint8Array(buffer, 0, Math.min(buffer.byteLength, 4));
  return signature[0] === 0x77 &&
    signature[1] === 0x4f &&
    signature[2] === 0x46 &&
    signature[3] === 0x32;
}

function layoutText(font: Font, text: string): TextTraceLayout {
  const chars = Array.from(text);
  const hasCJK = chars.some(isCJK);
  const fontSize = hasCJK ? 110 : 140;
  const upm = font.unitsPerEm;
  const ascender = (font.ascender / upm) * fontSize;
  const glyphs = chars.map((ch) => font.charToGlyph(ch));
  const advances = glyphs.map((glyph) => ((glyph.advanceWidth ?? upm) / upm) * fontSize);

  const totalWidth = advances.reduce((sum, advance) => sum + advance, 0);

  const guidePadX = 24;
  const viewBoxWidth = Math.max(WIDTH, totalWidth + (guidePadX + VIEW_BOX_PAD_X) * 2);
  const viewBoxHeight = HEIGHT + VIEW_BOX_PAD_Y * 2;
  const viewBox = `0 ${-VIEW_BOX_PAD_Y} ${viewBoxWidth} ${viewBoxHeight}`;

  const startX = (viewBoxWidth - totalWidth) / 2;
  const baselineY = hasCJK ? 165 : 175;
  const metricTopY = baselineY - ascender;
  let cursorX = startX;

  const glyphItems = chars.map((ch, index) => {
    const glyph = glyphs[index];
    const advance = advances[index];
    const path = glyph.getPath(cursorX, baselineY, fontSize);
    const bbox = path.getBoundingBox();
    const charIsCJK = isCJK(ch);
    const item = {
      index,
      ch,
      path,
      bbox,
      charIsCJK,
      wantCircle: shouldHaveCircle(ch, index, charIsCJK)
    };
    cursorX += advance;
    return item;
  });

  const visibleItems = glyphItems.filter((item) => isFiniteBoundingBox(item.bbox));
  let topY = metricTopY;
  if (visibleItems.length > 0) {
    topY = Number.POSITIVE_INFINITY;
    visibleItems.forEach((item) => {
      topY = Math.min(topY, item.bbox.y1);
    });
    topY -= HORIZONTAL_GUIDE_PAD_Y;
  }
  const bottomY = baselineY;

  return {
    viewBox,
    viewBoxWidth,
    viewBoxHeight,
    charCount: chars.length,
    topY,
    bottomY,
    xL: startX - guidePadX,
    xR: startX + totalWidth + guidePadX,
    visibleItems
  };
}

function getGlyphPathData(path: Path, style: ResolvedTextTraceStyle, polygonUnion: PolygonUnion | undefined): string {
  return style.mergeOverlappingShapes
    ? mergeOverlappingPathData(path, style.mergeCurveSegments, polygonUnion)
    : path.toPathData(2);
}

function createGlyphStyleResolver(styleOptions: ResolvedTextTraceStyle): (index: number) => Required<TextTraceGlyphStyle> {
  const rules = styleOptions.glyphStyles.map(compileGlyphStyleRule);

  return (index) => {
    const style: Required<TextTraceGlyphStyle> = {
      textColor: styleOptions.textColor,
      guideColor: styleOptions.guideColor
    };

    rules.forEach((rule) => {
      if (!rule.matches(index)) return;
      style.textColor = rule.style.textColor ?? style.textColor;
      style.guideColor = rule.style.guideColor ?? style.guideColor;
    });

    return style;
  };
}

function compileGlyphStyleRule(rule: TextTraceGlyphStyleRule): CompiledGlyphStyleRule {
  if ('at' in rule) {
    if (Array.isArray(rule.at)) {
      const indexes = new Set(rule.at);
      return {
        style: rule.style,
        matches: (index) => indexes.has(index)
      };
    }

    return {
      style: rule.style,
      matches: (index) => rule.at === index
    };
  }

  return {
    style: rule.style,
    matches: (index) => index >= rule.from && index < rule.to
  };
}

function resolveAccessibleLabel(ariaLabel: string | null, text: string): string {
  const label = ariaLabel ?? text;
  return label.trim() || DEFAULT_TEXT;
}

function removeSvgTitles(svg: SVGSVGElement): void {
  Array.from(svg.children).forEach((child) => {
    if (child.tagName.toLowerCase() === 'title') {
      child.remove();
    }
  });
}

function resolveTiming(duration: number, timing: TextTraceTiming): ResolvedTextTraceTiming {
  const scaledDuration = numberOrDefault(duration, DEFAULT_DURATION);
  const horizontalDelay = fractionOrDefault(timing.horizontal, DEFAULT_TIMING.horizontal) * scaledDuration;
  const guideDelay = fractionOrDefault(timing.guide, DEFAULT_TIMING.guide) * scaledDuration;
  const strokeDelay = fractionOrDefault(timing.stroke, DEFAULT_TIMING.stroke) * scaledDuration;
  const fillDelay = fractionOrDefault(timing.fill, DEFAULT_TIMING.fill) * scaledDuration;
  const eraseDelay = fractionOrDefault(timing.erase, DEFAULT_TIMING.erase) * scaledDuration;

  return {
    horizontalDelay,
    horizontalDuration: scaledDuration * TIMING_RATIOS.horizontalDuration,
    guideDelay,
    guideStagger: scaledDuration * TIMING_RATIOS.guideStagger,
    guideDuration: scaledDuration * TIMING_RATIOS.guideDuration,
    circleDelay: guideDelay + scaledDuration * TIMING_RATIOS.circleOffset,
    circleDuration: scaledDuration * TIMING_RATIOS.circleDuration,
    strokeDelay,
    strokeStagger: scaledDuration * TIMING_RATIOS.strokeStagger,
    strokeDuration: scaledDuration * TIMING_RATIOS.strokeDuration,
    fillDelay,
    fillDuration: scaledDuration * TIMING_RATIOS.fillDuration,
    eraseDelay,
    guideEraseDuration: scaledDuration * TIMING_RATIOS.guideEraseDuration,
    circleEraseDuration: scaledDuration * TIMING_RATIOS.circleEraseDuration,
    horizontalEraseDelay: eraseDelay,
    horizontalEraseDuration: scaledDuration * TIMING_RATIOS.horizontalEraseDuration
  };
}

function numberOrDefault(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, value);
}

function fractionOrDefault(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function shouldDrawVerticalGuide(
  seed: string | number | null | undefined,
  text: string,
  index: number,
  side: number,
  probability: number
): boolean {
  if (probability <= 0) return false;
  if (probability >= 1) return true;
  if (seed === null) return Math.random() < probability;

  return seededUnit(`${seed ?? text}:${index}:${side}`) < probability;
}

function seededUnit(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0x100000000;
}

function isFiniteBoundingBox(bbox: BoundingBox): boolean {
  return Number.isFinite(bbox.x1) &&
    Number.isFinite(bbox.y1) &&
    Number.isFinite(bbox.x2) &&
    Number.isFinite(bbox.y2) &&
    bbox.x2 > bbox.x1 &&
    bbox.y2 > bbox.y1;
}

function getDoneDelay(timing: ResolvedTextTraceTiming, charCount: number): number {
  const lastGuideOffset = Math.max(0, charCount - 1) * timing.guideStagger;
  const lastStrokeOffset = Math.max(0, charCount - 1) * timing.strokeStagger;

  return Math.max(
    timing.horizontalDelay + timing.horizontalDuration,
    timing.guideDelay + lastGuideOffset + timing.guideDuration,
    timing.circleDelay + lastGuideOffset + timing.circleDuration,
    timing.strokeDelay + lastStrokeOffset + timing.strokeDuration,
    timing.fillDelay + lastStrokeOffset + timing.fillDuration,
    timing.eraseDelay + Math.max(timing.guideEraseDuration, timing.circleEraseDuration),
    timing.horizontalEraseDelay + timing.horizontalEraseDuration
  ) + 200;
}

function mergeOverlappingPathData(path: Path, curveSegments: number, polygonUnion: PolygonUnion | undefined): string {
  if (!polygonUnion) return path.toPathData(2);

  const rings = pathToRings(path, curveSegments);
  const polygons = ringsToPolygons(rings);
  if (polygons.length === 0) return path.toPathData(2);

  let merged: MultiPolygon;
  try {
    merged = polygonUnion(polygons);
  } catch {
    return path.toPathData(2);
  }

  if (merged.length === 0) return path.toPathData(2);

  return multiPolygonToPathData(merged);
}

function pathToRings(path: Path, curveSegments: number): Ring[] {
  const segments = Math.max(4, Math.round(numberOrDefault(curveSegments, 12)));
  const rings: Ring[] = [];
  let current: Ring = [];
  let cursor: [number, number] = [0, 0];
  let start: [number, number] = [0, 0];

  const pushCurrent = () => {
    const ring = closeRing(current);
    if (ring) rings.push(ring);
    current = [];
  };

  path.commands.forEach((command) => {
    switch (command.type) {
      case 'M':
        pushCurrent();
        cursor = [command.x, command.y];
        start = cursor;
        current.push(cursor);
        break;
      case 'L':
        cursor = [command.x, command.y];
        current.push(cursor);
        break;
      case 'Q': {
        const from = cursor;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          current.push([
            quadraticAt(from[0], command.x1, command.x, t),
            quadraticAt(from[1], command.y1, command.y, t)
          ]);
        }
        cursor = [command.x, command.y];
        break;
      }
      case 'C': {
        const from = cursor;
        for (let i = 1; i <= segments; i++) {
          const t = i / segments;
          current.push([
            cubicAt(from[0], command.x1, command.x2, command.x, t),
            cubicAt(from[1], command.y1, command.y2, command.y, t)
          ]);
        }
        cursor = [command.x, command.y];
        break;
      }
      case 'Z':
        current.push(start);
        pushCurrent();
        break;
    }
  });

  pushCurrent();
  return rings;
}

function ringsToPolygons(rings: Ring[]): MultiPolygon {
  const infos = rings
    .map((ring) => {
      const signedArea = ringArea(ring);
      return {
        ring,
        signedArea,
        area: Math.abs(signedArea)
      };
    })
    .filter((info) => info.area > 0.01);

  if (infos.length === 0) return [];

  const largest = infos.reduce((current, next) => (next.area > current.area ? next : current));
  const solidSign = Math.sign(largest.signedArea) || 1;
  const outerInfos = infos.filter((info) => Math.sign(info.signedArea) === solidSign);
  const polygons: Polygon[] = outerInfos.map((info) => [info.ring]);

  infos
    .filter((info) => Math.sign(info.signedArea) !== solidSign)
    .forEach((hole) => {
      const point = ringSamplePoint(hole.ring);
      let targetIndex = -1;
      let targetArea = Number.POSITIVE_INFINITY;

      outerInfos.forEach((outer, index) => {
        if (outer.area < targetArea && outer.area > hole.area && pointInRing(point, outer.ring)) {
          targetIndex = index;
          targetArea = outer.area;
        }
      });

      if (targetIndex >= 0) {
        polygons[targetIndex].push(hole.ring);
      } else {
        polygons.push([hole.ring]);
      }
    });

  return polygons;
}

function multiPolygonToPathData(multiPolygon: MultiPolygon): string {
  return multiPolygon
    .flatMap((polygon) => polygon.map(ringToPathData))
    .filter(Boolean)
    .join(' ');
}

function ringToPathData(ring: Ring): string {
  const points = stripClosingPoint(ring);
  if (points.length < 3) return '';

  const [first, ...rest] = points;
  return `M ${formatNumber(first[0])} ${formatNumber(first[1])} ${rest
    .map((point) => `L ${formatNumber(point[0])} ${formatNumber(point[1])}`)
    .join(' ')} Z`;
}

function closeRing(points: Ring): Ring | null {
  const cleaned = stripDuplicatePoints(points);
  if (cleaned.length < 3) return null;

  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  if (!samePoint(first, last)) {
    cleaned.push([first[0], first[1]]);
  }

  return Math.abs(ringArea(cleaned)) > 0.01 ? cleaned : null;
}

function stripDuplicatePoints(points: Ring): Ring {
  const cleaned: Ring = [];
  points.forEach((point) => {
    const previous = cleaned[cleaned.length - 1];
    if (!previous || !samePoint(previous, point)) {
      cleaned.push([point[0], point[1]]);
    }
  });
  return cleaned;
}

function stripClosingPoint(ring: Ring): Ring {
  if (ring.length > 1 && samePoint(ring[0], ring[ring.length - 1])) {
    return ring.slice(0, -1);
  }
  return ring;
}

function samePoint(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) < 0.001 && Math.abs(a[1] - b[1]) < 0.001;
}

function ringArea(ring: Ring): number {
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const current = ring[i];
    const next = ring[i + 1];
    area += current[0] * next[1] - next[0] * current[1];
  }
  return area / 2;
}

function ringSamplePoint(ring: Ring): [number, number] {
  const points = stripClosingPoint(ring);
  const totals = points.reduce<[number, number]>((sum, point) => [
    sum[0] + point[0],
    sum[1] + point[1]
  ], [0, 0]);
  return [totals[0] / points.length, totals[1] / points.length];
}

function pointInRing(point: [number, number], ring: Ring): boolean {
  let inside = false;
  const points = stripClosingPoint(ring);

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const current = points[i];
    const previous = points[j];
    const crosses = (current[1] > point[1]) !== (previous[1] > point[1]);
    if (!crosses) continue;

    const x = ((previous[0] - current[0]) * (point[1] - current[1])) / (previous[1] - current[1]) + current[0];
    if (point[0] < x) inside = !inside;
  }

  return inside;
}

function quadraticAt(p0: number, p1: number, p2: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function setupUnifiedWipe(node: SVGPathElement): void {
  node.setAttribute('pathLength', String(NORM_LEN));
  node.setAttribute('stroke-dasharray', `${NORM_LEN} ${NORM_LEN * 2}`);
  node.setAttribute('stroke-dashoffset', String(NORM_LEN));
}

function makeLinePath(x1: number, y1: number, x2: number, y2: number): string {
  return `M ${x1} ${y1} L ${x2} ${y2}`;
}

function isCJK(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0;
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3040 && code <= 0x30ff) ||
    (code >= 0x3400 && code <= 0x4dbf)
  );
}

function shouldHaveCircle(ch: string, index: number, isCharCJK: boolean): boolean {
  if (isCharCJK) return index === 0;
  return ROUND_LATIN.has(ch);
}
