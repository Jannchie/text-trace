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
import { createTextTrace, loadTextTraceFont } from "@text-trace/core";

const svg = document.querySelector<SVGSVGElement>("svg")!;
const font = await loadTextTraceFont({
  source: "/fonts/brand.woff"
});

const trace = createTextTrace(svg, {
  content: {
    text: "Snowcake47",
    font
  },
  accessibility: {
    ariaLabel: "Snowcake47"
  }
});

await trace.play();
```

React:

```tsx
import { TextTrace } from "@text-trace/react";
import type { TextTraceFont } from "@text-trace/core";

export function Logo({ font }: { font: TextTraceFont }) {
  return <TextTrace text="Snowcake47" font={font} aria-label="Snowcake47" />;
}
```

Vue:

```vue
<script setup lang="ts">
import { loadTextTraceFont } from "@text-trace/core";
import { TextTrace } from "@text-trace/vue";

const font = await loadTextTraceFont({
  source: "/fonts/brand.woff"
});
</script>

<template>
  <TextTrace text="Snowcake47" :font="font" aria-label="Snowcake47" />
</template>
```

## Fonts

`@text-trace/core` does not bundle font files or fetch a default font during render. Load a font first, then pass the parsed font to the renderer.

Pass one local font URL:

```ts
import { loadTextTraceFont } from "@text-trace/core";
import brandFontUrl from "./brand.woff?url";

const font = await loadTextTraceFont({
  source: brandFontUrl
});
```

Or pass a font buffer / `opentype.js` `Font` object:

```ts
const font = await loadTextTraceFont({
  source: await fetch("/fonts/brand.woff").then((response) => response.arrayBuffer())
});
```

WOFF2 fonts are supported, but the decompressor must be provided explicitly. Install `wawoff2` if you want to use its browser binding, and host that binding with your app too:

```ts
import brandFontUrl from "./brand-font.woff2?url";
import wawoff2Url from "wawoff2/build/decompress_binding.js?url";

const font = await loadTextTraceFont({
  source: brandFontUrl,
  woff2: {
    url: wawoff2Url
  }
});
```

The CDN presets are exported as `TEXT_TRACE_FONT_URLS` and `TEXT_TRACE_CDN_FONT_URLS` for demos or quick experiments.

## Accessibility

The SVG uses `role="img"` and an accessible name by default. The name comes from `accessibility.ariaLabel` / `aria-label`, falling back to `content.text`. Core also inserts a `<title>` element as an SVG fallback.

Use `accessibility.decorative: true` when the animation is purely decorative and real text is already present nearby.

## Per-Glyph Styles

Use `glyphStyles` to override colors for specific character indexes. `from` is inclusive and `to` is exclusive.

```ts
createTextTrace(svg, {
  content: {
    text: "Snowcake47",
    font
  },
  style: {
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
  }
});
```

## SVG Paths

Use `createTextTraceLayout` when you only need the generated glyph paths:

```ts
import { createTextTraceLayout } from "@text-trace/core";

const result = await createTextTraceLayout({
  text: "Snowcake47",
  font
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

`@text-trace/core` accepts an `animation.duration` option in milliseconds and an `animation.timing` option with phase positions from `0` to `1`:

```ts
createTextTrace(svg, {
  content: {
    text: "Hello, world!",
    font
  },
  style: {
    textColor: "#111827",
    guideColor: "#111827",
    mergeOverlappingShapes: true
  },
  animation: {
    duration: 1000,
    timing: {
      horizontal: 0,
      guide: 0.1,
      stroke: 0.4,
      fill: 0.8,
      erase: 1
    }
  },
  guide: {
    verticalOvershoot: 28,
    verticalProbability: 0.45,
    seed: "Hello, world!"
  }
});
```
