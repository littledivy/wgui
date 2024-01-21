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
