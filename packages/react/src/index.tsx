import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { createTextTrace, TEXT_TRACE_VIEW_BOX } from '@text-trace/core';
import type {
  TextTraceAnimationOptions,
  TextTraceController,
  TextTraceError,
  TextTraceFont,
  TextTraceGuideOptions,
  TextTracePhase,
  TextTraceStyleOptions
} from '@text-trace/core';

export interface TextTraceProps {
  text?: string;
  font: TextTraceFont;
  styleOptions?: TextTraceStyleOptions;
  animation?: TextTraceAnimationOptions;
  guide?: TextTraceGuideOptions;
  ariaLabel?: string | null;
  decorative?: boolean;
  onPhaseChange?: (phase: TextTracePhase) => void;
  onError?: (error: TextTraceError) => void;
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
  font,
  styleOptions,
  animation,
  guide,
  ariaLabel,
  'aria-label': ariaLabelAttr,
  decorative,
  onPhaseChange,
  onError
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
      content: { text, font },
      style: styleOptions,
      animation,
      guide,
      accessibility: {
        ariaLabel: accessibleLabel,
        decorative
      },
      events: {
        onPhaseChange,
        onError
      }
    });
  }, [
    animation,
    font,
    guide,
    onPhaseChange,
    onError,
    text,
    styleOptions,
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
