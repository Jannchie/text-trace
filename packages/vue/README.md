# @text-trace/vue

Vue component for SVG text tracing animation.

```vue
<script setup lang="ts">
import { loadTextTraceFont } from "@text-trace/core";
import { TextTrace } from "@text-trace/vue";
import fontUrl from "./brand.woff?url";

const font = await loadTextTraceFont({
  source: fontUrl
});

const glyphStyles = [
  {
    at: [8, 9],
    style: {
      textColor: "#2563eb",
      guideColor: "#2563eb"
    }
  }
];
</script>

<template>
  <TextTrace
    text="Snowcake47"
    :font="font"
    :style-options="{ glyphStyles }"
    aria-label="Snowcake47"
  />
</template>
```

The package does not bundle font files. Load a font with `loadTextTraceFont()` and pass the parsed font with the `font` prop.
