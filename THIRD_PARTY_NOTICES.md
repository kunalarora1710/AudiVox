# FxSound DSP adaptation

FxSound: Copyright (C) 2025 FxSound LLC. Licensed under AGPL-3.0-or-later; full license in LICENSE and bundled in the application. ClearTube containing this adaptation is distributed under AGPL-3.0-or-later with complete corresponding source alongside the APK.

Modified 2026-10-10: app/src/main/assets/fx-adapted.js adapts the Aural odd-harmonic enhancement and current stereo width matrix to Web Audio nodes. It uses a sampled sine curve with +/-8 domain (no oversampling), IIR high-pass coefficients, parameter smoothing and stereo gain routing. This is not the complete FxSound engine. Dynamic Boost and convolution ambience/reverb remain ClearTube implementations. Bass uses a Web Audio peaking filter with the source's 90 Hz/Q 2.5/15 dB tuning, not FxSound's filter implementation.

Pinned upstream revision: d8e7a23d37ed5939c2a3090a1c1756c7f2500b17
https://github.com/fxsound2/fxsound-app/tree/d8e7a23d37ed5939c2a3090a1c1756c7f2500b17

Referenced files:
- dsp/ptechDsp/Aural/Aural032/Auralp32.c (high-pass and sin harmonic addition)
- dsp/ptechDsp/wide/Wide32/Wide32.c (mid/side gains)
- dsp/ptutil/Filt/Fil12But.cpp (high-pass coefficients)
- dsp/ptutil/Qnt/Qnt2But.cpp (logarithmic tuning)
- dsp/ptutil/dfxp/dfxpQnt.cpp and dfxpComm.cpp (control scaling)
- dsp/ptechDsp/Play/Play32/Play32.c (Aural wet/odd gains)
- dsp/ptutil/include/c_play.h and c_aural.h (tuning constants)

The installer supplied by the user was not executed; matching its binary processing has not been established. FxSound names identify the reference implementation only; no affiliation is implied.

AndroidX WebKit is Apache-2.0 licensed: https://android.googlesource.com/platform/frameworks/support/+/androidx-main/LICENSE.txt
Gradle wrapper is Apache-2.0 licensed: https://github.com/gradle/gradle/blob/master/LICENSE
