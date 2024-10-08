// deno-lint-ignore-file no-explicit-any
import { run } from "jxa";
import jimp from "npm:jimp";

export function getState() {
  return run(() => {
    const music = Application("Music") as unknown as any;

    return {
      state: music.playerState(),
      ...music.currentTrack().properties(),
      playerPosition: music.playerPosition(),
    };
  });
}

export function getLibraryTracks() {
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

export function playTrack({ id }: { id: number }) {
  return run((trackId: number) => {
    const music = Application("Music") as unknown as iTunes;

    const playlists = music.libraryPlaylists();
    const library = playlists.find((p) => p.name() === "Library");

    const track = library.tracks().find((t) => t.id() === trackId);
    track.play();
  }, id);
}

const isStandalone = Deno.args.includes("--standalone");

const cache = !isStandalone ? await caches.open("track-covers-v0") : null;

export async function getTrackCover({ name, artist, album }) {
  const query = `${name} ${artist} ${album}`.replace("*", "");
  const uri =
    `https://itunes.apple.com/search?term=${query}&entity=song&limit=2`;

  let req = await cache?.match(uri);
  if (!req) {
    req = await fetch(
      uri,
    );
    await cache?.put(uri, req.clone());
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

  req = await cache?.match(url);
  if (!req) {
    req = await fetch(url);
    await cache?.put(url, req.clone());
  }

  const buffer = await req.arrayBuffer();

  const image = await jimp.read(buffer);
  // Add alpha channel, resize and get raw bitmap
  const raw = await image.opaque()
    .resize(360, 360)
    .bitmap.data;

  return {
    width: 360,
    height: 360,
    image: new Uint8Array(raw.buffer),
  };
}
