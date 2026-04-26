import { defineComponent, h, mergeProps, onBeforeUnmount, onMounted, watch } from 'vue';
import type { PropType } from 'vue';
import { createTextTrace, TEXT_TRACE_VIEW_BOX } from '@text-trace/core';
import type { TextTraceController, TextTraceDramaMode, TextTraceFontKey, TextTraceOptions } from '@text-trace/core';

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
    dramaMode: {
      type: String as PropType<TextTraceDramaMode>,
      default: 'subtle'
    },
    color: {
      type: String,
      default: '#111827'
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
    guideExitExtension: {
      type: Number,
      default: 18
    },
    mergeOverlappingShapes: {
      type: Boolean,
      default: false
    },
    mergeCurveSegments: {
      type: Number,
      default: 12
    },
    fontUrls: {
      type: Object as PropType<TextTraceOptions['fontUrls']>,
      default: undefined
    },
    wawoff2Url: {
      type: String,
      default: undefined
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
      dramaMode: props.dramaMode,
      color: props.color,
      timing: props.timing,
      verticalGuideOvershoot: props.verticalGuideOvershoot,
      verticalGuideProbability: props.verticalGuideProbability,
      guideExitExtension: props.guideExitExtension,
      mergeOverlappingShapes: props.mergeOverlappingShapes,
      mergeCurveSegments: props.mergeCurveSegments,
      fontUrls: props.fontUrls,
      wawoff2Url: props.wawoff2Url,
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
        props.dramaMode,
        props.color,
        props.timing,
        props.verticalGuideOvershoot,
        props.verticalGuideProbability,
        props.guideExitExtension,
        props.mergeOverlappingShapes,
        props.mergeCurveSegments,
        props.fontUrls,
        props.wawoff2Url
      ],
      render,
      { deep: true }
    );

    onBeforeUnmount(() => {
      controller?.destroy();
      controller = undefined;
    });

    return () => h('svg', mergeProps({
      ref: (element) => {
        svg = element instanceof SVGSVGElement ? element : undefined;
      },
      viewBox: TEXT_TRACE_VIEW_BOX,
      xmlns: 'http://www.w3.org/2000/svg',
      style: {
        width: '100%',
        height: 'auto',
        transition: 'transform 600ms cubic-bezier(.5,.05,.2,1)'
      }
    }, attrs));
  }
});

export default TextTrace;
