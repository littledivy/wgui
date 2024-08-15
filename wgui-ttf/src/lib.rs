use std::collections::HashMap;
use ttf_parser::Face;
use wasm_bindgen::prelude::*;

mod pack;

#[wasm_bindgen]
pub struct Glyphs {
  #[allow(dead_code)]
  face: Face<'static>,
  #[allow(dead_code)]
  pack_width: f32,
  #[allow(dead_code)]
  pack_height: f32,
  #[allow(dead_code)]
  quads: HashMap<u32, Quad>,
  #[allow(dead_code)]
  uvs: HashMap<u32, [f32; 4]>,
}

#[derive(Debug)]
pub struct Quad {
  code: u32,
  #[allow(dead_code)]
  lsb: f32,
  #[allow(dead_code)]
  rsb: f32,
  #[allow(dead_code)]
  width: f32,
  #[allow(dead_code)]
  height: f32,
  y: f32,
  x: f32,
}

#[wasm_bindgen]
pub struct TextShape {
  #[allow(dead_code)]
  pub width: f32,
  #[allow(dead_code)]
  pub height: f32,
}

#[wasm_bindgen]
impl Glyphs {
  #[allow(dead_code)]
  #[wasm_bindgen]
  pub fn get_atlas_width(&self) -> f32 {
    self.pack_width
  }

  #[allow(dead_code)]
  #[wasm_bindgen]
  pub fn get_atlas_height(&self) -> f32 {
    self.pack_height
  }

  #[allow(dead_code)]
  #[wasm_bindgen]
  pub fn get_text_shape(
    &self,
    text: &str,
    size: f32,
    positions: &mut [f32],
    sizes: &mut [f32],
    uvs: &mut [f32],
  ) -> TextShape {
    let mut position_x = 0.0;
    let scale = (1.0 / self.face.units_per_em() as f32) * size;
    let padding = (ATLAS_GAP as f32 * size) / ATLAS_FONT_SIZE as f32;
    let cap_height = {
      let hheaa = self.face.tables().hhea;
      hheaa.ascender + hheaa.descender
    } as f32;
    let mut chars = text.chars();
    let mut i = 0;
    let mut iuv = 0;
    while let Some(mut c) = chars.next() {
      let Quad {
        lsb,
        rsb,
        width,
        height,
        y,
        ..
      } = self.quads.get(&(c as u32)).unwrap_or_else(|| {
        println!("missing glyph for {}", c);
        c = '?';
        self.quads.get(&('?' as u32)).unwrap()
      });

      let uv = self.uvs.get(&(c as u32)).unwrap();
      uvs[iuv] = uv[0];
      uvs[iuv + 1] = uv[1];
      uvs[iuv + 2] = uv[2];
      uvs[iuv + 3] = uv[3];

      positions[i] = position_x + *lsb as f32 * scale - padding;
      positions[i + 1] =
        (cap_height - *y as f32 - *height as f32) * scale - padding;

      sizes[i] = *width as f32 * scale + padding * 2.0;
      sizes[i + 1] = *height as f32 * scale + padding * 2.0;

      position_x += (*lsb + *width + *rsb) as f32 * scale;
      i += 2;
      iuv += 4;
    }

    TextShape {
      width: position_x,
      height: cap_height * size / self.face.units_per_em() as f32,
    }
  }
}

impl Drop for Glyphs {
  fn drop(&mut self) {
    println!("dropping glyphs");
  }
}

const ATLAS_FONT_SIZE: usize = 96;
const ATLAS_GAP: i16 = 6; // Half of the radius.
#[allow(dead_code)]
const ATLAS_RADIUS: usize = 12; // Roughly 1/6 of font size.

#[allow(dead_code)]
#[wasm_bindgen]
pub fn parse_ttf(buffer: Vec<u8>, f: &js_sys::Object) -> Glyphs {
  std::panic::set_hook(Box::new(console_error_panic_hook::hook));

  let buffer: &'static [u8] = Box::leak(buffer.into_boxed_slice());
  let face = Face::parse(buffer, 0).unwrap();

  let cmap = face.tables().cmap.unwrap();
  let hmtx = face.tables().hmtx.unwrap();

  let scale = (1.0 / face.units_per_em() as f32) * ATLAS_FONT_SIZE as f32;
  let mut sizes = Vec::new();
  let mut quads = Vec::new();
  let mut uvs = HashMap::new();
  for subtable in cmap.subtables {
    if !subtable.is_unicode() {
      continue;
    }

    subtable.codepoints(|code| {
      let Some(index) = subtable.glyph_index(code as u32) else {
        panic!("missing glyph for {}", code);
      };

      let bbox = face.glyph_bounding_box(index).unwrap_or_else(|| {
        println!("missing bbox for {}", code);
        face.glyph_bounding_box(ttf_parser::GlyphId(0)).unwrap()
      });
      let lsb = hmtx.side_bearing(index).unwrap();
      let advance = hmtx.advance(index).unwrap();

      let width = bbox.x_max - bbox.x_min;
      let height = bbox.y_max - bbox.y_min;

      let transform = |x: f32| (x * scale).ceil() as f32;

      let size = vec![
        transform(width as f32) + ATLAS_GAP as f32 * 2.0,
        transform(height as f32) + ATLAS_GAP as f32 * 2.0,
      ];
      if code == b'H' as u32 {
        println!("H: {:?}", size);
      }

      quads.push(Quad {
        code: code as u32,
        lsb: lsb as f32,
        rsb: advance as f32 - lsb as f32 - (width as f32),
        width: width as f32,
        height: height as f32,
        y: bbox.y_min as f32,
        x: bbox.x_min as f32,
      });

      sizes.push(size);
    });

    break;
  }

  let pack = pack::pack_shelves(sizes.clone());
  let mut i = 0;
  let mut quad_map = HashMap::new();
  for (rect, glyph) in pack.positions.into_iter().zip(quads) {
    let size = &sizes[i];
    let code = glyph.code;
    i += 1;
    uvs.insert(
      code,
      [
        rect.x as f32 / pack.width as f32,
        rect.y as f32 / pack.height as f32,
        size[0] as f32 / pack.width as f32,
        size[1] as f32 / pack.height as f32,
      ],
    );

    if let Some(f) = f.dyn_ref::<js_sys::Function>() {
      let this = JsValue::NULL;
      let code = JsValue::from(code);
      let x = JsValue::from(
        rect.x as f32 - glyph.x as f32 * scale + ATLAS_GAP as f32,
      );
      let y = JsValue::from(
        rect.y as f32 + size[1] as f32 + glyph.y as f32 * scale
          - ATLAS_GAP as f32,
      );
      let _ = f.call3(&this, &code, &x, &y);
    }

    quad_map.insert(code, glyph);
  }

  let glyphs = Glyphs {
    face,
    quads: quad_map,
    uvs,
    pack_width: pack.width,
    pack_height: pack.height,
  };
  glyphs
}
