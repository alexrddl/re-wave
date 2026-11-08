# RE:WAVE — Audio Remix & Loudness Mastering

Browser-based audio remix and album loudness mastering studio. Runs as a static site on GitHub Pages: no Node.js, backend, database, or build step is required.

## Editor tabs

- **Sound** — presets, speed, pitch, reverb, bass boost and volume.
- **Effects** — five-band EQ, compressor, stereo width, saturation, tape warmth, delay and chorus.
- **Edit** — trim start/end, fade in/out and reverse playback.

Realtime preview and offline export use the same Web Audio effect graph. Trim, reverse and fade processing are applied to the exported audio as well as preview playback.

## Export formats

- **WAV** — remix export in 16-bit PCM; album mastering export in 24-bit PCM.
- **MP3** — browser-side LAME encoding with selectable 128, 192, 256, or 320 kbps CBR.
- **FLAC** — lossless 24-bit export using libFLAC through the `@audio/encode-flac` browser module.

All rendering and encoding happens locally in the browser. MP3 and FLAC encoders are loaded from public CDNs on first use, so an internet connection is required for those formats. Audio files are not uploaded to a server.

## Publishing

Upload the repository contents to GitHub Pages and select the `main` branch with the repository root as the Pages source.
## Editor update (v1.5)

The Remix editor is organized into three focused tabs: **Sound**, **Effects**, and **Edit**. The advanced effects include a five-band EQ, compressor, stereo width, saturation, tape warmth, delay and chorus. Editing tools include trim start/end, fade in/out and reverse. The same effect graph is used for playback preview and offline export. See [QA-REPORT-v1.5.md](QA-REPORT-v1.5.md) for static and mock-DSP checks and remaining manual verification.
