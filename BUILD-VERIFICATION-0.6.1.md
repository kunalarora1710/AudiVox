# ClearTube 0.6.1 verification - 10 October 2026

Version code 10. APK 3,227,091 bytes. SHA-256 `12826244cb0934094d880e25251bd333219fda4f8cef9a7a0cbd33dc5acafe36`.

Gradle assembleDebug, APK v2 signature verification, ZIP alignment and CRC passed. Packaged assets exactly match the supplied source. All 35 JavaScript regression tests passed, including startup retry bounds, no reload for paused/mid-song buffering, direct watch navigation, preserved playlist, mute/pause/position restoration, unrelated URL isolation and existing DSP tests.

## BlueStacks Android 9 / WebView 129 runtime

The old mobile YouTube SPA navigation reproduced readyState 0, currentTime 0 for the full 10-second baseline trace. In an intermediate recovery-only build, a single fresh document load recovered playback unmuted. The final build opens tapped watch links as fresh documents immediately: the same track was playing unmuted at the first positive sample, 1.38 seconds after the click. The 15-second final trace remained playing without a recovery reload. This is a measured local sample, not a network-independent speed guarantee or a complete explanation of YouTube's internal delay.

The native Reload button retained unmuted playing state and position (about 23 seconds, followed by forward progress). An intentionally muted, paused track remained muted and paused after Reload at about 34 seconds. Native media Play resumed it unmuted; playback advanced from 34472 to 44134 ms with the emulator screen asleep. Playback was paused after testing.

Raw records are in tests/v061-*.json. No DSP algorithms were changed in this version; prior 48 kHz/44.1 kHz render measurements and longer 0.6.0 steady-playback results are retained, not represented as rerun. Physical phone, head-unit and Android 13-15 testing remain outstanding. Automatic recovery is limited to initial playback lacking decoded media, not general network buffering. Website changes can affect compatibility.

## Local Windows build-tool correction

AGP 8.9.1's AAPT2 `8.9.1-12782657` crashed while finishing ZIP output in this Windows execution environment. Debugging isolated the MinGW `ftruncate64` free-space precheck: `FindFirstVolumeW` returned `INVALID_HANDLE_VALUE`, followed by `FindNextVolumeW` with that invalid handle.

A local copy was corrected to test the returned handle. On failure it branches to the function's existing no-volume cleanup after `FindVolumeClose`, frees both allocations, and uses the existing current-drive free-space query. Valid volume handles take the original path. The change does not disable file permissions, alter OS DLLs, bypass a failed write, or change any app functionality. It only avoids dereferencing an invalid handle.

- Original tool SHA-256: `eac70ec5367c823a96432a1afb9f4f2bcf077148d957ed96935a5b338a1b0392`.
- Corrected tool SHA-256: `695dba729e5d20c7d5e3d777437c6dcbe2e7a672754f9ac9fcd06ead739e2129`.
- Original register setup at RVA `0x3686f8`: `49 89 c5 48 8d 44 24 6c`.
- Guard trampoline in existing executable padding: RVA `0x407340`.
- Existing failure cleanup: RVA `0x368809`.
- Test minimal APK built successfully before the full build.

The override was supplied only to this local Gradle invocation. The source project still uses the standard pinned Android Gradle Plugin and its original build tools on ordinary developer machines. The corrected tool is not part of the APK.
