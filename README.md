# Text Trace

Text Trace is a small monorepo extracted from `keynote_trace_animation_v7_cjk_unified.html`.

## Packages

- `@text-trace/core`: framework-agnostic SVG text trace animation.
- `@text-trace/vue`: Vue binding.
- `@text-trace/react`: React binding.
- `text-trace-playground`: native TypeScript playground for debugging `@text-trace/core`.

## Development

```bash
pnpm install
pnpm dev
```

Build all packages and the playground:

```bash
pnpm build
```

## Timing

`@text-trace/core` accepts a `duration` option in milliseconds and a `timing` option with phase positions from `0` to `1`:

```ts
createTextTrace(svg, {
  text: "Hello, world!",
  textColor: "#111827",
  guideColor: "#111827",
  duration: 1000,
  timing: {
    horizontal: 0,
    guide: 0.1,
    stroke: 0.4,
    fill: 0.8,
    erase: 1
  },
  verticalGuideOvershoot: 28,
  verticalGuideProbability: 0.45,
  mergeOverlappingShapes: true
});
```
