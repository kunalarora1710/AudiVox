# AudiVox 0.6.9

Android music browser for Android 9+ phones and full Android head units. Not Android Auto.

## Changes

- Effects, Equalizer and Reverb dialogs always retain the original dark appearance, independent of the app Light/Dark preference.

- Menu theme toggle switches between Light and Dark and saves the choice. Native home surfaces follow it without recreating playback; mobile YouTube and My Audio receive matching page styling. Other websites may retain their own colors.
- YouTube timeline taps seek using the displayed progress-bar bounds, including page zoom. Drag gestures remain with the site; live/infinite-duration media and ads are not overridden.
- Reverb menu removes Huge cathedral and retains Cathedral (Not recommended).

- Application ID and Java namespace changed to app.audivox. Home tiles are Video Player and Music. My Audio displays AUDIOVOX / MY AUDIO. Mobile YouTube home-header button shows the AudiVox logo/name while retaining its original navigation and search. Website content is still served by YouTube.

- Added Bass ++ (+12 dB bass shelf before safety headroom), mutually exclusive with Bass + and Bass minus. It combines with independent Mid/Treble selections and applies immediately.

- Video fullscreen requests sensor-landscape orientation (either landscape side) and immersive system bars. Exiting fullscreen restores the previous orientation policy and system UI, without rebuilding the WebView.

- Renamed the app to AudiVox and added the supplied blue/purple logo as an adaptive launcher icon. App info now reads the built version dynamically.

- Equalizer Bass, Mid and Treble presets now use +/-6 dB, with bass shelf at 220 Hz and treble shelf at 4 kHz. No filter remains neutral; multiple ranges combine. Applying effects resumes a suspended audio context, and ready/playing media events retry attachment.
- A visible YouTube autoplay-unmute prompt activates its own unmute action automatically. Audio is actually unmuted before hiding the prompt. Normal intentional mute and muted reload intent remain respected.

- YouTube watch-link taps load a fresh player document, avoiding the reproduced mobile SPA first-play stall. Playlist query parameters stay intact.
- A requested first play with no decoded media for six seconds gets one reload recovery; ordinary pauses and mid-song buffering never trigger it. A repeated failed retry does not loop.
- Reload preserves playback position, playing/paused state and intentional mute. New song selections start unmuted. A pending restoration expires after 20 seconds or is cancelled by a page touch or native transport action.

- Music continues when the screen locks or the app backgrounds. A foreground playback service exposes native Android media controls and holds a partial wake lock only while playing.
- Notification/lockscreen Play/Pause and available Next/Previous actions. YouTube next-track controls and visited-track history supply navigation. Single local files have no invented queue. Remote navigation unmutes the newly loaded video.
- Menu > Page zoom saves a 50%-150% whole-page zoom. It survives reopening and applies to subsequent websites. Native controls retain their size. Video fullscreen temporarily uses normal zoom.
- Separate Bass Boost slider removed; Equalizer Bass minus/plus remain.
- EQ survives lock/unlock and app switching. Fresh launches reset sound to zero. Zoom saves independently.
- Playback-oriented audio buffering; unused effect and reverb inputs disconnect; retired room sends fade out; metering buffers and harmonic curves are reused; background native UI polling stops; unchanged notifications/metadata are not repeatedly rebuilt.

Earlier UI changes remain: no fullscreen Close overlay, no status strip, no YouTube Open App promotion, individually bordered bottom controls, immediate multi-select Equalizer with close X.

## Use and limitations

Version 0.6.7 uses the new application ID app.audivox and installs separately from versions 0.6.6 and earlier. Preferences, files selected inside the app, browser login and cookies are not automatically migrated. The old installation is not removed. Open a site, play/unmute a song, set EQ, then lock the screen. Use Android's media notification/lockscreen player. Available buttons depend on website actions/history and Android settings; Next/Previous is not a universal queue for every website.

Locking/backgrounding continues the listening session without pausing or resetting EQ. Cold launches start sound at zero. Reset restores original audio. Reverb requires a room and amount above zero.

Menu is on Home; Page zoom includes Reset 100%. Home pauses current media. Swiping ClearTube away or finishing its activity ends playback. This WebView app cannot restore a stream after process death. The paused media service retires after five minutes. Phone battery policies or restricted media may still interrupt playback.

The physical-phone cuts reported by the user have not been directly reproduced. This build reduces scheduling/processing overhead and fixes deliberate background pausing. Emulator playback and underrun checks cannot certify glitch-free playback on every phone/car. See BUILD-VERIFICATION.md.

Clarity/Surround partly adapt public FxSound DSP. Ambience, compression and room reverb use Web Audio; this is not the full Windows engine. Effects apply within this browser only. Ad filtering is best effort.

## Tests, license and build

Run `node --test tests/audio.test.cjs tests/ads.test.cjs tests/media.test.cjs`. For real audio tests load fx-adapted.js, dsp.js and tests/browser-audio.js in Chromium and call `await runAudioMeasurements(48000)` or `(44100)`.

GNU AGPL-3.0-or-later; complete corresponding source accompanies the APK. LICENSE and THIRD_PARTY_NOTICES.md retain original notices. The linked bundled GNU license includes original code attribution. No affiliation with FxSound, Tube EQ, Google or YouTube.

Build with Android SDK Platform/Build Tools 35, compatible JDK, Gradle 8.14.3 and AGP 8.9.1. Java source targets 17. Run `gradlew.bat assembleDebug` or `sh gradlew assembleDebug`. Output: app/build/outputs/apk/debug/app-debug.apk. Development-signed APK; source excludes generated outputs, caches and keys.

References: https://developer.android.com/reference/android/media/session/MediaSession and https://developer.android.com/reference/android/app/Notification.MediaStyle .
