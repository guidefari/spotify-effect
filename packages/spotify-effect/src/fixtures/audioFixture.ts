import type { AudioAnalysis, AudioFeatures } from "../model/SpotifyObjects";

export const audioFeaturesFixture: AudioFeatures = {
  duration_ms: 215773,
  key: 5,
  mode: 1,
  time_signature: 4,
  acousticness: 0.00242,
  danceability: 0.585,
  energy: 0.842,
  instrumentalness: 0.00686,
  liveness: 0.0866,
  loudness: -5.883,
  speechiness: 0.0556,
  valence: 0.428,
  tempo: 118.211,
  id: "3n3Ppam7vgaVa1iaRUc9Lp",
  uri: "spotify:track:3n3Ppam7vgaVa1iaRUc9Lp",
  track_href: "https://api.spotify.com/v1/tracks/3n3Ppam7vgaVa1iaRUc9Lp",
  analysis_url: "https://api.spotify.com/v1/audio-analysis/3n3Ppam7vgaVa1iaRUc9Lp",
  type: "audio_features",
};

export const audioAnalysisFixture: AudioAnalysis = {
  bars: [{ start: 0.0, duration: 1.5, confidence: 0.8 }],
  beats: [{ start: 0.0, duration: 0.5, confidence: 0.9 }],
  sections: [
    {
      start: 0.0,
      duration: 10.0,
      confidence: 1.0,
      loudness: -5.0,
      tempo: 120.0,
      tempo_confidence: 0.9,
      key: 5,
      key_confidence: 0.8,
      mode: 1,
      mode_confidence: 0.7,
      time_signature: 4,
      time_signature_confidence: 0.9,
    },
  ],
  segments: [
    {
      start: 0.0,
      duration: 0.5,
      confidence: 0.8,
      loudness_start: -10.0,
      loudness_max: -5.0,
      loudness_max_time: 0.1,
      loudness_end: -8.0,
      pitches: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 0.5, 0.3],
      timbre: [40.0, 20.0, -10.0, 5.0, 3.0, -2.0, 1.0, -1.0, 0.5, -0.5, 0.2, -0.2],
    },
  ],
  tatums: [{ start: 0.0, duration: 0.25, confidence: 0.9 }],
};
