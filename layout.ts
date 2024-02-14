// deno-lint-ignore-file no-explicit-any
import {
  instantiate,
  Layout as ILayout,
  Node as INode,
  StyleUnit,
  TaffyTree as ITaffyTree,
} from "taffy";

const { Node, TaffyTree } = await instantiate();

export function parseStyleUnit(
  text: string,
): { type: number; value: number } | number {
  if (text.endsWith("px")) {
    return { type: StyleUnit.Px, value: Number(text.slice(0, -2)) };
  }
  if (text.endsWith("%")) {
    return { type: StyleUnit.Percent, value: Number(text.slice(0, -1)) };
  }
  if (text.endsWith("fr")) {
    return { type: StyleUnit.Fr, value: Number(text.slice(0, -2)) };
  }
  if (text.endsWith("auto")) {
    return StyleUnit.Auto;
  }
  if (text.endsWith("min-content")) {
    return StyleUnit.MinContent;
  }
  if (text.endsWith("max-content")) {
    return StyleUnit.MaxContent;
  }
  if (text.endsWith("fit-content")) {
    return StyleUnit.FitContentPx;
  }
  if (text.startsWith("fit-content(")) {
    if (text.endsWith("%)")) {
      return {
        type: StyleUnit.FitContentPercent,
        value: Number(text.slice(12, -2)),
      };
    }
    if (text.endsWith("px)")) {
      return {
        type: StyleUnit.FitContentPx,
        value: Number(text.slice(12, -3)),
      };
    }
    return { type: StyleUnit.FitContentPx, value: Number(text.slice(12, -1)) };
  }

  throw new Error("Invalid unit");
}

export function parseNumber(text: string): { type: number; value: number } {
  const styleUnit = parseStyleUnit(text);
  if (typeof styleUnit === "number") {
    return { type: 0, value: styleUnit };
  }
  return styleUnit;
}

export class Document {
  static documents: Record<number, Document> = {};
  static nextId = 0;

  #tree: ITaffyTree = new TaffyTree();
  #mainNode: INode = new Node(this.#tree);
  #ids: Map<string, number> = new Map();
  #computedLayout!: ILayout;
  #size: any = 100;
  #childCount = 0;
  constructor(width: string, height: string) {
    const { type: widthType, value: widthValue } = parseNumber(width);
    const { type: heightType, value: heightValue } = parseNumber(height);
    this.#mainNode.setWidth(widthValue, widthType as any);
    this.#mainNode.setHeight(heightValue, heightType as any);
  }

  setSize(size: any) {
    this.#size = size;
  }

  addChild(id: string) {
    const node = new Node(this.#tree);
    this.#ids.set(id, this.#childCount);
    this.#childCount++;
    this.#mainNode.addChild(node);
    return node;
  }

  computeLayout(size: any = this.#size): ILayout {
    this.#computedLayout = this.#mainNode.computeLayout(size);
    return this.#computedLayout;
  }

  getDocument(compute = true): ILayout {
    if (compute) {
      this.computeLayout();
    }
    return this.#computedLayout;
  }

  getChild(id: string, compute = true) {
    if (compute) {
      this.computeLayout();
    }
    const index = this.#ids.get(id);
    if (index === undefined) {
      throw new Error("No child with that id");
    }
    return this.#computedLayout.child(index);
  }

  toString() {
    const document = this.getDocument();
    return JSON.stringify({
      type: "Document",
      width: document.width,
      height: document.height,
      children: document.childCount,
      x: document.x,
      y: document.y,
    });
  }

  static createDocument(width: string, height: string) {
    const id = Document.nextId++;
    const document = new Document(width, height);
    Document.documents[id] = document;
    return id;
  }

  static getDocument(id: number) {
    return Document.documents[id];
  }
}

export { StyleUnit };
