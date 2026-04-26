import opentype from 'opentype.js';
import { union } from 'polygon-clipping';
import type { BoundingBox, Font, Path } from 'opentype.js';
import type { MultiPolygon, Polygon, Ring } from 'polygon-clipping';

export type TextTraceFontKey = 'inter' | 'garamond' | 'noto-sc' | 'noto-jp';

export interface TextTraceTiming {
  horizontal?: number;
  guide?: number;
  stroke?: number;
  fill?: number;
  erase?: number;
}

export interface TextTraceOptions {
  text?: string;
  fontKey?: TextTraceFontKey | string;
  textColor?: string;
  guideColor?: string;
  duration?: number;
  timing?: TextTraceTiming;
  verticalGuideOvershoot?: number;
  verticalGuideProbability?: number;
  mergeOverlappingShapes?: boolean;
  mergeCurveSegments?: number;
  fontUrls?: Partial<Record<TextTraceFontKey | string, string>>;
  wawoff2Url?: string;
  onPhaseChange?: (phase: string) => void;
}

export interface TextTraceController {
  render(options?: TextTraceOptions): Promise<void>;
  update(options: TextTraceOptions): Promise<void>;
  replay(): Promise<void>;
  destroy(): void;
}

type ResolvedTextTraceOptions = Required<
  Pick<
    TextTraceOptions,
    | 'text'
    | 'fontKey'
    | 'textColor'
    | 'guideColor'
    | 'duration'
    | 'verticalGuideOvershoot'
    | 'verticalGuideProbability'
    | 'mergeOverlappingShapes'
    | 'mergeCurveSegments'
    | 'wawoff2Url'
  >
> & {
  timing: TextTraceTiming;
  fontUrls: Record<string, string>;
  onPhaseChange?: (phase: string) => void;
};

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

interface Wawoff2Module {
  decompress?: (input: Uint8Array) => Uint8Array;
  onRuntimeInitialized?: () => void;
}

declare global {
  interface Window {
    Module?: Wawoff2Module;
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

const DEFAULT_OPTIONS: ResolvedTextTraceOptions = {
  text: DEFAULT_TEXT,
  fontKey: 'noto-sc',
  textColor: '#111827',
  guideColor: '#111827',
  duration: DEFAULT_DURATION,
  timing: {},
  verticalGuideOvershoot: 28,
  verticalGuideProbability: 0.45,
  mergeOverlappingShapes: false,
  mergeCurveSegments: 12,
  fontUrls: TEXT_TRACE_FONT_URLS,
  wawoff2Url: DEFAULT_WAWOFF2_URL
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

const fontCache = new Map<string, Font>();
const wawoff2Loaders = new Map<string, Promise<Wawoff2Module>>();

export async function loadTextTraceFont(
  fontKey: string,
  fontUrls: Record<string, string> = TEXT_TRACE_FONT_URLS,
  wawoff2Url = DEFAULT_WAWOFF2_URL
): Promise<Font> {
  const url = fontUrls[fontKey];
  if (!url) {
    throw new Error(`Unknown font: ${fontKey}`);
  }

  const cacheKey = `${fontKey}:${url}`;
  const cached = fontCache.get(cacheKey);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Font request failed: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  let parsedBuffer = buffer;

  if (/\.woff2(?:$|\?)/.test(url)) {
    const module = await ensureWawoff2(wawoff2Url);
    if (!module.decompress) {
      throw new Error('wawoff2 initialized without decompress');
    }
    const decompressed = module.decompress(new Uint8Array(buffer));
    const fontBuffer = new ArrayBuffer(decompressed.byteLength);
    new Uint8Array(fontBuffer).set(decompressed);
    parsedBuffer = fontBuffer;
  }

  const font = opentype.parse(parsedBuffer);
  fontCache.set(cacheKey, font);
  return font;
}

export function createTextTrace(svg: SVGSVGElement, options: TextTraceOptions = {}): TextTraceController {
  return new TextTrace(svg, options);
}

export class TextTrace implements TextTraceController {
  private options: ResolvedTextTraceOptions;
  private timers: number[] = [];
  private runId = 0;
  private destroyed = false;

  constructor(private readonly svg: SVGSVGElement, options: TextTraceOptions = {}) {
    this.options = mergeOptions(DEFAULT_OPTIONS, options);
    this.svg.setAttribute('viewBox', TEXT_TRACE_VIEW_BOX);
    this.svg.setAttribute('xmlns', SVG_NS);
  }

  async render(options: TextTraceOptions = {}): Promise<void> {
    this.options = mergeOptions(this.options, options);

    const runId = ++this.runId;
    this.clearTimers();
    this.svg.innerHTML = '';
    this.svg.style.color = this.options.textColor;
    this.svg.style.transform = 'scale(1)';
    this.setPhase('');

    const text = this.options.text || DEFAULT_TEXT;
    const chars = Array.from(text);
    const timing = resolveTiming(this.options.duration, this.options.timing);
    const verticalGuideOvershoot = Math.max(0, this.options.verticalGuideOvershoot);
    const verticalGuideProbability = clampProbability(this.options.verticalGuideProbability);
    const guideTailLength = GUIDE_TAIL_LENGTH;

    let font: Font;
    try {
      this.setPhase('Loading font...');
      font = await loadTextTraceFont(this.options.fontKey, this.options.fontUrls, this.options.wawoff2Url);
    } catch (error) {
      this.setPhase(`Font load failed: ${error instanceof Error ? error.message : String(error)}`);
      return;
    }

    if (!this.isCurrent(runId)) return;

    const hasCJK = chars.some(isCJK);
    const fontSize = hasCJK ? 110 : 140;
    const upm = font.unitsPerEm;
    const ascender = (font.ascender / upm) * fontSize;

    let totalWidth = 0;
    for (const ch of chars) {
      const glyph = font.charToGlyph(ch);
      totalWidth += ((glyph.advanceWidth ?? upm) / upm) * fontSize;
    }

    const guidePadX = 24;
    const viewBoxWidth = Math.max(WIDTH, totalWidth + (guidePadX + VIEW_BOX_PAD_X) * 2);
    const viewBoxHeight = HEIGHT + VIEW_BOX_PAD_Y * 2;
    this.svg.setAttribute('viewBox', `0 ${-VIEW_BOX_PAD_Y} ${viewBoxWidth} ${viewBoxHeight}`);

    const startX = (viewBoxWidth - totalWidth) / 2;
    const baselineY = hasCJK ? 165 : 175;
    const metricTopY = baselineY - ascender;
    let cursorX = startX;
    const glyphItems = chars.map((ch, index) => {
      const glyph = font.charToGlyph(ch);
      const advance = ((glyph.advanceWidth ?? upm) / upm) * fontSize;
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
    const visibleBBoxes = glyphItems.map((item) => item.bbox).filter(isFiniteBoundingBox);
    const topY = visibleBBoxes.length > 0
      ? Math.min(...visibleBBoxes.map((bbox) => bbox.y1)) - HORIZONTAL_GUIDE_PAD_Y
      : metricTopY;
    const bottomY = baselineY;

    const xL = startX - guidePadX;
    const xR = startX + totalWidth + guidePadX;

    const topLine = this.el('path', {
      d: makeLinePath(xL, topY, xR + guideTailLength, topY),
      fill: 'none',
      stroke: this.options.guideColor,
      'stroke-width': 0.6,
      opacity: 0.55
    });
    this.svg.appendChild(topLine);
    setupUnifiedWipe(topLine);

    const bottomLine = this.el('path', {
      d: makeLinePath(xR, bottomY, xL - guideTailLength, bottomY),
      fill: 'none',
      stroke: this.options.guideColor,
      'stroke-width': 0.6,
      opacity: 0.55
    });
    this.svg.appendChild(bottomLine);
    setupUnifiedWipe(bottomLine);

    topLine.style.transition = `stroke-dashoffset ${timing.horizontalDuration}ms cubic-bezier(.5,.05,.2,1)`;
    bottomLine.style.transition = `stroke-dashoffset ${timing.horizontalDuration}ms cubic-bezier(.5,.05,.2,1)`;

    this.later(runId, () => {
      topLine.setAttribute('stroke-dashoffset', '0');
      bottomLine.setAttribute('stroke-dashoffset', '0');
    }, timing.horizontalDelay, 'Drawing guides');

    const allCharGuides: Array<{ node: SVGPathElement; eraseDur: number }> = [];

    glyphItems.forEach(({ index, path, bbox, charIsCJK, wantCircle }) => {

      const guideDelay = index * timing.guideStagger;
      const strokeDelay = index * timing.strokeStagger;
      const verticalGuideTopY = bbox.y1 - verticalGuideOvershoot;
      const verticalGuideBottomY = bbox.y2 + verticalGuideOvershoot;

      [bbox.x1, bbox.x2].forEach((vx) => {
        if (Math.random() >= verticalGuideProbability) return;

        const guide = this.el('path', {
          d: makeLinePath(vx, verticalGuideBottomY, vx, verticalGuideTopY - guideTailLength),
          fill: 'none',
          stroke: this.options.guideColor,
          'stroke-width': 0.5,
          opacity: 0.45
        });
        this.svg.appendChild(guide);
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
          stroke: this.options.guideColor,
          'stroke-width': 0.6,
          opacity: 0.5
        });
        this.svg.appendChild(circle);
        setupUnifiedWipe(circle);
        circle.style.transition = `stroke-dashoffset ${timing.circleDuration}ms cubic-bezier(.5,.05,.2,1)`;
        allCharGuides.push({ node: circle, eraseDur: timing.circleEraseDuration });
        this.later(runId, () => circle.setAttribute('stroke-dashoffset', '0'), timing.circleDelay + guideDelay);
      }

      const d = this.options.mergeOverlappingShapes
        ? mergeOverlappingPathData(path, this.options.mergeCurveSegments)
        : path.toPathData(2);
      const charAttrs: Record<string, string | number> = {
        d,
        fill: this.options.textColor,
        'fill-opacity': 0,
        stroke: this.options.textColor,
        'stroke-width': charIsCJK ? 0.9 : 1.1,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        pathLength: NORM_LEN,
        'stroke-dasharray': `${NORM_LEN} ${NORM_LEN * 2}`,
        'stroke-dashoffset': NORM_LEN
      };
      if (this.options.mergeOverlappingShapes) {
        charAttrs['fill-rule'] = 'evenodd';
      }

      const charPath = this.el('path', charAttrs);
      charPath.style.transition = `stroke-dashoffset ${timing.strokeDuration}ms cubic-bezier(.45,.05,.3,1), fill-opacity ${timing.fillDuration}ms ease`;
      this.svg.appendChild(charPath);

      this.later(
        runId,
        () => charPath.setAttribute('stroke-dashoffset', '0'),
        timing.strokeDelay + strokeDelay,
        index === 0 ? 'Stroking letters' : undefined
      );
      this.later(
        runId,
        () => charPath.setAttribute('fill-opacity', '1'),
        timing.fillDelay + strokeDelay,
        index === 0 ? 'Filling letters' : undefined
      );

    });

    this.later(runId, () => {
      allCharGuides.forEach((guide) => {
        guide.node.style.transition = `stroke-dashoffset ${guide.eraseDur}ms cubic-bezier(.4,.05,.3,1)`;
        guide.node.setAttribute('stroke-dashoffset', String(-NORM_LEN));
      });
    }, timing.eraseDelay, 'Erasing guides');

    this.later(runId, () => {
      topLine.style.transition = `stroke-dashoffset ${timing.horizontalEraseDuration}ms cubic-bezier(.4,.05,.3,1)`;
      bottomLine.style.transition = `stroke-dashoffset ${timing.horizontalEraseDuration}ms cubic-bezier(.4,.05,.3,1)`;
      topLine.setAttribute('stroke-dashoffset', String(-NORM_LEN));
      bottomLine.setAttribute('stroke-dashoffset', String(-NORM_LEN));
    }, timing.horizontalEraseDelay);

    this.later(runId, () => {
      this.setPhase('Done');
    }, getDoneDelay(timing, chars.length));
  }

  update(options: TextTraceOptions): Promise<void> {
    return this.render(options);
  }

  replay(): Promise<void> {
    return this.render();
  }

  destroy(): void {
    this.destroyed = true;
    this.clearTimers();
    this.svg.innerHTML = '';
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

  private later(runId: number, fn: () => void, ms: number, phase?: string): void {
    this.timers.push(window.setTimeout(() => {
      if (!this.isCurrent(runId)) return;
      if (phase) this.setPhase(phase);
      fn();
    }, Math.max(0, ms)));
  }

  private clearTimers(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
  }

  private setPhase(phase: string): void {
    this.options.onPhaseChange?.(phase);
  }

  private isCurrent(runId: number): boolean {
    return !this.destroyed && runId === this.runId;
  }
}

function ensureWawoff2(url: string): Promise<Wawoff2Module> {
  const existing = wawoff2Loaders.get(url);
  if (existing) return existing;

  const loader = new Promise<Wawoff2Module>((resolve, reject) => {
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

function mergeOptions(base: ResolvedTextTraceOptions, options: TextTraceOptions): ResolvedTextTraceOptions {
  return {
    ...base,
    ...options,
    text: options.text ?? base.text,
    fontKey: options.fontKey ?? base.fontKey,
    textColor: options.textColor ?? base.textColor,
    guideColor: options.guideColor ?? base.guideColor,
    duration: options.duration ?? base.duration,
    timing: {
      ...base.timing,
      ...options.timing
    },
    verticalGuideOvershoot: options.verticalGuideOvershoot ?? base.verticalGuideOvershoot,
    verticalGuideProbability: options.verticalGuideProbability ?? base.verticalGuideProbability,
    mergeOverlappingShapes: options.mergeOverlappingShapes ?? base.mergeOverlappingShapes,
    mergeCurveSegments: options.mergeCurveSegments ?? base.mergeCurveSegments,
    wawoff2Url: options.wawoff2Url ?? base.wawoff2Url,
    fontUrls: mergeFontUrls(base.fontUrls, options.fontUrls),
    onPhaseChange: options.onPhaseChange ?? base.onPhaseChange
  };
}

function mergeFontUrls(
  base: Record<string, string>,
  override: TextTraceOptions['fontUrls']
): Record<string, string> {
  const merged = { ...base };
  Object.entries(override ?? {}).forEach(([key, value]) => {
    if (value) merged[key] = value;
  });
  return merged;
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

function mergeOverlappingPathData(path: Path, curveSegments: number): string {
  const rings = pathToRings(path, curveSegments);
  const polygons = ringsToPolygons(rings);
  if (polygons.length === 0) return path.toPathData(2);

  let merged: MultiPolygon;
  try {
    merged = union(polygons);
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
    .map((ring) => ({
      ring,
      signedArea: ringArea(ring),
      area: Math.abs(ringArea(ring))
    }))
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
