// deno-lint-ignore-file no-unused-vars verbatim-module-syntax
/* @jsx h */
import { App, h, Rect, render, Text, Vec2, Vec4 } from "wgui";
import { useEffect, useState } from "wgui/hooks";

function main() {
    const [darkMode, setDarkMode] = useState(false);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <App
            title="Theme Toggle"
            styles={{
                width: 800,
                height: 600,
                backgroundColor: "#f0f0f0",
            }}
        >
            <Text
                position={new Vec2(300, 50)}
                fontSize={40}
                color={darkMode ? new Vec4(1, 0, 1, 1) : new Vec4(0, 1, 0, 1)}
            >
                {darkMode ? "Dark Mode" : "Light Mode"}
            </Text>
            <Rect
                styles={{
                    width: 500,
                    height: 400,
                }}
                position={new Vec2(150, 100)}
                color={darkMode ? new Vec4(0, 0, 0, 1) : new Vec4(1, 1, 1, 1)}
                borderRadius={20}
            >
            </Rect>
            <Rect
                styles={{
                    width: 300,
                    height: 100,
                }}
                borderRadius={20}
                position={new Vec2(250, 150)}
                color={darkMode ? new Vec4(1, 0, 1, 1) : new Vec4(0, 1, 0, 1)}
                onClick={toggleDarkMode}
            >
            </Rect>
            <Text
                position={new Vec2(270, 180)}
                fontSize={30}
                color={darkMode ? new Vec4(1, 1, 1, 1) : new Vec4(0, 0, 0, 1)}
            >
                {darkMode ? "Toggle Light Mode" : "Toggle Dark Mode"}
            </Text>
            <Text
                position={new Vec2(230, 400)}
                fontSize={20}
                color={darkMode ? new Vec4(1, 1, 1, 1) : new Vec4(0, 0, 0, 1)}
            >
                Click the button to toggle the theme.
            </Text>
        </App>
    );
}

render(main);
