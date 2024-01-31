// deno-lint-ignore-file no-explicit-any
import { EventType, WindowBuilder } from "sdl2";
import { SAMPLE_COUNT } from "./constants.ts";
import { Renderer } from "./renderer.ts";

export class InnerApp {
  #surface;
  #adapter;
  #window;
  renderer;

  #tasks = 0;

  constructor(window: any, surface: any, adapter: any, renderer: any) {
    this.#window = window;
    this.#surface = surface;
    this.#adapter = adapter;
    this.renderer = renderer;
  }

  static async initialize(
    width: number,
    height: number,
    textures: any,
  ): Promise<InnerApp> {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter!.requestDevice();

    const window = new WindowBuilder(
      "webgpu deno window",
      width,
      height,
    ).build();

    const surface = window.windowSurface();
    const context = surface.getContext("webgpu");
    context.configure({
      width,
      height,
      device,
      format: "bgra8unorm",
      alphaMode: "opaque",
    });

    const colorTexture = device.createTexture({
      label: "color",
      size: { width, height },
      sampleCount: SAMPLE_COUNT,
      format: "bgra8unorm",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    const colorTextureView = colorTexture.createView({ label: "color" });
    const renderer = new Renderer(
      width,
      height,
      device,
      context,
      colorTextureView,
    );

    renderer.loadFont();

    const app = new InnerApp(window, surface, context, renderer);
    const texturesTask = textures.map((texture: any) => {
      return app.addTask(texture);
    });
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
