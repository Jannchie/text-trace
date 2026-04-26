import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { createTextTrace, TEXT_TRACE_VIEW_BOX } from '@text-trace/core';
import type { TextTraceController, TextTraceOptions } from '@text-trace/core';

export interface TextTraceProps extends TextTraceOptions {
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
  fontUrls,
  wawoff2Url,
  onPhaseChange
}: TextTraceProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const controllerRef = useRef<TextTraceController | null>(null);

  useEffect(() => {
    if (!svgRef.current) return undefined;

    const controller = createTextTrace(svgRef.current);
    controllerRef.current = controller;
    onReady?.(controller);

    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [onReady]);

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
      fontUrls,
      wawoff2Url,
      onPhaseChange
    });
  }, [
    fontKey,
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
    wawoff2Url
  ]);

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={TEXT_TRACE_VIEW_BOX}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: '100%',
        height: 'auto',
        transition: 'transform 600ms cubic-bezier(.5,.05,.2,1)',
        ...style
      }}
    />
  );
}

export default TextTrace;
