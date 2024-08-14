// deno-lint-ignore-file no-explicit-any

import { EventType, startTextInput, stopTextInput } from "sdl2";
import { InnerApp } from "./app.ts";
import { Vec2, Vec4 } from "./data.ts";
import { loadFont } from "./text.ts";
import { setCurrentHook, useState } from "wgui/hooks";

/**
 * Node types for the renderer.
 */
export enum NodeType {
  /**
   * A glyph node.
   */
  Glyph = -2,

  /**
   * A rectangle node.
   */
  Rect = -1,

  /**
   * A rectangle node with a texture.
   */
  TexturedRect = 0,
}

/**
 * The number of samples for multisampling.
 */
export const SAMPLE_COUNT = 4;

/**
 * The size of the rectangle buffer.
 */
export const RECTANGLE_BUFFER_SIZE = 16 * 1024;

await loadFont();

/**
 * Create a new element.
 * @example
 * ```tsx
 * h("div", { id: "app" }, "Hello, World!");
 * ```
 */
export function h(tag: any, props: any, ...children: any[]): any {
  if (typeof tag === "string") {
    throw new Error(`Tag ${tag} is not supported`);
  }

  if (children.length > 0) {
    props = { ...props, children };
  }

  if (props !== null) {
    return tag(props);
  }

  return tag();
}

/**
 * Render the component.
 * @example
 * ```tsx
 * render(App);
 * ```
 */
export async function render(
  component: any,
) {
  const { title, styles, textures } = component();
  const app = await InnerApp.initialize(styles, textures, title);
  function renderChild(child: any, app: any, event: any) {
    if (typeof child === "function") {
      const c = child(app, event);
      if (c) {
        renderChild(c, app, event);
      }
    } else if (Array.isArray(child)) {
      for (const c of child) {
        renderChild(c, app, event);
      }
    }
  }

  app.start((event) => {
    setCurrentHook(0);
    const { children } = component();
    for (const child of children) {
      renderChild(child, app, event);
    }
    if (event.type == EventType.Draw) {
      app.render();
    }
  });
}

/**
 * The root element of the application.
 * @example
 * ```tsx
 * <App title="Hello World" styles={{ width: 800, height: 600 }}>
 *   <Rect styles={{ width: 600, height: 400 }} color={new Vec4(0.5, 0.5, 0.5, 1)} position={new Vec2(100, 100)}>
 *     <Text fontSize={20} position={new Vec2(10, 10)} color={new Vec4(1, 1, 1, 1)}>Hello, World!</Text>
 *   </Rect>
 * </App>
 * ```
 */
export function App(
  {
    styles,
    children,
    textures = [],
    title = "WGUI",
  }: {
    styles?: any;
    children?: any[];
    textures?: any[];
    title?: string;
  },
): {
  styles: any;
  children: any[] | undefined;
  textures: any[];
  title: string;
} {
  return {
    styles,
    children,
    textures,
    title,
  };
}

/**
 * A fragment element.
 * @example
 * ```tsx
 * <Fragment>
 *  <Text>Hello, World!</Text>
 * </Fragment>
 * ```
 */
export function Fragment({ children = [] }: { children?: any[] }): any[] {
  return children;
}

/**
 * A text element.
 * @example
 * ```tsx
 * <Text position={new Vec2(10, 10)} fontSize={16} color={new Vec4(1, 1, 1, 1)}>
 *  Hello, World!
 * </Text>
 * ```
 */
export function Text(
  props: Partial<
    { position: Vec2; fontSize: number; color: Vec4; children: any[] }
  > = {},
): (app: any, event: any) => void {
  return (app: any, event: any) => {
    if (event.type == EventType.Draw) {
      const text = props.children?.join("") ?? "";

      app.renderer.text(
        text,
        props.position ?? new Vec2(0, 0),
        props.fontSize ?? 16,
        props.color ?? new Vec4(1, 1, 1, 1),
      );
    }
  };
}

/**
 * A rectangle element.
 * @example
 * ```tsx
 * <Rect styles={{ width: 100, height: 100 }} color={new Vec4(1, 1, 1, 1)} position={new Vec2(0, 0)} />
 * ```
 */
export function Rect(
  props: Partial<
    {
      color: Vec4;
      position: Vec2;
      styles: { width: number; height: number };
      borderRadius: number;
      size: Vec2;
      onMouseOver: (props: any) => void;
      onMouseOut: (props: any) => void;
      onClick: (props: any) => void;
      onInput: (props: any, event: any) => void;
      onMouseScroll: (props: any, event: any) => void;
      onKeyDown: (props: any, event: any) => void;
      usage: number;
      image: Uint8Array;
    }
  > = {},
): (app: any, event: any) => void {
  props.color ??= new Vec4(1, 1, 1, 1);
  props.position ??= new Vec2(0, 0);
  props.styles!.width ??= 100;
  props.styles!.height ??= 100;
  props.borderRadius ??= 0;
  props.size ??= new Vec2(props.styles!.width, props.styles!.height);
  const nop = () => {};
  props.onMouseOver ??= nop;
  props.onMouseOut ??= nop;
  props.onClick ??= nop;
  props.onInput ??= nop;
  props.onMouseScroll ??= nop;
  props.onKeyDown ??= nop;

  const [focused, setFocused] = useState(false);
  const [mouseOver, setMouseOver] = useState(false);

  return (app: any, event: any) => {
    const ui = app.renderer;

    if (mouseOver && event.type == EventType.MouseWheel) {
      props.onMouseScroll!(props, event);
    }
    if (
      event.type == EventType.MouseMotion ||
      event.type == EventType.MouseButtonDown
    ) {
      // In bounds check.
      // Does not take into account border radius.
      if (
        event.x >= props.position!.x &&
        event.x <= props.position!.x + props.size!.x &&
        event.y >= props.position!.y &&
        event.y <= props.position!.y + props.size!.y
      ) {
        if (!mouseOver) {
          props.onMouseOver!(props);
        }

        setMouseOver(true);
        if (event.type == EventType.MouseButtonDown) {
          props.onClick!(props);
          setFocused(true);
          startTextInput();
        }
      } else if (mouseOver) {
        setMouseOver(false);
        setFocused(false);
        stopTextInput();
        props.onMouseOut!(props);
      }
    }

    if (
      focused &&
      event.type == EventType.TextInput
    ) {
      props.onInput!(props, event);
    } else if (focused && event.type == EventType.KeyDown) {
      props.onKeyDown!(props, event);
    }

    if (event.type == EventType.Draw) {
      ui.rectangle(
        props.color,
        props.position,
        props.size,
        props.usage,
        props.borderRadius,
        props.image,
      );
    }
  };
}

export * from "./data.ts";
export * from "./app.ts";
export * from "./renderer.ts";
