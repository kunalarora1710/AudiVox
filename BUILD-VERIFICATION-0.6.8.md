# AudiVox 0.6.8 verification - 15 October 2026

Version code 17, app.audivox. Gradle assembleDebug, APK signature, ZIP alignment and CRC passed. 43 JavaScript tests passed, including viewport-coordinate timeline seek, bounds, paused-state preservation, ad/live exclusions and drag delegation.

BlueStacks Android 9 live checks: physical Android input taps on YouTube's actual progress bar moved playback to approximately 380 seconds of a 634.601-second video at the 60% position. Checked at default and 80% page zoom. A preliminary CDP touch attempt was discarded because the helper opens separate sessions for start/end; successful verification used Android input tap. No root cause was proven for every phone; the fix commits actual seeks rather than only a preview on recognized bars.

Menu Light-to-Dark changed native home surfaces and system bars. Force-stop and relaunch retained dark preference; the website received data-audiovox-theme=dark. Dark-to-Light restored the light home appearance and menu action. Native Reverb list confirmed No reverb, Medium room, Concert hall, Cathedral (Not recommended), with no Huge cathedral choice. Interpretation follows the user's requested Cathedral label; it remains available. Processing implementation retains legacy room support internally but the removed option is not exposed.

Theme changes preserve the existing WebView. Other websites may not fully honor app colors. Physical phone, sensor, head-unit and all third-party website variants not tested. No DSP algorithm changes; earlier audio measurements retained as history. Test playback stopped by returning Home.

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
