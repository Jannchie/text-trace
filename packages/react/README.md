# @text-trace/react

React component for SVG text tracing animation.

```tsx
import { loadTextTraceFont } from "@text-trace/core";
import { TextTrace } from "@text-trace/react";
import fontUrl from "./brand.woff?url";

const font = await loadTextTraceFont({
  source: fontUrl
});

export function Logo() {
  return (
    <TextTrace
      text="Snowcake47"
      font={font}
      aria-label="Snowcake47"
      styleOptions={{
        glyphStyles: [
          {
            at: [8, 9],
            style: {
              textColor: "#2563eb",
              guideColor: "#2563eb"
            }
          }
        ]
      }}
    />
  );
}
```

The package does not bundle font files. Load a font with `loadTextTraceFont()` and pass the parsed font with the `font` prop.
