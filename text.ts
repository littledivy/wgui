/**
 * @module wgui/text
 * 
 * This module provides text rendering utilities.
 */
import { instantiate } from "./wgui-ttf/wgui_ttf.generated.js";

// deno-lint-ignore no-explicit-any
export let ttf2: any;

function fileExistsDontCareAboutTOCTOUDontComeAfterMePls(
  path: string,
): boolean {
  try {
    Deno.statSync(path);
    return true;
  } catch {
    return false;
  }
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
  let q: number;
  let k: number;
  let s: number;
  let r: number;

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

/**
 * Convert an image to a signed distance field.
 * @example
 * ```ts
 * const imageData = new ImageData(100, 100);
 * const sdf = toSDF(imageData, 100, 100, 8);
 * ```
 */
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

/**
 * Load a font from a TTF file.
 * @example
 * ```ts
 * await loadFont("HolySansMono", "./"); // loads the font from ./HolySansMono.ttf
 * ```
 */
export async function loadFont(
  fileName = "Inter",
  outputDir = "./",
): Promise<void> {
  const { parse_ttf } = await instantiate();
  const fontAtlas = `${outputDir}${fileName}.bin`;
  if (!fileExistsDontCareAboutTOCTOUDontComeAfterMePls(fontAtlas)) {
    const { createCanvas, Fonts } = await import(
      "jsr:@gfx/canvas@0.5.6"
    );

    const canvas = createCanvas(4096, 4096);
    const context = canvas.getContext("2d");

    const buffer = Deno.readFileSync(`${outputDir}${fileName}.ttf`);
    const fontName = "FontForAtlas";
    Fonts.register(buffer, fontName);

    context.font = `96px ${fontName}`;
    const renderAtlasCallback = (
      charcode: number,
      x: number,
      y: number,
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
      imageData as ImageData,
      atlasWidth,
      atlasHeight,
      8,
    );
    // deno-lint-ignore no-explicit-any
    context.putImageData(sdf as any, 0, 0);
    const sdfImageData = context.getImageData(
      0,
      0,
      atlasWidth,
      atlasHeight,
    );

    Deno.writeFileSync(fontAtlas, new Uint8Array(sdfImageData.data.buffer));
    canvas.save(`${outputDir}${fileName}.png`, "png");
  }

  Deno.readFile(`${outputDir}${fileName}.ttf`).then((buffer) => {
    ttf2 = parse_ttf(buffer, {});
  });
}

/**
 * Get the shape of a text.
 * @example
 * ```ts
 * const { positions, sizes, uvs } = getTextShape("Hello, World!", 24);
 * ```
 */
export function getTextShape(
  text: string,
  size: number,
): {
  positions: Float32Array;
  sizes: Float32Array;
  uvs: Float32Array;
} {
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
