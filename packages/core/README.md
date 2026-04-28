# @text-trace/core

Framework-agnostic SVG text tracing animation.

## Installation

```bash
pnpm add @text-trace/core
```

## Usage

```ts
import { createTextTrace, loadTextTraceFont } from "@text-trace/core";
import fontUrl from "./brand.woff?url";

const svg = document.querySelector<SVGSVGElement>("svg")!;
const font = await loadTextTraceFont({
  source: fontUrl
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

This package does not bundle font files. For production, host fonts in your app and pass a stable local URL to `loadTextTraceFont()`.

Use `createTextTraceLayout()` when you only need generated SVG path data.

See the root README for font loading, WOFF2, timing, accessibility, and advanced recipes: https://github.com/Jannchie/text-trace#readme
