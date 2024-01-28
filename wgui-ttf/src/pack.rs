#[derive(Debug, Clone, Copy)]
pub struct Rectangle {
    id: usize,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

#[derive(Debug)]
pub struct Packing {
    pub width: f32,
    pub height: f32,
    pub positions: Vec<Rectangle>,
}

fn ceil_pow2(value: f32) -> f32 {
    let mut value = value as u32;
    value -= 1;
    value |= value >> 1;
    value |= value >> 2;
    value |= value >> 4;
    value |= value >> 8;
    value |= value >> 16;
    value += 1;
    value as f32
}

pub fn pack_shelves(sizes: Vec<Vec<f32>>) -> Packing {
    let mut area: f32 = 0.0;
    let mut max_width: f32 = 0.0;

    let mut rectangles: Vec<Rectangle> = sizes
        .iter()
        .enumerate()
        .map(|(i, size)| Rectangle {
            id: i,
            x: 0.0,
            y: 0.0,
            width: size[0],
            height: size[1],
        })
        .collect();

    for rect in &rectangles {
        area += rect.width * rect.height;
        max_width = max_width.max(rect.width);
    }
    rectangles.sort_by(|a, b| b.height.partial_cmp(&a.height).unwrap());

    // Aim for a squarish resulting container. Slightly adjusted for sub-100%
    // space utilization.
    let start_width = (area / 0.95).sqrt().ceil().max(max_width);
    let mut regions = vec![Rectangle {
        x: 0.0,
        y: 0.0,
        width: start_width,
        height: f32::INFINITY,
        id: 0,
    }];

    let mut width: f32 = 0.0;
    let mut height: f32 = 0.0;

    for rect in &mut rectangles {
        for i in (0..regions.len()).rev() {
            let region = &mut regions[i];
            if rect.width > region.width || rect.height > region.height {
                continue;
            }

            rect.x = region.x;
            rect.y = region.y;
            height = height.max(rect.y + rect.height);
            width = width.max(rect.x + rect.width);

            if rect.width == region.width && rect.height == region.height {
                let last = regions.pop().expect("Regions array should not be empty.");
                if i < regions.len() {
                    regions[i] = last;
                }
            } else if rect.height == region.height {
                region.x += rect.width;
                region.width -= rect.width;
            } else if rect.width == region.width {
                region.y += rect.height;
                region.height -= rect.height;
            } else {
                let r = Rectangle {
                    x: region.x + rect.width,
                    y: region.y,
                    width: region.width - rect.width,
                    height: rect.height,
                    id: usize::MAX,
                };

                
                region.y += rect.height;
                region.height -= rect.height;

                regions.push (r);
            }
            break;
        }
    }

    let size = ceil_pow2(width).max(ceil_pow2(height));
    rectangles.sort_by_key(|rect| rect.id);

    Packing {
        width: size,
        height: size,
        positions: rectangles.clone(),
    }
}
