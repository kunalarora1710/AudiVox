# AudiVox 0.6.7 verification - 15 October 2026

Version code 16; application ID and Java namespace app.audivox. This is a separate installation from the old app.cleartube package. The older package was left intact; settings and browser state are not migrated.

Gradle assembleDebug passed, APK signature/ZIP alignment/CRC verified. AAPT confirms app.audivox, AudiVox label and 0.6.7 version. Fresh installation and native launch succeeded on BlueStacks Android 9. UI hierarchy confirms Video Player and Music tiles. My Audio DOM contains AUDIOVOX / MY AUDIO with no ClearTube visible text. Mobile YouTube header visually shows the provided AudiVox logo and name with the search control retained. Website logo substitution targets the mobile home-header button only, not all YouTube branding or the Music website.

Local test chord played with a running audio graph under the new package; app.audivox/.PlaybackService was foreground with audivox_playback notification channel. Playback paused after verification. No DSP algorithm changes; earlier measurements are retained as historical results. Physical phone and head-unit behavior not newly tested.

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
