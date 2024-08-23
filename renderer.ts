// deno-lint-ignore-file no-explicit-any
import { Vec2, Vec4 } from "./data.ts";
import { getTextShape, ttf2 } from "./text.ts";
import { NodeType, RECTANGLE_BUFFER_SIZE, SAMPLE_COUNT } from "wgui";

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
  #device: GPUDevice;
  #context: GPUCanvasContext;

  constructor(
    width: number,
    height: number,
    device: GPUDevice,
    context: GPUCanvasContext,
  ) {
    this.#device = device;
    this.#context = context;
    this.width = width;
    this.height = height;

    // make sure to match with wgui.wgsl
    const rectangleModule = this.#device.createShaderModule({
      code: `
struct VertexInput {
  @location(0) position: vec2f,
  @builtin(instance_index) instance: u32,
  @builtin(vertex_index) vertex_index: u32
};

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(1) @interpolate(flat) instance: u32,
  @location(2) texcoord: vec2f,
  @location(3) uv: vec2f,
};

struct Rectangle {
  color: vec4f,
  position: vec2f,
  usage: f32, // also acts as texture index
  radius: f32, // also acts as fontSize
  size: vec2f,
  window: vec2f,

  uv: vec2f,
  uvSize: vec2f,
};

struct UniformStorage {
  rectangles: array<Rectangle>,
};

@group(0) @binding(0) var<storage> data: UniformStorage;

@group(0) @binding(1) var bSampler: sampler;
@group(0) @binding(2) var texture: texture_2d_array<f32>;

@group(0) @binding(3) var fontAtlasSampler: sampler;
@group(0) @binding(4) var fontAtlas: texture_2d<f32>;

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  let r = data.rectangles[input.instance];
  let vertex = mix(
    r.position.xy,
    r.position.xy + r.size,
    input.position
  );

  output.position = vec4f(vertex / r.window * 2.0 - 1.0, 0.0, 1.0);
  output.position.y = -output.position.y;
  output.instance = input.instance;
		var vertices = array<vec2f, 6>(
			vec2f( - 0.5, 0.5 ),
			vec2f( 0.5, 0.5 ),
			vec2f( - 0.5, - 0.5 ),

			vec2f( - 0.5, - 0.5 ),
			vec2f( 0.5, 0.5 ),
			vec2f( 0.5, - 0.5 ),
		);
  let xy = vertices[input.vertex_index];
  output.texcoord = vec2f(xy.x + 0.5, -xy.y + 0.5);
  output.uv = mix(r.uv, r.uv + r.uvSize, input.position);

  return output;
}

fn round_rect(p: vec2<f32>, b: vec2<f32>, r: f32) -> f32 {
    let q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, vec2(0.0))) - r;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  let r = data.rectangles[input.instance];
  var alpha: f32 = r.color.a;

  switch (i32(r.usage)) {
    // glyph
    case -2: {
        let distance = textureSample(fontAtlas, fontAtlasSampler, input.uv).a;
        var width = mix(0.4, 0.2, clamp(r.radius, 0.0, 90.0) / 90.0);
        alpha *= smoothstep(0.6 - width, 0.6 + width, distance);
    }
    default: {
      // ...
      if (r.radius > 0.0) {
        let position = input.position.xy;
        let center = r.position + r.size * 0.5;

        let dist_radius = clamp(round_rect(
            position - center,
            r.size * 0.5,
            r.radius),
        0.0, 1.0);
        alpha *= (1.0 - dist_radius);
      }
    }
  }

  if (r.usage >= 0.0) {
        let color = textureSample(texture, bSampler, input.texcoord, u32(r.usage));
        return vec4f(color.rgb, alpha * color.a);
  }
 
  return vec4f(r.color.rgb, alpha);
}

      `,
    });

    this.vertexBuffer = this.#device.createBuffer({
      label: "vertex",
      // Just two triangles.
      size: 2 * 2 * 3 * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.rectangleBuffer = this.#device.createBuffer({
      label: "rectangle",
      size: RECTANGLE_BUFFER_SIZE * Float32Array.BYTES_PER_ELEMENT,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    const rectangleBindGroupLayout = this.#device.createBindGroupLayout({
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

    const rectanglePipelineLayout = this.#device.createPipelineLayout({
      label: "rectangle pipeline layout",
      bindGroupLayouts: [rectangleBindGroupLayout],
    });

    this.rectanglePipeline = this.#device.createRenderPipeline({
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

    this.sampler = this.#device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "nearest",
      minFilter: "nearest",
    });

    this.glyphSampler = this.#device.createSampler({
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      magFilter: "nearest",
      minFilter: "nearest",
    });

    // Image texture
    this.texture = this.#device.createTexture({
      format: "rgba8unorm",
      size: [360, 360, 20],
      usage: GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.imageCount = 0;

    // Just regular full-screen quad consisting of two triangles.
    const vertices = [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];

    this.#device.queue.writeBuffer(
      this.vertexBuffer,
      0,
      new Float32Array(vertices),
    );
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
    this.#device.queue.writeTexture(
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
    this.rectangleBindGroup = this.#device.createBindGroup({
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

    this.#device.queue.writeBuffer(this.rectangleBuffer, 0, this.rectangleData);

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
  #device: GPUDevice;
  #context: GPUCanvasContext;
  #colorTextureView: GPUTextureView;
  #fontAtlasFile = "./Inter.bin";
  #docID!: number;

  constructor(
    width: number,
    height: number,
    device: GPUDevice,
    context: GPUCanvasContext,
    colorTextureView: GPUTextureView,
  ) {
    this.#device = device;
    this.#context = context;
    this.#colorTextureView = colorTextureView;
    this.rectRenderer = new RectRenderer(
      width,
      height,
      this.#device,
      this.#context,
    );
  }

  setDocID(docID: number) {
    this.#docID = docID;
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

    const texture = this.#device.createTexture({
      label: "image bitmap",
      size,
      format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.#device.queue.writeTexture(
      { texture },
      data,
      { bytesPerRow: size.width * 4 },
      size,
    );

    this.rectRenderer.setFont(texture);
  }

  render(): void {
    const commandEncoder = this.#device.createCommandEncoder({
      label: "render pass",
    });

    const target = this.#context.getCurrentTexture().createView();
    this.rectRenderer.render(
      commandEncoder,
      this.#colorTextureView,
      target,
      "clear",
    );
    this.#device.queue.submit([commandEncoder.finish()]);
  }
}
