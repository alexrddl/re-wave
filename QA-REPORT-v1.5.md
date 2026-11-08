# RE:WAVE 1.5 — QA report

## Scope

- New editor navigation: Sound / Effects / Edit.
- Five-band parametric EQ, compressor, stereo width, saturation, tape warmth, delay and chorus.
- Trim start/end, reverse preview, fade in and fade out.
- Shared Web Audio graph for realtime preview and OfflineAudioContext export.
- WAV / MP3 / FLAC export retained for remix and album mastering.
- Static GitHub Actions smoke checks.

## Automated checks completed

- JavaScript parses with V8 `new Function(source)`.
- HTML structure validated; no duplicate IDs.
- All static `$()` DOM lookups resolve to an HTML ID.
- All `elements.*` and `state.*` references were checked against declared properties.
- CSS braces balance.
- All three editor tabs and all required controls exist.
- WAV, MP3 and FLAC selectors remain available in remix and mastering.
- Compressor and saturation numeric settings are kept separate from their Web Audio node references.

## DSP logic checks

- Trim test: selecting seconds 2–7 from a ten-sample test buffer returns the expected five samples.
- Reverse test: the selected segment is reversed without reversing the entire source.
- Fade test: fade-in and fade-out reach zero at the segment boundaries.
- Mock Web Audio graph: five EQ bands, compressor, stereo matrix, saturation, delay and chorus nodes are constructed and receive the expected test values.

## Not yet verified

- Real browser listening and repeated export of real-world music files have not been manually tested in this environment.
- Cross-browser behavior, long-file memory use, and subjective sound quality still require manual listening in Chrome, Firefox and Safari.
- The GitHub Actions smoke workflow is committed and will report its result when the PR check runs.

## Important behavior notes

- Audio is processed locally in the browser; the new features do not upload tracks to a server.
- Stereo Width affects stereo sources; mono sources remain mono.
- Trim, reverse and fades are applied to both preview and exported audio.
