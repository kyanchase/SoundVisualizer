# SoundVisualizer

🔊 Project: Sound Visualizer
A High-Performance Real-Time Audio Visualizer built with C++ and JUCE.

🎯 Project Vision
To build a professional-grade, low-latency audio visualizer inspired by the BCC+ Audio Visualizer. This application will provide real-time frequency analysis with high-end aesthetic features like peak-holding, frequency-weighted scaling, and customizable geometry.

🛠 Tech Stack
Language: C++20

Framework: JUCE (Audio/GUI)

DSP: Fast Fourier Transform (FFT)

Graphics: OpenGL (for hardware-accelerated rendering)

🗓 Roadmap (Spring 2026)
Phase 1: Foundations & FFT (Weeks 1-3)
[ ] JUCE Setup: Initialize the project as a Standalone Application.

[ ] Audio Input Handling: Implement audio device selection and microphone/system input routing.

[ ] The FFT Engine: Implement a windowed FFT (Hanning or Hamming) to convert time-domain data into frequency bins.

[ ] Basic Visualization: Render a simple "raw" bar graph using juce::Graphics.

Phase 2: The "BCC" Aesthetic (Weeks 4-6)
[ ] Peak Hold Logic: Add "gravity-based" decay for frequency peaks to create professional movement.

[ ] Logarithmic Scaling: Implement a Log scale for the X-axis (Hz) so the bass frequencies aren't squashed on the far left.

[ ] Frequency Tuning: Create gain multipliers for specific ranges (Sub-Bass, Mid, Treble) to customize responsiveness.

Phase 3: Advanced Rendering & UI (Weeks 7-10)
[ ] Hardware Acceleration: Move rendering from CPU to OpenGL for 60FPS+ performance.

[ ] Geometry Styles: Add "Dot," "Circle," and "Waveform" modes (mirroring Boris FX features).

[ ] Custom UI: Build a side panel for parameter control (Colors, Tapering, Smoothness).

Phase 4: Polish & Export (Weeks 11-Finals)
[ ] Color Gradients: Implement dynamic color mapping based on frequency intensity.

[ ] Preset System: Allow users to save/load visual themes.

[ ] Final Build: Compile and package the .app or .exe for distribution.