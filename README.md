# `wgui`

Tiny UI framework for Deno

> ⚠️ Experimental: Demo project for Deno's WebGPU "Bring your own Window" feature.
> 
> Depends on unreleased Deno and x/sdl2

```tsx
/** @jsx h */
import { h, App, Fragment, Rect, Text } from "./wgui.ts"; 

function main() {
  return (
    <App width={600} height={700}>
      <Text>Hello, wgui</Text>
    </App>
  );
}

main();
```

### Examples

`./music-app.tsx`

https://www.youtube.com/watch?v=wO6ePxjFoFA

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
