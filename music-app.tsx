/** @jsx h */
import { App, Fragment, h, Layout, Rect, Text, Vec2, Vec4 } from "./wgui.ts";
import {
  getLibraryTracks,
  getState,
  getTrackCover,
  playTrack,
} from "./apple-music.ts";

const HIGHLIGHT_COLOR = new Vec4(0.3, 0.3, 0.3, 1);
const CONTAINER_COLOR = new Vec4(0.2, 0.2, 0.2, 1);
const INPUT_COLOR = new Vec4(0.1, 0.1, 0.1, 1);

let tracks = await getLibraryTracks();

// Lazy loaded textures ;)
const textures = tracks.slice(0, 20).map(getTrackCover);

function main() {
  const layout = new Layout(600, 700);
  let text = "";
  let clicked = false;
  let selectedTrack = -1;
  let topTrackIndex = 0;
  let maxTracks = 4;

  return (
    <App
      width={layout.width}
      height={layout.height}
      textures={textures}
    >
      {/* Main div */}
      <Rect
        size={new Vec2(500, 600)}
        position={layout.center.subtract(new Vec2(250, 300))}
        onMouseScroll={(self, event) => {
          topTrackIndex -= event.y;
          topTrackIndex = Math.max(0, topTrackIndex);
          topTrackIndex = Math.min(
            tracks.filter((m) =>
              m.name.toLowerCase().includes(text.toLowerCase())
            ).length - maxTracks,
            topTrackIndex,
          );
        }}
        borderRadius={25}
        color={CONTAINER_COLOR}
      />

      <Rect
        size={new Vec2(500 - 50, 50)}
        position={layout.center.subtract(new Vec2(250 - 25, 300 - 25))}
        borderRadius={25}
        color={INPUT_COLOR}
        onMouseOver={(self) => self.color = HIGHLIGHT_COLOR}
        onMouseOut={(self) => self.color = INPUT_COLOR}
        onKeyDown={(self, event) => {
          if (event.keysym.scancode == 42) {
            text = text.slice(0, -1);
          }
        }}
        onInput={(self, event) => {
          text += event.text;
        }}
      />
      <Text
        position={layout.center.subtract(new Vec2(250 - 25, 300 - 25)).add(
          new Vec2(15, 20),
        )}
        color={new Vec4(1, 1, 1, 1)}
        fontSize={18}
      >
        {() => text || "Search"}
      </Text>

      {() =>
        tracks.filter((m) => m.name.toLowerCase().includes(text.toLowerCase()))
          .slice(topTrackIndex, topTrackIndex + maxTracks).map((m, i) => (
            <Fragment>
              <Rect
                size={new Vec2(500 - 50, 100)}
                position={layout.center.subtract(new Vec2(250 - 25, 300 - 25))
                  .add(
                    new Vec2(0, 50 + 100 * i + 25 * (i + 1)),
                  )}
                borderRadius={25}
                color={selectedTrack == m.id
                  ? new Vec4(0.2, 0.2, 0.3, 1)
                  : INPUT_COLOR}
                onClick={() => {
                  selectedTrack = m.id;
                  playTrack(m.id);
                }}
              />
              <Text
                position={layout.center.subtract(new Vec2(250 - 25, 300 - 25))
                  .add(
                    new Vec2(15, 50 + 100 * i + 25 * (i + 1) + 20),
                  )}
                color={new Vec4(1, 1, 1, 1)}
                fontSize={18}
              >
                {() => m.name}
              </Text>

              <Text
                position={layout.center.subtract(new Vec2(250 - 25, 300 - 25))
                  .add(
                    new Vec2(15, 50 + 100 * i + 25 * (i + 1) + 20 + 20),
                  )}
                color={new Vec4(0.5, 0.5, 0.5, 1)}
                fontSize={16}
              >
                {() => m.artist}
              </Text>

              {/* If the track is selected, show the text "Now playing" bottom left */}
              {selectedTrack == m.id &&
                (
                  <Text
                    position={layout.center.subtract(
                      new Vec2(250 - 25, 300 - 25),
                    )
                      .add(
                        new Vec2(
                          15,
                          50 + 100 * i + 25 * (i + 1) + 20 + 20 + 20,
                        ),
                      )}
                    color={new Vec4(0.5, 0.5, 0.5, 1)}
                    fontSize={12}
                  >
                    {() => "Now playing"}
                  </Text>
                )}

              {/* Album art inside the rect, aligned right */}
              <Rect
                size={new Vec2(100, 100)}
                position={layout.center.subtract(new Vec2(250 - 25, 300 - 25))
                  .add(
                    new Vec2(500 - 50 - 100, 50 + 100 * i + 25 * (i + 1)),
                  )}
                usage={m.index}
                borderRadius={25}
                onMouseOver={(self) => self.borderRadius = 0}
                onMouseOut={(self) => self.borderRadius = 25}
              >
              </Rect>
            </Fragment>
          ))}
    </App>
  );
}

main();
