# @text-trace/react

React component for SVG text tracing animation.

```tsx
import { TextTrace } from "@text-trace/react";
import fontUrl from "./brand.woff?url";

export function Logo() {
  return (
    <TextTrace
      text="Snowcake47"
      fontKey="brand"
      fontSource={fontUrl}
      aria-label="Snowcake47"
    />
  );
}
```

The package does not bundle font files. WOFF2 is supported when you provide a `wawoff2Url` or `wawoff2` module.
