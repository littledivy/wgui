/* @jsx h */
import { App, h, Rect, render, Text, useState, Vec2, Vec4 } from "wgui";

function main() {
  const [counter, setCounter] = useState<number>(0);

  return (
    <App width={600} height={700}>
      <Rect
        size={new Vec2(100, 100)}
        color={new Vec4(1, 0, 0, 1)}
        onClick={() => {
          setCounter(counter + 1);
        }}
      >
      </Rect>
      <Text>
        Hello world! {counter}
      </Text>
    </App>
  );
}

render(main);
