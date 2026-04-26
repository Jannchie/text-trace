# @text-trace/vue

Vue component for SVG text tracing animation.

In Nuxt, render it inside `<ClientOnly>` because the animation is browser-driven.

```vue
<script setup lang="ts">
import { TextTrace } from "@text-trace/vue";
import fontUrl from "./brand.woff?url";

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
  <ClientOnly>
    <TextTrace
      text="Snowcake47"
      font-key="brand"
      :font-source="fontUrl"
      :glyph-styles="glyphStyles"
      aria-label="Snowcake47"
    />
  </ClientOnly>
</template>
```

The package does not bundle font files. WOFF2 is supported when you provide a `wawoff2-url` or `wawoff2` module.
