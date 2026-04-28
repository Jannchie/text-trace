import { defineComponent, h, mergeProps, onBeforeUnmount, onMounted, watch } from 'vue';
import type { PropType } from 'vue';
import { createTextTrace, TEXT_TRACE_VIEW_BOX } from '@text-trace/core';
import type {
  TextTraceAnimationOptions,
  TextTraceController,
  TextTraceError,
  TextTraceFont,
  TextTraceGuideOptions,
  TextTracePhase,
  TextTraceRenderOptions,
  TextTraceStyleOptions
} from '@text-trace/core';

export const TextTrace = defineComponent({
  name: 'TextTrace',
  props: {
    text: {
      type: String,
      default: 'Hello, world!'
    },
    font: {
      type: Object as PropType<TextTraceFont>,
      required: true
    },
    styleOptions: {
      type: Object as PropType<TextTraceStyleOptions>,
      default: undefined
    },
    animation: {
      type: Object as PropType<TextTraceAnimationOptions>,
      default: undefined
    },
    guide: {
      type: Object as PropType<TextTraceGuideOptions>,
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
    'phase-change': (_phase: TextTracePhase) => true,
    error: (_error: TextTraceError) => true,
    ready: (_controller: TextTraceController) => true
  },
  setup(props, { attrs, emit }) {
    let controller: TextTraceController | undefined;
    let svg: SVGSVGElement | undefined;
    let renderQueued = false;
    const emitPhaseChange = (phase: TextTracePhase) => emit('phase-change', phase);
    const emitError = (error: TextTraceError) => emit('error', error);

    const readOptions = (): TextTraceRenderOptions => ({
      content: {
        text: props.text,
        font: props.font
      },
      style: props.styleOptions,
      animation: props.animation,
      guide: props.guide,
      accessibility: {
        ariaLabel: props.ariaLabel ?? readAttrAriaLabel(attrs),
        decorative: props.decorative
      },
      events: {
        onPhaseChange: emitPhaseChange,
        onError: emitError
      }
    });

    const update = () => {
      void controller?.update(readOptions());
    };

    const queueUpdate = () => {
      if (!controller || renderQueued) return;
      renderQueued = true;
      queueMicrotask(() => {
        renderQueued = false;
        update();
      });
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
        props.font,
        props.ariaLabel,
        props.decorative
      ],
      queueUpdate
    );

    watch(
      () => [
        props.styleOptions,
        props.animation,
        props.guide
      ],
      queueUpdate,
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
