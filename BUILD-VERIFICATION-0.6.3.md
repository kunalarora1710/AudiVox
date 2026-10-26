# AudiVox 0.6.3 verification - 13 October 2026

Version code 12. Branding-only update over ClearTube 0.6.2. Same application ID app.cleartube and development signing key.

Gradle assembleDebug passed. APK v2 signature, ZIP alignment and CRC checked. AAPT reports application-label AudiVox, version 0.6.3 and the adaptive launcher resource. Installed over the existing app on BlueStacks Android 9 without uninstalling. Native home showed AudiVox; launcher displayed the supplied logo without cropping. BlueStacks initially retained the previous shortcut text in its launcher cache, although installed APK label was confirmed AudiVox. No launcher data was cleared.

User-facing home/menu, fallback playback title, notification brand and license-page title updated. About dialog uses BuildConfig.VERSION_NAME. Audio algorithms and playback behavior unchanged; earlier audio verification retained rather than rerun for this cosmetic change. Original supplied logo bytes are bundled unmodified, inset inside the adaptive icon.

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
