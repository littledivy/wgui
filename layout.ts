// deno-lint-ignore-file no-explicit-any
import {
  instantiate,
  type Layout as ILayout,
  type Node as INode,
  StyleUnit,
  type TaffyTree as ITaffyTree,
} from "taffy";

const { Node, TaffyTree } = await instantiate();

/**
 * Document class for creating layout documents.
 *
 * @example
 * ```ts
 * const document = new Document({ width: 100, height: 100 });
 */
export class Document {
  /**
   * Static documents.
   */
  static documents: Record<number, Document> = {};

  /**
   * Next id for the document.
   */
  static nextId = 0;

  #tree: ITaffyTree = new TaffyTree();
  #mainNode: INode;
  #ids: Map<string, number> = new Map();
  #computedLayout!: ILayout;
  #size: string | number;
  #childCount = 0;
  constructor(style: any = {}, size: string | number = 100) {
    this.#mainNode = new Node(this.#tree, style);
    this.#size = size;
  }

  /**
   * Set the size of the document.
   *
   * @example
   * ```ts
   * const document = new Document();
   * document.setSize(100);
   * ```
   */
  setSize(size: any) {
    this.#size = size;
  }

  /**
   * Add a child to the document
   *
   * @example
   * ```ts
   * const document = new Document();
   * document.addChild("childID", { width: 100, height: 100 });
   * ```
   */
  addChild(id: string, style: any = {}) {
    const node = new Node(this.#tree, style);
    this.#ids.set(id, this.#childCount);
    this.#childCount++;
    this.#mainNode.addChild(node);
    return node;
  }

  /**
   * Compute the layout of the document
   *
   * @example
   * ```ts
   * const document = new Document();
   * document.computeLayout();
   * ```
   */
  computeLayout(size: any = this.#size): ILayout {
    this.#computedLayout = this.#mainNode.computeLayout(size);
    return this.#computedLayout;
  }

  /**
   * Get the document layout
   *
   * @example
   * ```ts
   * const document = new Document();
   * const layout = document.getDocument();
   * ```
   */
  getDocument(compute = true): ILayout {
    if (compute) {
      this.computeLayout();
    }
    return this.#computedLayout;
  }

  /**
   * Get the child of the document
   *
   * @example
   * ```ts
   * const document = new Document();
   * const child = document.getChild("childID");
   * ```
   */
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

  /**
   * Get the string representation of the document
   *
   * @example
   * ```ts
   * const document = new Document();
   * console.log(document.toString());
   * ```
   */
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

  /**
   * Create a new document
   *
   * @example
   * ```ts
   * const id = Document.createDocument();
   * ```
   */
  static createDocument(style: any = {}) {
    const id = Document.nextId++;
    const document = new Document(style);
    Document.documents[id] = document;
    return id;
  }

  /**
   * Get the document
   *
   * @example
   * ```ts
   * const document = Document.getDocument(0);
   * ```
   */
  static getDocument(id: number) {
    return Document.documents[id];
  }
}

export { StyleUnit };
