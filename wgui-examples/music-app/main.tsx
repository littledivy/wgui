// deno-lint-ignore-file no-explicit-any verbatim-module-syntax
/** @jsx h */
import { App, Fragment, h, Layout, Rect, render, Text, Vec2, Vec4 } from "wgui";
import { useState } from "wgui/hooks";
import {
  getLibraryTracks as getAppleMusicSavedTracks,
  getTrackCover,
  playTrack as playAppleMusicTrack,
} from "./apple-music.ts";
import {
  getSavedTracks as getSpotifySavedTracks,
  playTrack as playSpotifyTrack,
} from "./spotify.ts";

const musicService = Deno.env.get("MUSIC_SERVICE") || "spotify";

const HIGHLIGHT_COLOR = new Vec4(0.3, 0.3, 0.3, 1);
const CONTAINER_COLOR = new Vec4(0.2, 0.2, 0.2, 1);
const INPUT_COLOR = new Vec4(0.1, 0.1, 0.1, 1);

const isMacOS = Deno.build.os == "darwin";
const useAppleMusic = isMacOS && musicService?.toLowerCase() != "spotify";

const getLibraryTracks = useAppleMusic
  ? getAppleMusicSavedTracks
  : getSpotifySavedTracks;
const playTrack = useAppleMusic ? playAppleMusicTrack : playSpotifyTrack;

const tracks = await getLibraryTracks();
// Lazy loaded textures ;)
const textures = tracks.slice(0, 20).map(getTrackCover);

const layout = new Layout(600, 700);
function main() {
  const [search, setSearch] = useState<string>("");
  let [topTrackIndex, setTopTrackIndex] = useState<number>(0);
  const [selectedTrack, setSelectedTrack] = useState<number>(-1);

  const maxTracks = 4;

  return (
    <App
      styles={{
        width: 800,
        height: 600,
      }}
      textures={textures}
    >
      {/* Main div */}
      <Rect
        styles={{
          width: 500,
          height: 600,
        }}
        position={layout.center.subtract(new Vec2(250, 300))}
        onMouseScroll={(_self: any, event: any) => {
          topTrackIndex -= event.y;
          topTrackIndex = Math.max(0, topTrackIndex);
          topTrackIndex = Math.min(
            tracks.filter((m: any) =>
              m.name.toLowerCase().includes(search.toLowerCase())
            ).length - maxTracks,
            topTrackIndex,
          );
          setTopTrackIndex(topTrackIndex);
        }}
        borderRadius={25}
        color={CONTAINER_COLOR}
      />

      <Rect
        styles={{
          width: 500 - 50,
          height: 50,
        }}
        position={layout.center.subtract(new Vec2(250 - 25, 300 - 25))}
        borderRadius={25}
        color={INPUT_COLOR}
        onMouseOver={(self: any) => {
          self.color = HIGHLIGHT_COLOR;
        }}
        onMouseOut={(self: any) => self.color = INPUT_COLOR}
        onKeyDown={(_self: any, event: any) => {
          if (event.keysym.scancode == 42) {
            setSearch(search.slice(0, -1));
          }
        }}
        onInput={(_self: any, event: any) => {
          setSearch(search + event.text);
        }}
      />
      <Text
        position={layout.center.subtract(new Vec2(250 - 25, 300 - 25)).add(
          new Vec2(15, 20),
        )}
        color={new Vec4(1, 1, 1, 1)}
        fontSize={18}
      >
        {search || "Search"}
      </Text>

      {tracks.filter((m: any) =>
        m.name.toLowerCase().includes(search.toLowerCase())
      )
        .slice(topTrackIndex, topTrackIndex + maxTracks).map((
          m: any,
          i: number,
        ) => (
          <Fragment>
            <Rect
              styles={{
                width: 500 - 50,
                height: 100,
              }}
              position={layout.center.subtract(new Vec2(250 - 25, 300 - 25))
                .add(
                  new Vec2(0, 50 + 100 * i + 25 * (i + 1)),
                )}
              borderRadius={25}
              color={selectedTrack == m.id
                ? new Vec4(0.2, 0.2, 0.3, 1)
                : INPUT_COLOR}
              onClick={() => {
                setSelectedTrack(m.id);
                playTrack(m);
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
              {m.name}
            </Text>

            <Text
              position={layout.center.subtract(new Vec2(250 - 25, 300 - 25))
                .add(
                  new Vec2(15, 50 + 100 * i + 25 * (i + 1) + 20 + 20),
                )}
              color={new Vec4(0.5, 0.5, 0.5, 1)}
              fontSize={16}
            >
              {m.artist}
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
                  {"Now playing"}
                </Text>
              )}

            {/* Album art inside the rect, aligned right */}
            <Rect
              styles={{
                width: 100,
                height: 100,
              }}
              position={layout.center.subtract(new Vec2(250 - 25, 300 - 25))
                .add(
                  new Vec2(500 - 50 - 100, 50 + 100 * i + 25 * (i + 1)),
                )}
              usage={m.index}
              borderRadius={25}
              onMouseOver={(self: any) => self.borderRadius = 0}
              onMouseOut={(self: any) => self.borderRadius = 25}
            >
            </Rect>
          </Fragment>
        ))}
    </App>
  );
}

render(main);
