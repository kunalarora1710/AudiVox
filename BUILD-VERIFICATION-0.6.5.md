# AudiVox 0.6.5 verification - 13 October 2026

Version code 14. Gradle assembleDebug passed; APK signature, ZIP alignment and CRC verified. Updated install on BlueStacks Android 9 succeeded.

With system auto-rotation disabled and emulator user rotation temporarily set to portrait, YouTube playback reported portrait-secondary. Tapping the actual YouTube fullscreen control entered document fullscreen and landscape-primary (1067 x 600 CSS pixels). Screenshot confirmed immersive landscape video without app navigation or system bars. Android Back exited document fullscreen and restored portrait-secondary. Playback remained active across both transitions. Emulator rotation setting restored to its original value and playback paused after the test. Records: tests/v065-web-before/full/exit.json.

Uses SCREEN_ORIENTATION_SENSOR_LANDSCAPE while a WebView custom view is visible, restoring getRequestedOrientation() on exit. Both landscape sides are permitted by the policy; physical sensor switching and physical phones/car head units were not tested. Existing Android orientation/screenSize config handling preserves the Activity and audio graph. No DSP changes in this release.

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
