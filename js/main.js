/**
 * @fileoverview Entry Point & UI — bootstraps the game, wires DOM overlays and
 * button handlers, manages the score HUD, automatic leaderboard saving, leaderboard view,
 * and responsive canvas resizing.
 */

(function() {
  const canvas = document.getElementById('game-canvas');
  const container = document.getElementById('game-container');

  const scoreHud = document.getElementById('score-hud');
  const scoreDisplay = document.getElementById('score-display');

  const menuScreen = document.getElementById('menu-screen');
  const menuBest = document.getElementById('menu-best');

  const gameoverScreen = document.getElementById('gameover-screen');
  const finalScore = document.getElementById('final-score');
  const bestScore = document.getElementById('best-score');
  const medalRow = document.getElementById('medal-row');
  const medalEmoji = document.getElementById('medal-emoji');

  const rankRow = document.getElementById('rank-row');
  const rankValue = document.getElementById('rank-value');

  const leaderboardScreen = document.getElementById('leaderboard-screen');
  const leaderboardBody = document.getElementById('leaderboard-body');
  const btnRestart = document.getElementById('btn-restart');
  const btnLeaderboard = document.getElementById('btn-leaderboard');
  const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
  const btnClearLeaderboard = document.getElementById('btn-clear-leaderboard');
  const btnMute = document.getElementById('btn-mute');
  const btnAudioSettings = document.getElementById('btn-audio-settings');
  const audioPanel = document.getElementById('audio-panel');
  const musicSlider = document.getElementById('music-volume');
  const sfxSlider = document.getElementById('sfx-volume');

  let savedThisRun = false;
  let lastRank = 0;

  function resizeCanvas() {
    const rect = container.getBoundingClientRect();
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    if (window.game) window.game.resize();
  }

  // Initialize game
  const game = new Game(canvas);
  window.game = game;

  game.onStateChange = (state) => {
    if (state === STATES.PLAYING) {
      savedThisRun = false;
      lastRank = 0;
    }
    updateUI(state);
  };

  game.onScoreChange = (score) => {
    scoreDisplay.textContent = score;
    scoreHud.classList.remove('pop');
    void scoreHud.offsetWidth; // trigger reflow
    scoreHud.classList.add('pop');
    setTimeout(() => scoreHud.classList.remove('pop'), 150);
  };

  function updateMuteButton() {
    btnMute.textContent = game.sound.muted ? '🔇' : '🔊';
  }
  function toggleMute() {
    game.sound.toggleMute();
    updateMuteButton();
  }
  updateMuteButton();
  game.input.onMute = toggleMute;
  btnMute.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMute();
    btnMute.blur(); // keep Space from re-triggering the button
  });

  // Volume sliders
  musicSlider.value = Math.round(game.sound.musicVolume * 100);
  sfxSlider.value = Math.round(game.sound.sfxVolume * 100);
  musicSlider.addEventListener('input', () => game.sound.setMusicVolume(musicSlider.value / 100));
  sfxSlider.addEventListener('input', () => game.sound.setSfxVolume(sfxSlider.value / 100));
  // Let go of keyboard focus after dragging so Space flaps again
  [musicSlider, sfxSlider].forEach((s) => s.addEventListener('change', () => s.blur()));
  btnAudioSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    audioPanel.classList.toggle('hidden');
    btnAudioSettings.blur();
  });

  game.input.onStart = () => {};
  game.input.onFlap = () => {};
  game.input.onRestart = () => {};
  game.input.onMenu = () => {
    if (game.state === STATES.LEADERBOARD) {
      game.hideLeaderboard();
    }
  };

  function updateUI(state) {
    // Hide all overlays first
    menuScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    leaderboardScreen.classList.add('hidden');

    if (state === STATES.MENU) {
      menuScreen.classList.remove('hidden');
      scoreHud.classList.add('hidden');
      menuBest.textContent = game.bestScore;
    } else if (state === STATES.PLAYING) {
      scoreHud.classList.remove('hidden');
      scoreDisplay.textContent = game.score;
    } else if (state === STATES.DEAD) {
      scoreHud.classList.add('hidden');
      gameoverScreen.classList.remove('hidden');
      finalScore.textContent = game.score;
      bestScore.textContent = game.bestScore;

      // Medal
      if (game.score >= 10) {
        medalRow.classList.remove('hidden');
        if (game.score >= 30) medalEmoji.textContent = '🥇';
        else if (game.score >= 20) medalEmoji.textContent = '🥈';
        else medalEmoji.textContent = '🥉';
      } else {
        medalRow.classList.add('hidden');
      }

      // Save to the leaderboard automatically (once per run, no name needed)
      if (!savedThisRun) {
        savedThisRun = true;
        if (game.leaderboard.isHighScore(game.score)) {
          lastRank = game.leaderboard.addScore(game.score);
        }
      }
      if (lastRank > 0) {
        rankValue.textContent = '#' + lastRank;
        rankRow.classList.remove('hidden');
      } else {
        rankRow.classList.add('hidden');
      }
    } else if (state === STATES.LEADERBOARD) {
      leaderboardScreen.classList.remove('hidden');
      renderLeaderboard();
    }
  }

  function showLeaderboard() {
    game.showLeaderboard();
  }

  function renderLeaderboard() {
    const scores = game.leaderboard.getTopScores();
    leaderboardBody.innerHTML = '';

    if (scores.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="3" style="padding:24px;color:#999;">No scores yet. Go play!</td>`;
      leaderboardBody.appendChild(row);
      return;
    }

    scores.forEach((entry, i) => {
      const rank = i + 1;
      const row = document.createElement('tr');
      row.className = rank <= 3 ? `rank-${rank}` : '';

      let rankDisplay = String(rank);
      if (rank === 1) rankDisplay = '🥇 1';
      else if (rank === 2) rankDisplay = '🥈 2';
      else if (rank === 3) rankDisplay = '🥉 3';

      [rankDisplay, entry.score, entry.date].forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.appendChild(cell);
      });
      leaderboardBody.appendChild(row);
    });
  }

  // Button handlers
  btnRestart.addEventListener('click', (e) => {
    e.stopPropagation();
    btnRestart.blur();
    game.start();
    setTimeout(() => game.bird.flap(), 50);
  });

  btnLeaderboard.addEventListener('click', (e) => {
    e.stopPropagation();
    showLeaderboard();
  });

  btnCloseLeaderboard.addEventListener('click', (e) => {
    e.stopPropagation();
    game.hideLeaderboard();
  });

  btnClearLeaderboard.addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm('Clear all leaderboard scores?')) {
      game.leaderboard.clearAll();
      renderLeaderboard();
    }
  });

  // Fix mobile viewport height
  function setVH() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  setVH();
  window.addEventListener('resize', setVH);

  // Resize handling
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Start
  game.init();
  updateUI(STATES.MENU);
})();
