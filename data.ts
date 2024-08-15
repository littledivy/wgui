/**
 * Layout of the window.
 */
export class Layout {
  /**
   * layout width
   */
  readonly width: number;

  /**
   * layout height
   */
  readonly height: number;

  constructor(
    width: number,
    height: number,
  ) {
    this.width = width;
    this.height = height;
  }

  /**
   * Get the center of the layout.
   */
  get center(): Vec2 {
    return new Vec2(this.width / 2, this.height / 2);
  }

  /**
   * Get the top left corner of the layout.
   */
  get topLeft(): Vec2 {
    return new Vec2(0, 0);
  }

  /**
   * Get the top right corner of the layout.
   */
  get topRight(): Vec2 {
    return new Vec2(this.width, 0);
  }

  /**
   * Get the bottom left corner of the layout.
   */
  get bottomLeft(): Vec2 {
    return new Vec2(0, this.height);
  }

  /**
   * Get the bottom right corner of the layout.
   */
  get bottomRight(): Vec2 {
    return new Vec2(this.width, this.height);
  }
}

const EPSILON = 0.001;

/**
 * A 2D vector.
 */
export class Vec2 {
  /**
   * x coordinate
   */
  readonly x: number;

  /**
   * y coordinate
   */
  readonly y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /**
   * Add two vectors.
   */
  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  /**
   * Subtract two vectors.
   */
  subtract(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  /**
   * Get the length of the vector
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /**
   * Normalize the vector.
   */
  normalize(): Vec2 {
    const length = this.length();
    return new Vec2(this.x / length, this.y / length);
  }

  /**
   * Scale the vector by a scalar.
   */
  scale(scalar: number): Vec2 {
    return new Vec2(this.x * scalar, this.y * scalar);
  }

  /**
   * Get the cross product of two vectors.
   */
  cross(other: Vec2): number {
    return this.x * other.y - this.y * other.x;
  }

  /**
   * Get the dot product of two vectors.
   */
  dot(other: Vec2): number {
    return this.x * other.x + this.y * other.y;
  }

  /**
   * Get the distance between two vectors.
   */
  distance(other: Vec2): number {
    return this.subtract(other).length();
  }

  /**
   * Linearly interpolate between two vectors.
   */
  lerp(other: Vec2, t: number): Vec2 {
    return this.add(other.subtract(this).scale(t));
  }

  /**
   * Check if two vectors are equal within an epsilon.
   */
  equalsEpsilon(other: Vec2, epsilon: number): boolean {
    return (
      Math.abs(this.x - other.x) < epsilon &&
      Math.abs(this.y - other.y) < epsilon
    );
  }

  /**
   * Check if two vectors are equal.
   */
  equals(other: Vec2): boolean {
    return this.equalsEpsilon(other, EPSILON);
  }
}

/**
 * A 4-dimensional vector.
 */
export class Vec4 {
  /**
   * x coordinate
   */
  readonly x: number;

  /**
   * y coordinate
   */
  readonly y: number;

  /**
   * z coordinate
   */
  readonly z: number;

  /**
   * w coordinate
   */
  readonly w: number;

  constructor(
    x: number,
    y: number,
    z: number,
    w: number,
  ) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }

  /**
   * Add two vectors.
   */
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
