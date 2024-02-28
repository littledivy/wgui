import { Document } from "../layout.ts";
import { assertEquals } from "jsr:@std/assert";
Deno.test("Document", () => {
  const doc = new Document({
    width: 100,
    height: 100,
  });
  assertEquals(
    doc.toString(),
    JSON.stringify({
      type: "Document",
      width: 100,
      height: 100,
      children: 0,
      x: 0,
      y: 0,
    }),
  );
});

Deno.test("Document add child", () => {
  const doc = new Document({
    width: 100,
    height: 100,
  });
  doc.addChild("test", {
    width: 50,
    height: 50,
  });
  const childData = doc.getChild("test");
  assertEquals(childData.width, 50);
  assertEquals(childData.height, 50);
});
