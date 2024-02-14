// deno-lint-ignore-file no-explicit-any
import { Document, parseStyleUnit, StyleUnit } from "../layout.ts";
import { assertEquals, assertThrows } from "jsr:@std/assert";

Deno.test("parseStyleUnit", () => {
  assertEquals(parseStyleUnit("10px"), { type: StyleUnit.Px, value: 10 });
  assertEquals(parseStyleUnit("10%"), { type: StyleUnit.Percent, value: 10 });
  assertEquals(parseStyleUnit("10fr"), { type: StyleUnit.Fr, value: 10 });
  assertEquals(parseStyleUnit("auto"), StyleUnit.Auto);
  assertEquals(parseStyleUnit("min-content"), StyleUnit.MinContent);
  assertEquals(parseStyleUnit("max-content"), StyleUnit.MaxContent);
  assertEquals(parseStyleUnit("fit-content"), StyleUnit.FitContentPx);
  assertEquals(parseStyleUnit("fit-content(10%)"), {
    type: StyleUnit.FitContentPercent,
    value: 10,
  });
  assertEquals(parseStyleUnit("fit-content(10px)"), {
    type: StyleUnit.FitContentPx,
    value: 10,
  });
  assertEquals(parseStyleUnit("fit-content(10)"), {
    type: StyleUnit.FitContentPx,
    value: 10,
  });
  assertThrows(() => parseStyleUnit("invalid"));
});

Deno.test("Document", () => {
  const doc = new Document("100px", "100px");
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
  const doc = new Document("100px", "100px");
  const child = doc.addChild("test");
  child.setWidth(50, StyleUnit.Px as any);
  child.setHeight(50, StyleUnit.Px as any);
  const childData = doc.getChild("test");
  assertEquals(childData.width, 50);
  assertEquals(childData.height, 50);
});
