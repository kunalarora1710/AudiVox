# ClearTube 0.6.2 verification - 12 October 2026

Version code 11. Gradle assembleDebug succeeded. APK v2 signature, ZIP alignment and CRC checks passed. All packaged web assets match the source. 38 JavaScript tests passed.

## Audio and runtime

On BlueStacks Android 9 / WebView 129, the prior version's native Bass + and Mid + selections reached the processing graph; their preset gains were 4 and 3 dB, respectively. This was not a reproduced complete EQ wiring failure. The new presets are +/-6 dB with broader bass/treble reach. Native checkbox selections for Bass +, Mid + and Treble + reached the live graph together as [1,1,1], with a running context and nonzero changed output.

19 real OfflineAudioContext renders passed at each of 48 kHz and 44.1 kHz. Six individual bass/mid/treble boost/cut measurements were approximately +6.04 to +6.08 dB and -5.86 to -5.91 dB at their test frequencies. Zero settings remained sample-transparent; the combined maximum-effects stress signal stayed below full scale. Existing clarity, stereo and room-tail tests also passed.

The prior build reproduced direct YouTube navigation playing muted with a visible .ytp-unmute prompt. In this build, direct navigation played unmuted at volume 1 with nonzero audio output and no visible prompt, without a manual unmute tap. A later intentional mute remained muted after the recovery timer. Playback was paused after testing. Raw results are in tests/v062-*.json and render*-v062.json.

Physical phone/car playback was not tested. Measured DSP changes do not establish perceived bass performance on a particular speaker. Fresh-launch sound settings remain zero, so No filter intentionally makes no EQ change. Website changes can affect autoplay-prompt compatibility.

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
