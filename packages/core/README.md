# @text-trace/core

Framework-agnostic SVG text tracing animation.

## Local Fonts

This package does not bundle font files. For production, host fonts in your app and pass a local URL or font buffer:

```ts
import { createTextTrace, loadTextTraceFont } from "@text-trace/core";
import fontUrl from "./brand.woff?url";

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
  },
  style: {
    glyphStyles: [
      {
        at: [8, 9],
        style: {
          textColor: "#2563eb",
          guideColor: "#2563eb"
        }
      }
    ]
  }
});

await trace.play();
```

WOFF2 is supported when you provide a `woff2.url` or `woff2.module` to `loadTextTraceFont()`.

Use `createTextTraceLayout()` when you only need generated SVG path data.
