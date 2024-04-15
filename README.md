# `wgui`

Tiny UI framework for Deno

```tsx
/** @jsx h */
import { App, Fragment, h, Rect, Text } from "./wgui.ts";

function main() {
  return (
    <App
      styles={{
        width: 800,
        height: 600,
      }}
    >
      <Text>Hello, wgui</Text>
    </App>
  );
}

main();
```

### Examples

`./music-app.tsx`

<https://www.youtube.com/watch?v=wO6ePxjFoFA>

![image](https://github.com/littledivy/wgui/assets/34997667/d7a14e14-be44-4462-b740-848315042f9e)

<!--
# App

## Events

# Renderer

## Quad

### Textures

### Border radius

## Glyph

Multiple ways to render font:

- Generate vertices in CPU.
- Texture atlas
- SDF

Homework:

- z-index
- text bounding
- texture atlas for images
-->
