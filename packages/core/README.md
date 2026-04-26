# @text-trace/core

Framework-agnostic SVG text tracing animation.

## Local Fonts

This package does not bundle font files. For production, host fonts in your app and pass a local URL or font buffer:

```ts
import { createTextTrace } from "@text-trace/core";
import fontUrl from "./brand.woff?url";

const trace = createTextTrace(svg, {
  text: "Snowcake47",
  fontKey: "brand",
  fontSource: fontUrl,
  ariaLabel: "Snowcake47",
  glyphStyles: [
    {
      at: [8, 9],
      style: {
        textColor: "#2563eb",
        guideColor: "#2563eb"
      }
    }
  ]
});

await trace.render();
```

WOFF2 is supported when you provide a `wawoff2Url` or `wawoff2` module.

Use `getTextTracePaths()` when you only need generated SVG path data.
