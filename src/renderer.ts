// deno-lint-ignore-file no-explicit-any
import { RECTANGLE_BUFFER_SIZE, SAMPLE_COUNT } from "./constants.ts";
import { Vec2, Vec4 } from "./data.ts";
import { getTextShape, ttf2 } from "./text.ts";
import { NodeType } from "./types.ts";

class RectRenderer {
  rectangleData: Float32Array = new Float32Array(RECTANGLE_BUFFER_SIZE);
  rectangleCount = 0;

  vertexBuffer: GPUBuffer;
  rectangleBuffer: GPUBuffer;
  rectangleBindGroup!: GPUBindGroup;
  rectanglePipeline: GPURenderPipeline;
  width: number;
  height: number;
  sampler: GPUSampler;
  glyphSampler: GPUSampler;
  texture: GPUTexture;
  imageCount: number;

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

    // Image texture
    this.texture = device.createTexture({
      format: "rgba8unorm",
      size: [360, 360, 20],
      usage: GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.imageCount = 0;

    // Just regular full-screen quad consisting of two triangles.
    const vertices = [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];

    device.queue.writeBuffer(this.vertexBuffer, 0, new Float32Array(vertices));
  }

  setTextures(textures: any) {
    for (const texture of textures) {
      if (texture instanceof Promise) {
        const currentImageCount = this.imageCount;
        texture.then((texture) => {
          this.setImage(texture, currentImageCount);
          // Free up memory.
          delete texture.image;
        });
      } else {
        this.setImage(texture, this.imageCount);
      }
      this.imageCount += 1;
    }
  }

  setImage(
    source: any,
    idx: number,
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

export class Renderer {
  width!: number;
  height!: number;

  rectRenderer: RectRenderer;
  #fontAtlasFile = "./Inter.bin";

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

  setTextures(textures: any) {
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
