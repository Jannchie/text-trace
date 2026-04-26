# Text Trace

## Demo

![Text Trace demo](public/demo.gif)

## Packages

- `@text-trace/core`: framework-agnostic SVG text trace animation.
- `@text-trace/vue`: Vue binding.
- `@text-trace/react`: React binding.
- `text-trace-playground`: native TypeScript playground for debugging `@text-trace/core`.

## Usage

```ts
import { createTextTrace } from "@text-trace/core";

const svg = document.querySelector<SVGSVGElement>("svg")!;
const trace = createTextTrace(svg, {
  text: "Snowcake47",
  ariaLabel: "Snowcake47"
});

await trace.render();
```

React:

```tsx
import { TextTrace } from "@text-trace/react";

export function Logo() {
  return <TextTrace text="Snowcake47" aria-label="Snowcake47" />;
}
```

Vue:

```vue
<script setup lang="ts">
import { TextTrace } from "@text-trace/vue";
</script>

<template>
  <TextTrace text="Snowcake47" aria-label="Snowcake47" />
</template>
```

Nuxt:

```vue
<script setup lang="ts">
import { TextTrace } from "@text-trace/vue";
</script>

<template>
  <ClientOnly>
    <TextTrace text="Snowcake47" aria-label="Snowcake47" />
  </ClientOnly>
</template>
```

## Fonts

`@text-trace/core` does not bundle font files. The default font presets use CDN URLs for quick demos, so production pages should pass a font hosted by your own app.

Pass one local font with `fontSource`:

```ts
import brandFontUrl from "./brand-font.woff?url";

createTextTrace(svg, {
  text: "Snowcake47",
  fontKey: "brand",
  fontSource: brandFontUrl
});
```

Or pass multiple local fonts with `fontSources`:

```ts
createTextTrace(svg, {
  text: "Snowcake47",
  fontKey: "brand",
  fontSources: {
    brand: "/fonts/brand.woff",
    display: "/fonts/display.woff"
  }
});
```

WOFF2 fonts are supported, but the decompressor must be provided explicitly. Install `wawoff2` if you want to use its browser binding, and host that binding with your app too:

```ts
import brandFontUrl from "./brand-font.woff2?url";
import wawoff2Url from "wawoff2/build/decompress_binding.js?url";

createTextTrace(svg, {
  text: "Snowcake47",
  fontKey: "brand",
  fontSource: brandFontUrl,
  wawoff2Url
});
```

`fontUrls` is still supported as a backwards-compatible alias for URL-only sources. The CDN presets are exported as `TEXT_TRACE_FONT_URLS` and `TEXT_TRACE_CDN_FONT_URLS` for demos or quick experiments.

## Accessibility

The SVG uses `role="img"` and an accessible name by default. The name comes from `ariaLabel` / `aria-label`, falling back to `text`. Core also inserts a `<title>` element as an SVG fallback.

Use `decorative: true` when the animation is purely decorative and real text is already present nearby.

## Per-Glyph Styles

Use `glyphStyles` to override colors for specific character indexes. `from` is inclusive and `to` is exclusive.

```ts
createTextTrace(svg, {
  text: "Snowcake47",
  textColor: "#111827",
  guideColor: "#111827",
  glyphStyles: [
    {
      at: [8, 9],
      style: {
        textColor: "#2563eb",
        guideColor: "#2563eb"
      }
    },
    {
      from: 4,
      to: 8,
      style: {
        textColor: "#dc2626"
      }
    }
  ]
});
```

## SVG Paths

Use `getTextTracePaths` when you only need the generated glyph paths:

```ts
import { getTextTracePaths } from "@text-trace/core";

const result = await getTextTracePaths({
  text: "Snowcake47",
  fontKey: "inter"
});

console.log(result.viewBox, result.paths.map((path) => path.d));
```

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
