# Text Trace

Text Trace turns font glyphs into animated SVG tracing paths. It ships a framework-agnostic core package plus React and Vue bindings.

## Demo

![Text Trace demo](public/demo.gif)

## Installation

Install the core package when you want to render into an existing SVG element:

```bash
pnpm add @text-trace/core
```

Install the matching framework binding for React or Vue:

```bash
pnpm add @text-trace/core @text-trace/react
pnpm add @text-trace/core @text-trace/vue
```

## Quick Start

### Core

```ts
import { createTextTrace, loadTextTraceFont } from "@text-trace/core";
import brandFontUrl from "./brand.woff?url";

const svg = document.querySelector<SVGSVGElement>("svg")!;
const font = await loadTextTraceFont({
  source: brandFontUrl
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

### React

```tsx
import { TextTrace } from "@text-trace/react";
import type { TextTraceFont } from "@text-trace/core";

export function Logo({ font }: { font: TextTraceFont }) {
  return <TextTrace text="Snowcake47" font={font} aria-label="Snowcake47" />;
}
```

### Vue

```vue
<script setup lang="ts">
import { loadTextTraceFont } from "@text-trace/core";
import { TextTrace } from "@text-trace/vue";
import brandFontUrl from "./brand.woff?url";

const font = await loadTextTraceFont({
  source: brandFontUrl
});
</script>

<template>
  <TextTrace text="Snowcake47" :font="font" aria-label="Snowcake47" />
</template>
```

## Font Loading

`@text-trace/core` does not bundle font files or fetch a default font during render. Load a font first, then pass the parsed font to the renderer or framework component.

### Recommended: local font URL

Pass a stable local URL when possible. This lets Text Trace cache font requests and parsed font objects by URL.

```ts
import { loadTextTraceFont } from "@text-trace/core";
import brandFontUrl from "./brand.woff?url";

const font = await loadTextTraceFont({
  source: brandFontUrl
});
```

You can also use a public path:

```ts
const font = await loadTextTraceFont({
  source: "/fonts/brand.woff"
});
```

### Custom fetch

Use a source function when you need custom request options, such as authentication headers. Keep the `response.ok` check close to the request so failed font responses are easier to debug.

```ts
const font = await loadTextTraceFont({
  source: async () => {
    const response = await fetch("/fonts/brand.woff", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Font request failed: ${response.status}`);
    }

    return response.arrayBuffer();
  }
});
```

You can also pass an `ArrayBuffer`, `Uint8Array`, or `opentype.js` `Font` object when your app already owns the font data.

### WOFF2

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

### CDN presets

The CDN presets are exported as `TEXT_TRACE_FONT_URLS` and `TEXT_TRACE_CDN_FONT_URLS` for demos or quick experiments. Production apps should usually host their own fonts.

## Configuration

### Style

```ts
createTextTrace(svg, {
  content: {
    text: "Snowcake47",
    font
  },
  style: {
    textColor: "#111827",
    guideColor: "#111827",
    mergeOverlappingShapes: true
  }
});
```

### Animation timing

`animation.duration` is measured in milliseconds. `animation.timing` values are phase positions from `0` to `1`.

```ts
createTextTrace(svg, {
  content: {
    text: "Hello, world!",
    font
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
  }
});
```

### Guide generation

```ts
createTextTrace(svg, {
  content: {
    text: "Hello, world!",
    font
  },
  guide: {
    verticalOvershoot: 28,
    verticalProbability: 0.45,
    seed: "Hello, world!"
  }
});
```

### Accessibility

The SVG uses `role="img"` and an accessible name by default. The name comes from `accessibility.ariaLabel` / `aria-label`, falling back to `content.text`. Core also inserts a `<title>` element as an SVG fallback.

Use `accessibility.decorative: true` when the animation is purely decorative and real text is already present nearby.

### Events

```ts
createTextTrace(svg, {
  content: {
    text: "Snowcake47",
    font
  },
  events: {
    onPhaseChange(phase) {
      console.log(phase);
    },
    onError(error) {
      console.error(error);
    }
  }
});
```

## Recipes

### Per-glyph styles

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

### SVG paths only

Use `createTextTraceLayout` when you only need the generated glyph paths:

```ts
import { createTextTraceLayout } from "@text-trace/core";

const result = await createTextTraceLayout({
  text: "Snowcake47",
  font
});

console.log(result.viewBox, result.paths.map((path) => path.d));
```

### Manual playback

```ts
const trace = createTextTrace(svg, {
  content: {
    text: "Snowcake47",
    font
  }
});

await trace.render();
await trace.replay();
```

## Packages

- `@text-trace/core`: framework-agnostic SVG text trace animation.
- `@text-trace/react`: React binding.
- `@text-trace/vue`: Vue binding.
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

Run type checks and tests:

```bash
pnpm check
pnpm test
```

## Release

Releases are published by the GitHub Actions release workflow when a `v*.*.*` tag is pushed.

Before the first trusted publish from a repository, configure npm trusted publishing for all packages:

```bash
pnpm trust:github Jannchie/text-trace
```

Use a different repository, workflow file, or npm environment when needed:

```bash
pnpm trust:github owner/repo release.yml npm
```
