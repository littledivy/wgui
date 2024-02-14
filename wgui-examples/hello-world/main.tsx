/* @jsx h */
import { App, h, Rect, render, Text, useState, Vec2, Vec4 } from "wgui";

function main() {
  const [counter, setCounter] = useState<number>(0);

  return (
    <App
      title="Hello World"
      styles={{
        width: 800,
        height: 600,
        marginRight: "auto",
      }}
    >
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
