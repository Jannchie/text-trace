import { defineComponent, h, mergeProps, onBeforeUnmount, onMounted, watch } from 'vue';
import type { PropType } from 'vue';
import { createTextTrace, TEXT_TRACE_VIEW_BOX } from '@text-trace/core';
import type { TextTraceController, TextTraceFontKey, TextTraceOptions } from '@text-trace/core';

export const TextTrace = defineComponent({
  name: 'TextTrace',
  props: {
    text: {
      type: String,
      default: 'Hello, world!'
    },
    fontKey: {
      type: String as PropType<TextTraceFontKey | string>,
      default: 'noto-sc'
    },
    textColor: {
      type: String,
      default: '#111827'
    },
    guideColor: {
      type: String,
      default: '#111827'
    },
    duration: {
      type: Number,
      default: 1000
    },
    timing: {
      type: Object as PropType<TextTraceOptions['timing']>,
      default: undefined
    },
    verticalGuideOvershoot: {
      type: Number,
      default: 28
    },
    verticalGuideProbability: {
      type: Number,
      default: 0.45
    },
    mergeOverlappingShapes: {
      type: Boolean,
      default: false
    },
    mergeCurveSegments: {
      type: Number,
      default: 12
    },
    fontSource: {
      type: [String, Object, Function] as PropType<TextTraceOptions['fontSource']>,
      default: undefined
    },
    fontSources: {
      type: Object as PropType<TextTraceOptions['fontSources']>,
      default: undefined
    },
    fontUrls: {
      type: Object as PropType<TextTraceOptions['fontUrls']>,
      default: undefined
    },
    wawoff2Url: {
      type: String,
      default: undefined
    },
    wawoff2: {
      type: [Object, Function] as PropType<TextTraceOptions['wawoff2']>,
      default: undefined
    },
    ariaLabel: {
      type: String,
      default: undefined
    },
    decorative: {
      type: Boolean,
      default: false
    }
  },
  emits: {
    'phase-change': (_phase: string) => true,
    ready: (_controller: TextTraceController) => true
  },
  setup(props, { attrs, emit }) {
    let controller: TextTraceController | undefined;
    let svg: SVGSVGElement | undefined;

    const readOptions = (): TextTraceOptions => ({
      text: props.text,
      fontKey: props.fontKey,
      textColor: props.textColor,
      guideColor: props.guideColor,
      duration: props.duration,
      timing: props.timing,
      verticalGuideOvershoot: props.verticalGuideOvershoot,
      verticalGuideProbability: props.verticalGuideProbability,
      mergeOverlappingShapes: props.mergeOverlappingShapes,
      mergeCurveSegments: props.mergeCurveSegments,
      fontSource: props.fontSource,
      fontSources: props.fontSources,
      fontUrls: props.fontUrls,
      wawoff2Url: props.wawoff2Url,
      wawoff2: props.wawoff2,
      ariaLabel: props.ariaLabel ?? readAttrAriaLabel(attrs),
      decorative: props.decorative,
      onPhaseChange: (phase) => emit('phase-change', phase)
    });

    const render = () => {
      void controller?.update(readOptions());
    };

    onMounted(() => {
      if (!svg) return;
      controller = createTextTrace(svg, readOptions());
      emit('ready', controller);
      void controller.render();
    });

    watch(
      () => [
        props.text,
        props.fontKey,
        props.textColor,
        props.guideColor,
        props.duration,
        props.timing,
        props.verticalGuideOvershoot,
        props.verticalGuideProbability,
        props.mergeOverlappingShapes,
        props.mergeCurveSegments,
        props.fontSource,
        props.fontSources,
        props.fontUrls,
        props.wawoff2Url,
        props.wawoff2,
        props.ariaLabel,
        props.decorative
      ],
      render,
      { deep: true }
    );

    onBeforeUnmount(() => {
      controller?.destroy();
      controller = undefined;
    });

    return () => {
      const accessibleLabel = resolveAccessibleLabel(props.ariaLabel ?? readAttrAriaLabel(attrs), props.text);
      return h('svg', mergeProps({
        ref: (element) => {
          svg = element instanceof SVGSVGElement ? element : undefined;
        },
        viewBox: TEXT_TRACE_VIEW_BOX,
        xmlns: 'http://www.w3.org/2000/svg',
        role: props.decorative ? undefined : 'img',
        'aria-label': props.decorative ? undefined : accessibleLabel,
        'aria-hidden': props.decorative ? 'true' : undefined,
        style: {
          width: '100%',
          height: 'auto',
          transition: 'transform 600ms cubic-bezier(.5,.05,.2,1)'
        }
      }, attrs), props.decorative ? undefined : [h('title', accessibleLabel)]);
    };
  }
});

function readAttrAriaLabel(attrs: Record<string, unknown>): string | undefined {
  const label = attrs['aria-label'];
  return typeof label === 'string' ? label : undefined;
}

function resolveAccessibleLabel(label: string | undefined, text: string): string {
  return label?.trim() || text || 'Hello, world!';
}

export default TextTrace;
