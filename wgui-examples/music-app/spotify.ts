import { Client } from "npm:spotify-api.js";
import open from "npm:open";

// deno compile --env does not work.
// https://github.com/denoland/deno/issues/22105
import "https://deno.land/std@0.213.0/dotenv/load.ts";

const clientID = Deno.env.get("SPOTIFY_CLIENT_ID")!;
const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

const scopes = [
  "user-read-private",
  "user-library-read",
  "playlist-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
];

const url =
  `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientID}&scope=${
    scopes.join(" ")
  }&redirect_uri=http://localhost:8888`;

let client: Client;

function setItem(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {
    // pass
  }
}

function getItem(k:string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

export async function getSavedTracks() {
  const refreshMeta = getItem("refreshMeta");
  if (!refreshMeta) {
    await open(url);

    console.log("Visit to authorize Spotify:", url);

    const { promise, resolve } = Promise.withResolvers();

    Deno.serve({ port: 8888 }, function (req) {
      const url = new URL(req.url);

      const query = new URLSearchParams(url.search);
      resolve(query.get("code"));
      return new Response("<html><h2>Authorized!</h2></html>", {
        headers: {
          "Content-Type": "text/html",
        },
      });
    });

    const token = await promise;

    client = await Client.create({
      token: {
        clientID,
        clientSecret,
        code: token as string | undefined,
        redirectURL: "http://localhost:8888",
      },
      userAuthorizedToken: true,
      refreshToken: true,
    });

    setItem("refreshMeta", JSON.stringify(client.refreshMeta));
  } else {
    const { refreshToken } = JSON.parse(refreshMeta);
    client = await Client.create({
      token: {
        clientID,
        clientSecret,
        refreshToken,
      },
      refreshToken: true,
    });
  }

  const tracks = await client.user.getSavedTracks();
  return tracks.slice(0, 10).map((m, i) => {
    return {
      name: m.item.name,
      artist: m.item.artists.map((a) => a.name).join(" & "),
      album: m.item.album.name,
      index: i,
      id: i,
      uri: m.item.uri,
    };
  });
}

export interface AvailableDevicesResponse {
  devices: Device[];
}

export interface Device {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
  supports_volume: boolean;
}

export async function getAvailableDevices(): Promise<AvailableDevicesResponse> {
  return await client!.fetch(`/me/player/devices`);
}

export async function playTrack({ uri }: { uri: string }) {
  const { devices = [] } = await getAvailableDevices();

  if (devices.length <= 0) {
    console.error("No active device found");
  }

  await client!.fetch(`/me/player/play?device_id=${devices?.[0]?.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: { uris: [uri], position_ms: 0 },
  });
}
