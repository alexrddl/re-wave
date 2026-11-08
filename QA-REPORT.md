# QA report — RE:WAVE v1.2

## Automated checks

- `node --check app.js` — PASS.
- HTML parse with BeautifulSoup + lxml — PASS.
- All literal JavaScript element-ID references exist; no duplicate HTML IDs — PASS.
- CSS parse with tinycss2 — PASS (254 parsed top-level rules).
- Startup/navigation smoke test with a DOM stub — PASS (initialization and switching Remix / Mastering views).
- Synthetic mastering-core tests — 4/4 PASS:
  - sample-peak readout and 4x cubic true-peak estimate;
  - integrated loudness block/gating arithmetic with a pass-through OfflineAudioContext test double;
  - look-ahead limiter peak ceiling on synthetic audio;
  - 24-bit PCM WAV header, channel count and data length.

## Verification limits

A real browser listening session and end-to-end decoding/rendering across Chrome, Firefox and Safari were not performed here. In particular, the synthetic loudness test uses a pass-through OfflineAudioContext stub: it checks the LUFS block/gating arithmetic, not the exact frequency response of the browser's real K-weighting biquad filters. True Peak is explicitly an approximation based on 4x cubic interpolation, not a certified BS.1770 oversampling meter. For a commercial release, verify the final files with a dedicated loudness meter and listening checks.
