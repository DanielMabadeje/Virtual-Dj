function bpmDetect(arrayBuffer) {
    return new Promise((resolve, reject) => {
      try {
        // Convert the ArrayBuffer into a context (Web Audio API or your preferred method)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
          // AudioBuffer is decoded audio data (you can process it to detect BPM)
          const audioData = audioBuffer.getChannelData(0);  // Left channel data
  
          // Basic method for BPM detection: simple peak detection (or any other method)
          const bpm = detectBPMFromAudioData(audioData);
          resolve(bpm);
        }, (error) => {
          reject("Error decoding audio data");
        });
      } catch (error) {
        reject("Error detecting BPM: " + error.message);
      }
    });
  }
  
  function detectBPMFromAudioData(audioData) {
    // Example peak detection (you can implement a more sophisticated method)
    let beats = 0;
    const threshold = 0.5; // Example threshold for detecting beats
    const windowSize = 44100; // Example window size for detection (1 second)
  
    for (let i = 0; i < audioData.length; i += windowSize) {
      const window = audioData.slice(i, i + windowSize);
      const maxAmplitude = Math.max(...window.map(Math.abs));
      if (maxAmplitude > threshold) {
        beats++;
      }
    }
  
    const bpm = beats * 60; // Multiply by 60 to convert beats into BPM (simplified)
    return bpm;
  }
  