# `wgui`

Tiny UI framework for Deno using the full power of WebGPU.

```tsx
/* @jsx h */
import { App, h, Rect, render, Text, Vec4 } from "wgui";
import { useState } from "wgui/hooks";

function main() {
  const [counter, setCounter] = useState<number>(0);

  return (
    <App
      title="Hello World"
      styles={{
        width: 800,
        height: 600,
        backgroundColor: "#f0f0f0",
        marginRight: "auto",
      }}
    >
      <Rect
        styles={{
          width: 100,
          height: 100,
        }}
        color={new Vec4(1, 0, 0, 1)}
        onClick={() => {
          setCounter(counter + 1);
        }}
      >
      </Rect>
      <Text>
        Hello world! {counter}
      </Text>
    </App>
  );
}

render(main);
```

## Examples

`music-app`

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
