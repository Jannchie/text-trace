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

`@text-trace/core` accepts a `timing` option. Delay values are milliseconds after the font has loaded, so phases can overlap:

```ts
createTextTrace(svg, {
  text: "Hello, world!",
  timing: {
    horizontalDelay: 0,
    guideDelay: 100,
    strokeDelay: 400,
    fillDelay: 800,
    eraseDelay: 1000
  },
  verticalGuideOvershoot: 28,
  verticalGuideProbability: 0.45,
  mergeOverlappingShapes: true
});
```
