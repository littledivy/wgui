// deno-lint-ignore-file
// deno-fmt-ignore-file

export interface InstantiateResult {
  instance: WebAssembly.Instance;
  exports: {
    parse_ttf: typeof parse_ttf;
    Glyphs : typeof Glyphs ;
    TextShape : typeof TextShape 
  };
}

/** Gets if the Wasm module has been instantiated. */
export function isInstantiated(): boolean;

/** Options for instantiating a Wasm instance. */
export interface InstantiateOptions {
  /** Optional url to the Wasm file to instantiate. */
  url?: URL;
  /** Callback to decompress the raw Wasm file bytes before instantiating. */
  decompress?: (bytes: Uint8Array) => Uint8Array;
}

/** Instantiates an instance of the Wasm module returning its functions.
* @remarks It is safe to call this multiple times and once successfully
* loaded it will always return a reference to the same object. */
export function instantiate(opts?: InstantiateOptions): Promise<InstantiateResult["exports"]>;

/** Instantiates an instance of the Wasm module along with its exports.
 * @remarks It is safe to call this multiple times and once successfully
 * loaded it will always return a reference to the same object. */
export function instantiateWithInstance(opts?: InstantiateOptions): Promise<InstantiateResult>;

/**
* @param {Uint8Array} buffer
* @param {object} f
* @returns {Glyphs}
*/
export function parse_ttf(buffer: Uint8Array, f: object): Glyphs;
/**
*/
export class Glyphs {
  free(): void;
/**
* @returns {number}
*/
  get_atlas_width(): number;
/**
* @returns {number}
*/
  get_atlas_height(): number;
/**
* @param {string} text
* @param {number} size
* @param {Float32Array} positions
* @param {Float32Array} sizes
* @param {Float32Array} uvs
* @returns {TextShape}
*/
  get_text_shape(text: string, size: number, positions: Float32Array, sizes: Float32Array, uvs: Float32Array): TextShape;
}
/**
*/
export class TextShape {
  free(): void;
/**
*/
  height: number;
/**
*/
  width: number;
}
