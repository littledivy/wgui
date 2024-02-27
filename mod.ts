// deno-lint-ignore-file no-explicit-any

import { EventType, startTextInput, stopTextInput } from "sdl2";
import { InnerApp } from "./app.ts";
import { Vec2, Vec4 } from "./data.ts";
import { loadFont } from "./text.ts";

export enum NodeType {
  Glyph = -2,
  Rect = -1,
  TexturedRect = 0,
}
export const SAMPLE_COUNT = 4;

export const RECTANGLE_BUFFER_SIZE = 16 * 1024;

await loadFont();
const hooks: any = [];

let currentHook = 0;

export function h(tag: any, props: any, ...children: any[]) {
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
    currentHook = 0;
    const { children } = component();
    for (const child of children) {
      renderChild(child, app, event);
    }
    if (event.type == EventType.Draw) {
      app.render();
    }
  });
}

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
) {
  return {
    styles,
    children,
    textures,
    title,
  };
}

export function useState<T>(initialValue: T): [T, (T: T) => void] {
  const hook = hooks[currentHook] ?? initialValue;
  const i = currentHook;
  const setState = (value: any) => {
    hooks[i] = value;
  };
  currentHook++;
  return [hook, setState];
}

export function Fragment({ children = [] }: { children?: any[] }): any[] {
  return children;
}

export function Text(
  props: Partial<
    { position: Vec2; fontSize: number; color: Vec4; children: any[] }
  > = {},
) {
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

export function Rect(props: any = {}) {
  props.color ??= new Vec4(1, 1, 1, 1);
  props.position ??= new Vec2(0, 0);
  props.styles.width ??= 100;
  props.styles.height ??= 100;
  props.borderRadius ??= 0;
  props.size ??= new Vec2(props.styles.width, props.styles.height);
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
      props.onMouseScroll(props, event);
    }
    if (
      event.type == EventType.MouseMotion ||
      event.type == EventType.MouseButtonDown
    ) {
      // In bounds check.
      // Does not take into account border radius.
      if (
        event.x >= props.position.x &&
        event.x <= props.position.x + props.size.x &&
        event.y >= props.position.y &&
        event.y <= props.position.y + props.size.y
      ) {
        if (!mouseOver) {
          props.onMouseOver(props);
        }

        setMouseOver(true);
        if (event.type == EventType.MouseButtonDown) {
          props.onClick(props);
          setFocused(true);
          startTextInput();
        }
      } else if (mouseOver) {
        setMouseOver(false);
        setFocused(false);
        stopTextInput();
        props.onMouseOut(props);
      }
    }

    if (
      focused &&
      event.type == EventType.TextInput
    ) {
      props.onInput(props, event);
    } else if (focused && event.type == EventType.KeyDown) {
      props.onKeyDown(props, event);
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
export * from "./text.ts";
