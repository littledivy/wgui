// deno-lint-ignore-file no-explicit-any
import { EventType, type Window as SDL2Window, WindowBuilder } from "sdl2";
import { SAMPLE_COUNT } from "wgui";
import { Renderer } from "./renderer.ts";
import { Document } from "./layout.ts";

export class InnerApp {
  #surface: Deno.UnsafeWindowSurface;
  #adapter: GPUCanvasContext;
  #window: SDL2Window;
  renderer: Renderer;

  #tasks = 0;
  #docID: number;

  constructor(
    window: SDL2Window,
    surface: Deno.UnsafeWindowSurface,
    adapter: GPUCanvasContext,
    renderer: Renderer,
    docID: number,
  ) {
    this.#window = window;
    this.#surface = surface;
    this.#adapter = adapter;
    this.renderer = renderer;
    this.#docID = docID;
    this.renderer.setDocID(docID);
  }

  static async initialize(
    style: any,
    textures: any,
    title = "webgpu deno window",
  ): Promise<InnerApp> {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter!.requestDevice();

    const window = new WindowBuilder(
      title,
      style.width,
      style.height,
    ).build();

    const surface = window.windowSurface();
    const context = surface.getContext("webgpu");
    context.configure({
      width: style.width,
      height: style.height,
      device,
      format: "bgra8unorm",
      alphaMode: "opaque",
    });

    const colorTexture = device.createTexture({
      label: "color",
      size: { width: style.width, height: style.height },
      sampleCount: SAMPLE_COUNT,
      format: "bgra8unorm",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    const colorTextureView = colorTexture.createView({ label: "color" });
    const renderer = new Renderer(
      style.width,
      style.height,
      device,
      context,
      colorTextureView,
    );

    renderer.loadFont();
    const docID = Document.createDocument({
      width: style.width,
      height: style.height,
    });
    const app = new InnerApp(window, surface, context, renderer, docID);
    const texturesTask = textures.map((texture: any) => app.addTask(texture));
    renderer.setTextures(texturesTask);
    return app;
  }

  addTask(promise: any) {
    this.#tasks++;
    return promise.then((p: any) => {
      this.#tasks--;
      return p;
    });
  }

  // deno-lint-ignore require-await
  async start(fn: (h: any) => void) {
    // Process all events and reschedule frame
    const frame = async () => {
      for (;;) {
        const { value: event } = await this.#window.events(this.#tasks == 0)
          .next();
        if (event.type === EventType.Quit) {
          Deno.exit(0);
        }

        fn(event);

        // No pending tasks. Give CPU back to OS.
        if (this.#tasks == 0) {
          fn({ type: EventType.Draw });
        } else {
          // There are pending tasks. Run microtasks and reschedule frame.
          setTimeout(frame, 0);
          break;
        }
      }
    };

    frame();
  }

  render() {
    this.renderer.render();
    this.#surface.present();
  }
}
