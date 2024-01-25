import { run } from "https://raw.githubusercontent.com/NextFire/jxa/v0.0.4/run/mod.ts";
import type { iTunes } from "https://raw.githubusercontent.com/NextFire/jxa/v0.0.4/run/types/core.d.ts";
import { cache } from "https://deno.land/x/cache/mod.ts";
import sharp from "npm:sharp";

const CLIENT_ID = "773825528921849856";
const APP_NAME = "Music";

export function getState() {
  return run(() => {
    const music = Application("Music") as unknown as iTunes;

    return {
      state: music.playerState(),
      ...music.currentTrack().properties(),
      playerPosition: music.playerPosition(),
    };
  });
}

export async function getLibraryTracks() {
  return run(() => {
    const music = Application("Music") as unknown as iTunes;

    const playlists = music.libraryPlaylists();
    const library = playlists.find((p) => p.name() === "Library");
    const tracks = library.tracks().slice(0, 20);

    return tracks.map((t, i) => {
      return {
        index: i,
        id: t.id(),
        name: t.name(),
        artist: t.artist(),
        album: t.album(),
      };
    });
  });
}

export async function playTrack({ id }: { id: number }) {
  return run((trackId: number) => {
    const music = Application("Music") as unknown as iTunes;

    const playlists = music.libraryPlaylists();
    const library = playlists.find((p) => p.name() === "Library");

    const track = library.tracks().find((t) => t.id() === trackId);
    track.play();
  }, id);
}

const cache = await caches.open("track-covers-v0-2");

export async function getTrackCover({ name, artist, album }) {
  const query = `${name} ${artist} ${album}`.replace("*", "");
  const uri =
    `https://itunes.apple.com/search?term=${query}&entity=song&limit=2`;

  let req = await cache.match(uri);
  if (!req) {
    req = await fetch(
      uri,
    );
    await cache.put(uri, req.clone());
  }

  const json = await req.json();
  if (!json.results[0]) {
    return {
      width: 360,
      height: 360,
      image: new Uint8Array(518400),
    };
  }
  const url = json.results[0].artworkUrl100.replace(
    "100x100bb.jpg",
    "360x360bb.png",
  );

  req = await cache.match(url);
  if (!req) {
    req = await fetch(url);
    await cache.put(url, req.clone());
  }

  const buffer = await req.arrayBuffer();

  // Convert RGB to RGBA
  const i = await sharp(buffer)
    .ensureAlpha()
    .resize(360, 360)
    .raw()
    .toBuffer();

  const image = {
    width: 360,
    height: 360,
    image: new Uint8Array(i),
  };

  return image;
}
