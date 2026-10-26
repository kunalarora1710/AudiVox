# ClearTube 0.6.0 verification - 10 October 2026

Version code 9; Android 9 minimum, target API 35. APK 3,290,857 bytes.
SHA-256: `e17bc93d6bcfdb6f7c9ec7f8e90e437f498d2f56e1e164e4026b5d446009fe2f`.

Gradle assembleDebug passed. APK v2 signature, ZIP alignment and CRC passed. All packaged web assets exactly match source. 28 JavaScript tests passed, covering playback commands, navigation unmute, seek limits, state reporting, effect routing and prior regressions. 13 real audio-render checks passed at each of 48 kHz and 44.1 kHz.

## Runtime

BlueStacks Android 9 / Chrome WebView 129:

- Updated install and native startup passed. Bass Boost slider absent; four other enhancement sliders and combined Equalizer remain.
- Page zoom changed to 120%, applied as whole-page CSS zoom 1.2, and persisted through force-stop/relaunch. Native zoom dialog inspected.
- YouTube played with screen asleep (confirmed by dumpsys power). MediaSession exposed the playing title and native transport actions. Notification UI visually inspected.
- OS media-session dispatch paused and resumed actual playback while asleep. Pausing released the app's partial wake lock; playing reacquired it.
- Next changed to another YouTube video; Previous returned to the prior video. Both played unmuted after the remote-navigation correction. Native queue capabilities reflected available history.
- Lock/unlock retained current processing state. A fresh launch retained zoom but reset sound to zero.
- Strong Clarity/Ambience/Surround/Dynamic settings, all three tone boosts and Huge Cathedral reverb were left running without touching sliders for 94.325 seconds while asleep. Playback advanced, AudioContext remained running, and no new waiting/stalled/error events appeared. Output level was nonzero.
- Android AudioFlinger active track (client 5564, session 41) underrun count was 2052 before and after that steady window: zero increase. This was NOT an absolute zero-underrun session; the earlier count was already present before measurement. Mixer partial/empty counters remained zero.
- Final filtered runtime log contained no ClearTube error or fatal Android exception. Test playback was paused and emulator returned Home.

Records are in tests/runtime-0.6.0.json and underruns-0.6.0-before/after.txt. Physical-phone intermittent cuts were not directly reproduced. These tests demonstrate reduced work and a clean measured steady window on this emulator, not a guarantee for every phone. Android 13-15 lockscreen layouts, Bluetooth/headset routing, physical phone/head-unit audio, battery policies and long-duration use remain unverified. Background playback depends on the activity/WebView staying alive; removing the task or process death stops it. Paused notification timeout is five minutes. Next/Previous depends on page capabilities/history.

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
