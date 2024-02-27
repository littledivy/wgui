// deno-lint-ignore-file no-explicit-any
import {
  instantiate,
  Layout as ILayout,
  Node as INode,
  StyleUnit,
  TaffyTree as ITaffyTree,
} from "taffy";

const { Node, TaffyTree } = await instantiate();

export class Document {
  static documents: Record<number, Document> = {};
  static nextId = 0;

  #tree: ITaffyTree = new TaffyTree();
  #mainNode: INode;
  #ids: Map<string, number> = new Map();
  #computedLayout!: ILayout;
  #size: any;
  #childCount = 0;
  constructor(style: any, size: any = 100) {
    this.#mainNode = new Node(this.#tree, style);
    this.#size = size;
  }

  setSize(size: any) {
    this.#size = size;
  }

  addChild(id: string, style: any = {}) {
    const node = new Node(this.#tree, style);
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

  static createDocument(style: any = {}) {
    const id = Document.nextId++;
    const document = new Document(style);
    Document.documents[id] = document;
    return id;
  }

  static getDocument(id: number) {
    return Document.documents[id];
  }
}

export { StyleUnit };
