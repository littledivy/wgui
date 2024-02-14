export class Layout {
  width: number;
  height: number;
  constructor(
    width: number,
    height: number,
  ) {
    this.width = width;
    this.height = height;
  }

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
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

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
  x: number;
  y: number;
  z: number;
  w: number;

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
