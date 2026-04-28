import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { createTextTrace, TEXT_TRACE_VIEW_BOX } from '@text-trace/core';
import type { TextTraceController, TextTraceOptions } from '@text-trace/core';

export interface TextTraceProps extends TextTraceOptions {
  'aria-label'?: string;
  className?: string;
  style?: CSSProperties;
  onReady?: (controller: TextTraceController) => void;
}

export function TextTrace({
  className,
  style,
  onReady,
  text = 'Hello, world!',
  fontKey = 'noto-sc',
  textColor = '#111827',
  guideColor = '#111827',
  duration,
  timing,
  verticalGuideOvershoot,
  verticalGuideProbability,
  mergeOverlappingShapes,
  mergeCurveSegments,
  glyphStyles,
  fontSource,
  fontSources,
  fontUrls,
  wawoff2Url,
  wawoff2,
  ariaLabel,
  'aria-label': ariaLabelAttr,
  decorative,
  onPhaseChange
}: TextTraceProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const controllerRef = useRef<TextTraceController | null>(null);
  const onReadyRef = useRef(onReady);
  const hasReadyControllerRef = useRef(false);
  const accessibleLabel = resolveAccessibleLabel(ariaLabel ?? ariaLabelAttr, text);

  useEffect(() => {
    onReadyRef.current = onReady;
    if (hasReadyControllerRef.current && controllerRef.current) {
      onReady?.(controllerRef.current);
    }
  }, [onReady]);

  useEffect(() => {
    if (!svgRef.current) return undefined;

    const controller = createTextTrace(svgRef.current);
    controllerRef.current = controller;
    hasReadyControllerRef.current = true;
    onReadyRef.current?.(controller);

    return () => {
      controller.destroy();
      controllerRef.current = null;
      hasReadyControllerRef.current = false;
    };
  }, []);

  useEffect(() => {
    void controllerRef.current?.update({
      text,
      fontKey,
      textColor,
      guideColor,
      duration,
      timing,
      verticalGuideOvershoot,
      verticalGuideProbability,
      mergeOverlappingShapes,
      mergeCurveSegments,
      glyphStyles,
      fontSource,
      fontSources,
      fontUrls,
      wawoff2Url,
      wawoff2,
      ariaLabel: accessibleLabel,
      decorative,
      onPhaseChange
    });
  }, [
    fontKey,
    fontSources,
    fontUrls,
    guideColor,
    duration,
    onPhaseChange,
    text,
    textColor,
    timing,
    verticalGuideOvershoot,
    verticalGuideProbability,
    mergeOverlappingShapes,
    mergeCurveSegments,
    glyphStyles,
    fontSource,
    wawoff2Url,
    wawoff2,
    accessibleLabel,
    decorative
  ]);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={TEXT_TRACE_VIEW_BOX}
      xmlns="http://www.w3.org/2000/svg"
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : accessibleLabel}
      aria-hidden={decorative ? true : undefined}
      style={{
        width: '100%',
        height: 'auto',
        transition: 'transform 600ms cubic-bezier(.5,.05,.2,1)',
        ...style
      }}
    >
      {decorative ? null : <title>{accessibleLabel}</title>}
    </svg>
  );
}

function resolveAccessibleLabel(label: string | null | undefined, text: string): string {
  return label?.trim() || text || 'Hello, world!';
}

export default TextTrace;
