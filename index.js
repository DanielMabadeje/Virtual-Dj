let leftBaseVolume = 1;
let rightBaseVolume = 1;

document.addEventListener('DOMContentLoaded', () => {
  const songLoader = document.getElementById("songloader");
  const clearQueueBtn = document.getElementById("clear-queue");
  const fileUpload = document.getElementById("file-upload");
  const songContainer = document.getElementById("songloader-container");


  const leftLessBtn = document.getElementById("left-less");
  const rightLessBtn = document.getElementById("right-less");
  const leftMoreBtn = document.getElementById("left-more");
  const rightMoreBtn = document.getElementById("right-more");

  const leftPlayBtn = document.getElementById("left-play");
  const rightPlayBtn = document.getElementById("right-play");
  const leftTempoRange = document.getElementById("left-tempo-range");
  const rightTempoRange = document.getElementById("right-tempo-range");
  const leftJog = document.getElementById("left-jog");
  const rightJog = document.getElementById("right-jog");
  const leftSyncBtn = document.getElementById("left-sync");
  const rightSyncBtn = document.getElementById("right-sync");
  const leftSyncTempoBtn = document.getElementById("left-sync-tempo");
  const rightSyncTempoBtn = document.getElementById("right-sync-tempo");
  const leftVolumeRange = document.getElementById('left-volume-range');
  const rightVolumeRange = document.getElementById('right-volume-range');

  const crossfader = document.getElementById('crossfader');

  const skipInterval = 5;
  let isDraggingLeft = false;
  let isDraggingRight = false;
  let startXLeft = 0;
  let startXRight = 0;
  let startTimeLeft = 0;
  let startTimeRight = 0;
  const pixelsPerSecond = 10; // adjust sensitivity

  let audioQueue = [];
  let leftAudio = new Audio();
  let rightAudio = new Audio();

  if (crossfader) {
    crossfader.value = 50;
  }

  function isAudioFile(file) {
    return file.type.startsWith("audio/");
  }

  function addSongToLoaderDock(file, duration = null) {
    const songItem = document.createElement("div");
    songItem.classList.add("song-item");
    songItem.dataset.fileUrl = URL.createObjectURL(file);  // Store the file URL for later reference

    songItem.innerHTML = `
      🎵 ${file.name}
      ${duration ? `<span class="duration">${formatDuration(duration)}</span>` : ''}
    `;

    // Make the song item clickable to load into the player
    songItem.addEventListener('click', () => {
      loadSongIntoPlayer(songItem.dataset.fileUrl);
    });

    songLoader.appendChild(songItem);
  }

  function updateJogSpeed(jogElement, playbackRate) {
    jogElement.style.animationDuration = `${2 / playbackRate}s`;
  }

  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  }

  function queueFile(file) {
    if (!isAudioFile(file)) return;

    const audio = new Audio(URL.createObjectURL(file));

    audio.onloadedmetadata = () => {
      addSongToLoaderDock(file, audio.duration);
    };
  }

  fileUpload.addEventListener('change', (e) => {
    [...e.target.files].forEach(queueFile);
  });

  clearQueueBtn.addEventListener('click', () => {
    audioQueue = [];
    songLoader.innerHTML = '';
  });

  // Add event listeners for the less buttons
  leftLessBtn.addEventListener('click', () => {
    if (leftAudio) {
      leftAudio.currentTime = Math.max(0, leftAudio.currentTime - skipInterval);
    }
  });

  rightLessBtn.addEventListener('click', () => {
    if (rightAudio) {
      rightAudio.currentTime = Math.max(0, rightAudio.currentTime - skipInterval);
    }
  });

  // Add event listeners for the more buttons
  leftMoreBtn.addEventListener('click', () => {
    if (leftAudio) {
      leftAudio.currentTime = Math.min(leftAudio.duration, leftAudio.currentTime + skipInterval);
    }
  });

  rightMoreBtn.addEventListener('click', () => {
    if (rightAudio) {
      rightAudio.currentTime = Math.min(rightAudio.duration, rightAudio.currentTime + skipInterval);
    }
  });

  songContainer.addEventListener("dragover", (e) => e.preventDefault());
  songContainer.addEventListener("drop", (e) => {
    e.preventDefault();
    [...e.dataTransfer.files].forEach(queueFile);
  });

  function loadSongIntoPlayer(fileUrl) {
    if (!leftAudio.src) {
      leftAudio.src = fileUrl;
      playAudio(leftAudio, leftJog);
    } else if (!rightAudio.src) {
      rightAudio.src = fileUrl;
      playAudio(rightAudio, rightJog);
    } else {
      console.log('Both players are occupied.');
    }
  }

  function playAudio(audioElement, jogElement) {
    audioElement.play().catch(error => {
      console.error("Error playing audio:", error);
    });

    jogElement.classList.add('active');

    audioElement.addEventListener('ended', () => {
      jogElement.classList.remove('active');
    });
  }

  leftPlayBtn.addEventListener('click', () => {
    togglePlay(leftAudio, leftJog);
  });

  rightPlayBtn.addEventListener('click', () => {
    togglePlay(rightAudio, rightJog);
  });

  leftAudio.addEventListener('ended', () => leftJog.classList.remove('active'));
  rightAudio.addEventListener('ended', () => rightJog.classList.remove('active'));
  leftAudio.addEventListener('pause', () => leftJog.classList.remove('active'));
  rightAudio.addEventListener('pause', () => rightJog.classList.remove('active'));

  function togglePlay(audioElement, jogElement) {
    if (audioElement.paused) {
      audioElement.play().catch(error => console.error("Error playing audio:", error));
      jogElement.classList.add('active');
    } else {
      audioElement.pause();
      jogElement.classList.remove('active');
    }
  }

  leftTempoRange.addEventListener('input', (e) => {
    const shift = parseInt(e.target.value);
    const playbackRate = 1 + (shift * 0.1);
    if (leftAudio) leftAudio.playbackRate = playbackRate;
    updateJogSpeed(leftJog, playbackRate);
  });

  rightTempoRange.addEventListener('input', (e) => {
    const shift = parseInt(e.target.value);
    const playbackRate = 1 + (shift * 0.1);
    if (rightAudio) rightAudio.playbackRate = playbackRate;
    updateJogSpeed(rightJog, playbackRate);
  });

  leftJog.addEventListener('click', (e) => {
    leftAudio.currentTime += (e.offsetX < leftJog.offsetWidth / 2) ? -5 : 5;
  });

  rightJog.addEventListener('click', (e) => {
    rightAudio.currentTime += (e.offsetX < rightJog.offsetWidth / 2) ? -5 : 5;
  });


  leftJog.addEventListener('mousedown', (e) => {
    isDraggingLeft = true;
    startXLeft = e.clientX;
    startTimeLeft = leftAudio.currentTime;
    document.body.style.cursor = 'ew-resize';
  });
  
  rightJog.addEventListener('mousedown', (e) => {
    isDraggingRight = true;
    startXRight = e.clientX;
    startTimeRight = rightAudio.currentTime;
    document.body.style.cursor = 'ew-resize';
  });
  
  window.addEventListener('mousemove', (e) => {
    if (isDraggingLeft) {
      const deltaX = e.clientX - startXLeft;
      const timeChange = deltaX / pixelsPerSecond;
      const newTime = Math.max(0, Math.min(leftAudio.duration, startTimeLeft + timeChange));
      leftAudio.currentTime = newTime;
    }
  
    if (isDraggingRight) {
      const deltaX = e.clientX - startXRight;
      const timeChange = deltaX / pixelsPerSecond;
      const newTime = Math.max(0, Math.min(rightAudio.duration, startTimeRight + timeChange));
      rightAudio.currentTime = newTime;
    }
  });
  
  window.addEventListener('mouseup', () => {
    if (isDraggingLeft || isDraggingRight) {
      isDraggingLeft = false;
      isDraggingRight = false;
      document.body.style.cursor = '';
    }
  });

  leftSyncBtn.addEventListener('click', () => syncTracks(leftAudio, rightAudio));
  rightSyncBtn.addEventListener('click', () => syncTracks(leftAudio, rightAudio));

  function syncTracks(leftTrack, rightTrack) {
    if (Math.abs(leftTrack.currentTime - rightTrack.currentTime) > 1) {
      rightTrack.currentTime = leftTrack.currentTime;
      if (rightTrack.paused) {
        rightTrack.play().catch(error => console.error("Error playing right track:", error));
      }
    }
  }

  leftSyncBtn.addEventListener('click', async () => {
    const leftBPM = await getBPM(leftAudio);
    const rightBPM = await getBPM(rightAudio);
    syncTracks(leftAudio, rightAudio);
    syncTempo(leftAudio, rightAudio, leftBPM, rightBPM);
  });

  rightSyncBtn.addEventListener('click', async () => {
    const leftBPM = await getBPM(leftAudio);
    const rightBPM = await getBPM(rightAudio);
    syncTracks(leftAudio, rightAudio);
    syncTempo(leftAudio, rightAudio, leftBPM, rightBPM);
  });

  function syncTempo(leftTrack, rightTrack, leftBPM, rightBPM) {
    const bpmRatio = leftBPM / rightBPM;
    rightTrack.playbackRate = bpmRatio;

    if (rightTrack.paused) {
      rightTrack.play().catch(error => console.error("Error playing right track:", error));
    }
  }

  function scale(value) {
    return Math.max(0, Math.min(1, value / 100));
  }

  async function getBPM(audioFile) {
    if (audioFile.src) {
      const response = await fetch(audioFile.src);
      const fileBlob = await response.blob();
      const arrayBuffer = await fileBlob.arrayBuffer();
      try {
        const bpm = await bpmDetect(arrayBuffer);
        console.log("Detected BPM:", bpm);
        return bpm;
      } catch (error) {
        console.error("Error detecting BPM:", error);
        return 0;
      }
    } else {
      console.error("Invalid audio file");
      return 0;
    }
  }

  function applyCrossfade(value) {
    leftBaseVolume = parseFloat(leftVolumeRange?.value || 1);
    rightBaseVolume = parseFloat(rightVolumeRange?.value || 1);

    const crossfadeRatio = scale(value);

    const leftVol = parseFloat((leftBaseVolume * (1 - crossfadeRatio)).toFixed(2));
    const rightVol = parseFloat((rightBaseVolume * crossfadeRatio).toFixed(2));

    if (leftAudio && !leftAudio.paused) leftAudio.volume = leftVol;
    if (rightAudio && !rightAudio.paused) rightAudio.volume = rightVol;
  }

  crossfader.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    applyCrossfade(value);
  });

  leftVolumeRange.addEventListener('input', (e) => {
    leftBaseVolume = parseFloat(e.target.value);
    applyCrossfade(parseInt(crossfader.value));
  });

  rightVolumeRange.addEventListener('input', (e) => {
    rightBaseVolume = parseFloat(e.target.value);
    applyCrossfade(parseInt(crossfader.value));
  });

  document.getElementById('load-spotify').addEventListener('click', () => {
    const spotifyLink = document.getElementById('spotify-link').value.trim();
    if (spotifyLink && spotifyLink.includes('spotify.com')) {
      const trackId = getSpotifyTrackId(spotifyLink);
      if (trackId) {
        const label = document.createElement("div");
        label.classList.add("song-item");
        label.textContent = `🎧 Spotify Track: ${trackId}`;
        songLoader.appendChild(label);

        const iframe = document.createElement('iframe');
        iframe.src = `https://open.spotify.com/embed/track/${trackId}`;
        iframe.width = '300';
        iframe.height = '80';
        iframe.frameBorder = '0';
        iframe.allow = 'encrypted-media';
        songLoader.appendChild(iframe);
      }
    } else {
      alert("Please enter a valid Spotify link.");
    }
  });

  function getSpotifyTrackId(url) {
    const match = url.match(/track\/([^?\/]+)/);
    return match ? match[1] : null;
  }
});
