import { EventType, startTextInput, stopTextInput, WindowBuilder } from "sdl2";

import { decode } from "https://deno.land/x/pngs/mod.ts";
import { instantiate } from "./ttf/wgui_ttf.generated.js";

export class InnerApp {
  #surface;
  #adapter;
  #window;
  renderer;

  #tasks = 0;

  constructor(window, surface, adapter, renderer) {
    this.#window = window;
    this.#surface = surface;
    this.#adapter = adapter;
    this.renderer = renderer;
  }

  static async initialize(
    width: number,
    height: number,
    textures,
  ): Promise<App> {
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter.requestDevice();

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
    const texturesTask = textures.map((texture) => {
      return app.addTask(texture);
    });
    renderer.setTextures(texturesTask);
    return app;
  }

  addTask(promise) {
    this.#tasks++;
    return promise.then((p) => {
      this.#tasks--;
      return p;
    });
  }

  async start(fn: (event: EventType) => void) {
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

// deno-lint-ignore no-explicit-any
export function h(tag: string, props: any, ...children: any[]) {
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

export async function App(
  { width = 800, height = 600, children, textures = [] }: { width?: number; height?: number; children?: any[]; textures?: any[] },
) {
  const app = await InnerApp.initialize(width, height, textures);
  function renderChild(child, app, event) {
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
    for (const child of children) {
      renderChild(child, app, event);
    }
    if (event.type == EventType.Draw) {
      app.render();
    }
  });
}

export function Fragment({ children }) {
  return children;
}

export function Text(props = {}) {
  return (app, event) => {
    if (event.type == EventType.Draw) {
      app.renderer.text(
        props.children[0]() || " ",
        props.position ?? new Vec2(0, 0),
        props.fontSize ?? 16,
        props.color ?? new Vec4(1, 1, 1, 1),
      );
    }
  };
}

export function Rect(props = {}) {
  props.color ??= new Vec4(1, 1, 1, 1);
  props.position ??= new Vec2(0, 0);
  props.size ??= new Vec2(100, 100);
  props.borderRadius ??= 0;

  const nop = () => {};
  props.onMouseOver ??= nop;
  props.onMouseOut ??= nop;
  props.onClick ??= nop;
  props.onInput ??= nop;
  props.onScroll ??= nop;
  props.onKeyDown ??= nop;

  props.focused = false;
  let mouseOver = false;
  return (app, event) => {
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

        mouseOver = true;
        if (!props.focused && event.type == EventType.MouseButtonDown) {
          props.onClick(props);
          props.focused = true;
          startTextInput();
        }
      } else if (mouseOver) {
        mouseOver = false;
        props.focused = false;
        stopTextInput();
        props.onMouseOut(props);
      }
    }

    if (
      props.focused &&
      event.type == EventType.TextInput
    ) {
      props.onInput(props, event);
    } else if (props.focused && event.type == EventType.KeyDown) {
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

const defaultImage = Deno.readFileSync("./apple-music.png");
const DEFAULT_TEXTURE = decode(defaultImage);

enum NodeType {
  Glyph = -2,
  Rect = -1,
  TexturedRect = 0,
}

export const SAMPLE_COUNT = 4;

const RECTANGLE_BUFFER_SIZE = 16 * 1024;

class RectRenderer {
  rectangleData: Float32Array = new Float32Array(RECTANGLE_BUFFER_SIZE);
  rectangleCount = 0;

  vertexBuffer: GPUBuffer;
  rectangleBuffer: GPUBuffer;
  rectangleBindGroup: GPUBindGroup;
  rectanglePipeline: GPURenderPipeline;

  constructor(
    width: number,
    height: number,
    private device: GPUDevice,
    private readonly context: GPUCanvasContext,
  ) {
    this.width = width;
    this.height = height;

    const rectWgsl = new URL("wgui.wgsl", import.meta.url);
    const rectangleModule = device.createShaderModule({
      code: Deno.readTextFileSync(rectWgsl),
    });

    this.vertexBuffer = device.createBuffer({
      label: "vertex",
      // Just two triangles.
      size: 2 * 2 * 3 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.rectangleBuffer = device.createBuffer({
      label: "rectangle",
      size: RECTANGLE_BUFFER_SIZE * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const rectangleBindGroupLayout = device.createBindGroupLayout({
      label: "rectangle bind group layout",
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
        // texture support
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          texture: {
            sampleType: "float",
            viewDimension: "2d-array",
          },
        },
        // glyph texture support
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float" },
        },
      ],
    });

    const rectanglePipelineLayout = device.createPipelineLayout({
      label: "rectangle pipeline layout",
      bindGroupLayouts: [rectangleBindGroupLayout],
    });

    this.rectanglePipeline = device.createRenderPipeline({
      label: "blurred rectangles",
      layout: rectanglePipelineLayout,
      vertex: {
        module: rectangleModule,
        entryPoint: "vertexMain",
        buffers: [
          {
            arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: "float32x2",
              },
            ],
          },
        ],
      },
      fragment: {
        module: rectangleModule,
        entryPoint: "fragmentMain",
        targets: [
          {
            format: "bgra8unorm",
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
              },
              alpha: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
              },
            },
          },
        ],
      },
      multisample: { count: SAMPLE_COUNT },
    });

    this.sampler = device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "nearest",
      minFilter: "nearest",
    });

    this.glyphSampler = device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "nearest",
      minFilter: "nearest",
    });
    const source = DEFAULT_TEXTURE;

    // Image texture
    this.texture = device.createTexture({
      format: "rgba8unorm",
      size: [source.width, source.height, 20],
      usage: GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    device.queue.writeTexture(
      { texture: this.texture },
      source.image,
      { bytesPerRow: source.width * 4 },
      [source.width, source.height, 1],
    );

    this.imageCount = 0;

    // Just regular full-screen quad consisting of two triangles.
    const vertices = [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];

    device.queue.writeBuffer(this.vertexBuffer, 0, new Float32Array(vertices));
  }

  setTextures(textures) {
    for (const texture of textures) {
      if (texture instanceof Promise) {
        const currentImageCount = this.imageCount;
        texture.then((texture) => {
          this.setImage(texture, currentImageCount);
        });
        this.setImage(DEFAULT_TEXTURE, this.imageCount);
      } else {
        this.setImage(texture, this.imageCount);
      }
      this.imageCount += 1;
    }
  }

  setImage(
    source,
    idx,
  ) {
    this.device.queue.writeTexture(
      {
        texture: this.texture,
        origin: [0, 0, idx],
      },
      source.image,
      {
        bytesPerRow: source.width * 4,
        rowsPerImage: source.height,
      },
      [source.width, source.height],
    );

    source = undefined;
  }

  setFont(texture: GPUTexture) {
    this.rectangleBindGroup = this.device.createBindGroup({
      label: "rectangles",
      layout: this.rectanglePipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.rectangleBuffer },
        },
        {
          binding: 1,
          resource: this.sampler,
        },
        {
          binding: 2,
          resource: this.texture.createView({
            dimension: "2d-array",
          }),
        },
        {
          binding: 3,
          resource: this.glyphSampler,
        },
        {
          binding: 4,
          resource: texture.createView(),
        },
      ],
    });
  }

  render(
    commandEncoder: GPUCommandEncoder,
    view: GPUTextureView,
    resolveTarget: GPUTextureView,
    loadOp: GPULoadOp,
  ): void {
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view,
          resolveTarget,
          clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1.0 },
          loadOp,
          storeOp: "store",
        },
      ],
    });

    this.device.queue.writeBuffer(this.rectangleBuffer, 0, this.rectangleData);

    renderPass.setViewport(
      0,
      0,
      this.width,
      this.height,
      0,
      1,
    );
    renderPass.setVertexBuffer(0, this.vertexBuffer);

    renderPass.setPipeline(this.rectanglePipeline);
    renderPass.setBindGroup(0, this.rectangleBindGroup);
    renderPass.draw(6, this.rectangleCount);
    renderPass.end();

    this.rectangleCount = 0;
  }

  addRect(
    color: Vec4,
    position: Vec2,
    size: Vec2,
    usage: number = NodeType.Rect,
    borderRadius = 0,
    uv: Vec4 = new Vec4(0, 0, 1, 1),
  ) {
    const struct = 16;
    this.rectangleData[this.rectangleCount * struct + 0] = color.x;
    this.rectangleData[this.rectangleCount * struct + 1] = color.y;
    this.rectangleData[this.rectangleCount * struct + 2] = color.z;
    this.rectangleData[this.rectangleCount * struct + 3] = color.w;
    this.rectangleData[this.rectangleCount * struct + 4] = position.x;
    this.rectangleData[this.rectangleCount * struct + 5] = position.y;
    this.rectangleData[this.rectangleCount * struct + 6] = usage;
    this.rectangleData[this.rectangleCount * struct + 7] = borderRadius;
    this.rectangleData[this.rectangleCount * struct + 8] = size.x;
    this.rectangleData[this.rectangleCount * struct + 9] = size.y;
    this.rectangleData[this.rectangleCount * struct + 10] = this.width;
    this.rectangleData[this.rectangleCount * struct + 11] = this.height;
    this.rectangleData[this.rectangleCount * struct + 12] = uv.x;
    this.rectangleData[this.rectangleCount * struct + 13] = uv.y;
    this.rectangleData[this.rectangleCount * struct + 14] = uv.z;
    this.rectangleData[this.rectangleCount * struct + 15] = uv.w;

    this.rectangleCount += 1;
  }

  text(text: string, position: Vec2, fontSize: number, color: Vec4): void {
    const shape = getTextShape(text, fontSize);

    let j = 0;
    for (let i = 0; i < shape.positions.length; i += 2) {
      const shapePosition = new Vec2(
        shape.positions[i] + position.x,
        shape.positions[i + 1] + position.y,
      );
      const size = new Vec2(shape.sizes[i], shape.sizes[i + 1]);

      const uv = new Vec4(
        shape.uvs[j],
        shape.uvs[j + 1],
        shape.uvs[j + 2],
        shape.uvs[j + 3],
      );
      if (!uv) {
        throw new Error("No uv for character.");
      }
      j += 4;

      this.addRect(color, shapePosition, size, NodeType.Glyph, fontSize, uv);
    }
  }
}

function fileExistsDontCareAboutTOCTOUDontComeAfterMePls(path: string) {
  try {
    Deno.statSync(path);
    return true;
  } catch {
    return false;
  }
}

// http://cs.brown.edu/people/pfelzens/papers/dt-final.pdf
export function toSDF(
  imageData: ImageData,
  width: number,
  height: number,
  radius: number,
): ImageData {
  const gridOuter = new Float64Array(width * height);
  const gridInner = new Float64Array(width * height);

  const INF = 1e20;
  for (let i = 0; i < width * height; i++) {
    const a = imageData.data[i * 4 + 3]! / 255; // Alpha value.

    if (a === 1) {
      gridOuter[i] = 0;
      gridInner[i] = INF;
    } else if (a === 0) {
      gridOuter[i] = INF;
      gridInner[i] = 0;
    } else {
      const d = 0.5 - a;
      gridOuter[i] = d > 0 ? d * d : 0;
      gridInner[i] = d < 0 ? d * d : 0;
    }
  }

  const size = Math.max(width, height);
  const f = new Float64Array(size);
  const z = new Float64Array(size + 1);
  const v = new Uint16Array(size * 2);

  edt(gridOuter, width, height, f, v, z);
  edt(gridInner, width, height, f, v, z);

  const alphaChannel = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const d = Math.sqrt(gridOuter[i]!) - Math.sqrt(gridInner[i]!);
    alphaChannel[i] = Math.round(255 - 255 * (d / radius + 0.25));
  }

  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[4 * i + 0] = alphaChannel[i]!;
    data[4 * i + 1] = alphaChannel[i]!;
    data[4 * i + 2] = alphaChannel[i]!;
    data[4 * i + 3] = alphaChannel[i]!;
  }

  return new ImageData(data, width, height);
}

const INF = 1e20;

// 1D squared distance transform.
function edt1d(
  grid: Float64Array,
  offset: number,
  stride: number,
  length: number,
  f: Float64Array,
  v: Uint16Array,
  z: Float64Array,
): void {
  let q: number, k: number, s: number, r: number;

  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;

  for (q = 0; q < length; q++) {
    f[q] = grid[offset + q * stride]!;
  }

  for (q = 1, k = 0, s = 0; q < length; q++) {
    do {
      r = v[k]!;
      s = (f[q]! - f[r]! + q * q - r * r) / (q - r) / 2;
    } while (s <= z[k]! && --k > -1);

    k++;

    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  for (q = 0, k = 0; q < length; q++) {
    while (z[k + 1]! < q) {
      k++;
    }

    r = v[k]!;
    grid[offset + q * stride] = f[r]! + (q - r) * (q - r);
  }
}

function edt(
  data: Float64Array,
  width: number,
  height: number,
  f: Float64Array,
  v: Uint16Array,
  z: Float64Array,
): void {
  for (let x = 0; x < width; x++) {
    edt1d(data, x, width, height, f, v, z);
  }
  for (let y = 0; y < height; y++) {
    edt1d(data, y * width, 1, width, f, v, z);
  }
}

let ttf2;
async function loadFont() {
  const { parse_ttf } = await instantiate();
  const fontAtlas = "./Inter.bin";
  if (!fileExistsDontCareAboutTOCTOUDontComeAfterMePls(fontAtlas)) {
    const { createCanvas } = await import("https://deno.land/x/canvas/mod.ts");

    const canvas = createCanvas(4096, 4096);
    const context = canvas.getContext("2d");

    const buffer = Deno.readFileSync("./Inter.ttf");
    const fontName = "FontForAtlas";
    canvas.loadFont(buffer, {
      family: fontName,
      style: "normal",
      weight: "normal",
      variant: "normal",
    });

    context.font = `96px ${fontName}`;
    const renderAtlasCallback = (
      charcode,
      x,
      y,
    ) => {
      context.fillStyle = "rgba(255, 255, 255, 1)";
      context.fillText(
        String.fromCharCode(charcode),
        x,
        y,
      );
    };

    ttf2 = parse_ttf(buffer, renderAtlasCallback);

    const atlasWidth = ttf2.get_atlas_width();
    const atlasHeight = ttf2.get_atlas_height();

    const imageData = context.getImageData(
      0,
      0,
      atlasWidth,
      atlasHeight,
    );
    const sdf = toSDF(
      imageData,
      atlasWidth,
      atlasHeight,
      8,
    );
    context.putImageData(sdf, 0, 0);
    const sdfImageData = context.getImageData(
      0,
      0,
      atlasWidth,
      atlasHeight,
    );

    Deno.writeFileSync(fontAtlas, new Uint8Array(sdfImageData.data.buffer));
    Deno.writeFileSync("./Inter.png", new Uint8Array(canvas.toBuffer()));
  }

  Deno.readFile("./Inter.ttf").then((buffer) => {
    ttf2 = parse_ttf(buffer);
  });
}

await loadFont();

export function getTextShape(
  text: string,
  size: number,
) {
  const positions = new Float32Array(text.length * 2);
  const sizes = new Float32Array(text.length * 2);
  const uvs = new Float32Array(text.length * 4);

  ttf2.get_text_shape(text, size, positions, sizes, uvs);

  return {
    positions,
    sizes,
    uvs,
  };
}
export class Renderer {
  width: number;
  height: number;

  rectRenderer: RectRenderer;

  constructor(
    width: number,
    height: number,
    private device: GPUDevice,
    private readonly context: GPUCanvasContext,
    private colorTextureView: GPUTextureView,
  ) {
    this.rectRenderer = new RectRenderer(
      width,
      height,
      device,
      context,
    );
  }

  setTextures(textures) {
    this.rectRenderer.setTextures(textures);
  }

  rectangle(
    color: Vec4,
    position: Vec2,
    size: Vec2,
    sigma: number,
    usage: number = NodeType.Rect,
  ): void {
    this.rectRenderer.addRect(color, position, size, sigma, usage);
  }

  text(text: string, position: Vec2, fontSize: number, color: Vec4): void {
    if (!ttf2) return;
    this.rectRenderer.text(text, position, fontSize, color);
  }

  #fontAtlasFile = "./Inter.bin";
  loadFont() {
    const data = Deno.readFileSync(this.#fontAtlasFile);
    const size = { width: 4096, height: 4096 };

    const texture = this.device.createTexture({
      label: "image bitmap",
      size,
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.writeTexture(
      { texture },
      data,
      { bytesPerRow: size.width * 4 },
      size,
    );

    this.rectRenderer.setFont(texture);
  }

  render(): void {
    const commandEncoder = this.device.createCommandEncoder({
      label: "render pass",
    });

    const target = this.context.getCurrentTexture().createView();
    this.rectRenderer.render(
      commandEncoder,
      this.colorTextureView,
      target,
      "clear",
    );
    this.device.queue.submit([commandEncoder.finish()]);
  }
}

export class Layout {
  constructor(
    width: number,
    height: number,
  ) {
    this.width = width;
    this.height = height;
  }

  width: number;
  height: number;

  get center(): Vec2 {
    return new Vec2(this.width / 2, this.height / 2);
  }

  get topLeft(): Vec2 {
    return new Vec2(0, 0);
  }

  get topRight(): Vec2 {
    return new Vec2(this.width, 0);
  }

  get bottomLeft(): Vec2 {
    return new Vec2(0, this.height);
  }

  get bottomRight(): Vec2 {
    return new Vec2(this.width, this.height);
  }
}

const EPSILON = 0.001;

/**
 * A 2D vector.
 */
export class Vec2 {
  constructor(public readonly x: number, public readonly y: number) {}

  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vec2 {
    const length = this.length();
    return new Vec2(this.x / length, this.y / length);
  }

  scale(scalar: number): Vec2 {
    return new Vec2(this.x * scalar, this.y * scalar);
  }

  cross(other: Vec2): number {
    return this.x * other.y - this.y * other.x;
  }

  dot(other: Vec2): number {
    return this.x * other.x + this.y * other.y;
  }

  distance(other: Vec2): number {
    return this.subtract(other).length();
  }

  lerp(other: Vec2, t: number): Vec2 {
    return this.add(other.subtract(this).scale(t));
  }

  equalsEpsilon(other: Vec2, epsilon: number): boolean {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon
    );
  }

  equals(other: Vec2): boolean {
    return this.equalsEpsilon(other, EPSILON);
  }
}

/**
 * A 4-dimensional vector.
 */
export class Vec4 {
  constructor(
    public readonly x: number,
    public readonly y: number,
    public readonly z: number,
    public readonly w: number,
  ) {}

  add(other: Vec4): Vec4 {
    return new Vec4(
      this.x + other.x,
      this.y + other.y,
      this.z + other.z,
      this.w + other.w,
    );
  }

  subtract(other: Vec4): Vec4 {
    return new Vec4(
      this.x - other.x,
      this.y - other.y,
      this.z - other.z,
      this.w - other.w,
    );
  }

  length(): number {
    return Math.sqrt(
      this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w,
    );
  }

  normalize(): Vec4 {
    const length = this.length();
    return new Vec4(
      this.x / length,
      this.y / length,
      this.z / length,
      this.w / length,
    );
  }

  scale(scalar: number): Vec4 {
    return new Vec4(
      this.x * scalar,
      this.y * scalar,
      this.z * scalar,
      this.w * scalar,
    );
  }

  cross(other: Vec4): Vec4 {
    return new Vec4(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x,
      0,
    );
  }

  dot(other: Vec4): number {
    return (
      this.x * other.x + this.y * other.y + this.z * other.z + this.w * other.w
    );
  }

  distance(other: Vec4): number {
    return this.subtract(other).length();
  }

  lerp(other: Vec4, t: number): Vec4 {
    return this.add(other.subtract(this).scale(t));
  }

  equalsEpsilon(other: Vec4, epsilon: number): boolean {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon &&
      Math.abs(this.z - other.z) < epsilon &&
      Math.abs(this.w - other.w) < epsilon
    );
  }

  equals(other: Vec4): boolean {
    return this.equalsEpsilon(other, EPSILON);
  }
}
