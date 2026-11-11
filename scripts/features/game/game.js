// Canvas physics, hoop collisions, scoring, and game-over controls.
const $ = (id) => document.getElementById(id);

export function initGame({ onSaveRun }) {
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const basketball = new Image();
  basketball.src = './assets/basketball.png';
  const gameOverSound = new Audio('./assets/mama-rene-baterbonia.mp3');
  const streakSound = new Audio('./assets/bituin-ng-mindanao.mp3');
  const gameBgm = new Audio('./assets/hetyati-16-343477.mp3');
  gameOverSound.preload = 'auto';
  gameOverSound.volume = 0.85;
  streakSound.preload = 'auto';
  streakSound.volume = 0.75;
  streakSound.loop = true;
  gameBgm.preload = 'auto';
  gameBgm.loop = true;
  gameBgm.volume = 0.28;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let game = null;
  let raf = 0;
  let lastFrame = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const ballColors = ['#f58c43', '#ffd436', '#58e2ff', '#ad7aff', '#ff5fb8'];

  function setPauseButton(isPaused) {
    const button = $('pauseButton');
    button.textContent = isPaused ? '▶' : 'Ⅱ';
    button.setAttribute('aria-label', isPaused ? 'Resume game' : 'Pause game');
    button.title = isPaused ? 'Resume game' : 'Pause game';
  }

  function updateBadges() {
    $('streakBadge').classList.toggle('hidden', game.streak < 2);
    $('streakValue').textContent = `×${game.multiplier}`;
    $('shieldBadge').classList.toggle('hidden', game.shields < 1);
    $('shieldValue').textContent = `×${game.shields}`;
  }

  function announce(text, color = '#fff06a') {
    game.announcement = { text, color, timer: 1.05, duration: 1.05 };
  }

  function drawShield(x, y, size, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#33cfff';
    ctx.shadowBlur = size * 0.8;
    const blue = ctx.createLinearGradient(x, y - size, x, y + size);
    blue.addColorStop(0, '#d6fbff');
    blue.addColorStop(0.35, '#35d9ff');
    blue.addColorStop(1, '#0878ed');
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size * 0.78, y - size * 0.58);
    ctx.lineTo(x + size * 0.63, y + size * 0.28);
    ctx.quadraticCurveTo(x + size * 0.38, y + size * 0.82, x, y + size);
    ctx.quadraticCurveTo(x - size * 0.38, y + size * 0.82, x - size * 0.63, y + size * 0.28);
    ctx.lineTo(x - size * 0.78, y - size * 0.58);
    ctx.closePath();
    ctx.fillStyle = blue;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#e6fbff';
    ctx.lineWidth = Math.max(1.5, size * 0.11);
    ctx.stroke();
    ctx.restore();
  }

  function drawStar(x, y, radius, color, rotation = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const r = point % 2 === 0 ? radius : radius * 0.42;
      const angle = -Math.PI / 2 + point * Math.PI / 5;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (point === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = radius;
    ctx.fill();
    ctx.restore();
  }

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (game) {
      game.player.x = width * 0.28;
    }
  }

  function startGame() {
    gameBgm.pause();
    gameBgm.currentTime = 0;
    gameBgm.play().catch(() => {});
    gameOverSound.pause();
    gameOverSound.currentTime = 0;
    streakSound.pause();
    streakSound.currentTime = 0;
    $('gameOverModal').classList.add('hidden');
    $('gameScreen').classList.remove('hidden');
    resizeCanvas();
    game = {
      running: true, over: false, score: 0, ballVisible: true,
      streak: 0, multiplier: 1, shields: 0, elapsed: 0, announcement: null, shieldFlash: 0,
      player: { x: width * 0.28, y: height * 0.42, vy: 0, r: 27 },
      gravity: 1450, flap: -470, speed: 205, ground: height - 28,
      hoops: [], spawnIn: 0.55, particles: [], flash: 0
    };
    $('liveScore').textContent = '0';
    setPauseButton(false);
    updateBadges();
    lastFrame = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }

  function flap() {
    if (!game?.running) return;
    game.player.vy = game.flap;
    game.particles.push({ x: game.player.x - 14, y: game.player.y + 8, vx: -30, vy: 70, life: 0.22 });
  }

  function addHoop() {
    const margin = Math.max(100, height * 0.16);
    game.hoops.push({
      x: width + 55,
      y: margin + Math.random() * Math.max(40, height * 0.54 - margin),
      w: 108, scored: false, bounced: false, contactCooldown: 0,
      sparkTimer: 0,
      powerup: Math.random() < 0.24
        ? { x: width + 55 + 54, y: 0, radius: 14, collected: false }
        : null
    });
    const hoop = game.hoops[game.hoops.length - 1];
    if (hoop.powerup) hoop.powerup.y = hoop.y - 22;
  }

  function showGameOver() {
    $('runScore').textContent = String(game.score);
    $('runLabel').textContent = game.score === 1 ? 'point scored' : 'points scored';
    $('saveStatus').textContent = 'Saving score…';
    $('gameOverModal').classList.remove('hidden');
    onSaveRun(game.score);
  }

  function blinkBeforeGameOver(now) {
    if (!game?.blinking) return;
    const elapsed = now - game.blinkStart;
    game.ballVisible = Math.floor(elapsed / 90) % 2 === 0;
    draw();
    if (elapsed < 720) {
      raf = requestAnimationFrame(blinkBeforeGameOver);
    } else {
      game.blinking = false;
      game.ballVisible = true;
      draw();
      showGameOver();
    }
  }

  function endGame({ blink = false } = {}) {
    if (!game || game.over) return;
    game.over = true;
    game.running = false;
    cancelAnimationFrame(raf);
    gameBgm.pause();
    gameBgm.currentTime = 0;
    streakSound.pause();
    streakSound.currentTime = 0;
    gameOverSound.pause();
    gameOverSound.currentTime = 0;
    gameOverSound.play().catch(() => {});
    if (blink) {
      game.blinking = true;
      game.blinkStart = performance.now();
      raf = requestAnimationFrame(blinkBeforeGameOver);
      return;
    }
    showGameOver();
  }

  function update(dt) {
    if (!game?.running) return;
    const g = game;
    const p = g.player;
    g.elapsed += dt;
    g.shieldFlash = Math.max(0, g.shieldFlash - dt);
    if (g.announcement) {
      g.announcement.timer -= dt;
      if (g.announcement.timer <= 0) g.announcement = null;
    }
    g.ground = height - 28;
    p.x = width * 0.28;
    const previousY = p.y;
    p.vy += g.gravity * dt;
    p.y += p.vy * dt;
    g.spawnIn -= dt;
    if (g.spawnIn <= 0) {
      addHoop();
      g.spawnIn = clamp(1.5 - g.score * 0.025, 1.05, 1.5);
    }

    for (const hoop of g.hoops) {
      hoop.sparkTimer = Math.max(0, hoop.sparkTimer - dt);
      if (hoop.scored || hoop.missed) {
        hoop.x -= g.speed * dt;
        continue;
      }
      hoop.x -= g.speed * dt;
      if (hoop.x + hoop.w < p.x - p.r) {
        if (g.shields > 0) {
          g.shields -= 1;
          hoop.missed = true;
          g.streak = 0;
          g.multiplier = 1;
          streakSound.pause();
          streakSound.currentTime = 0;
          g.shieldFlash = 0.9;
          announce('SHIELD SAVE!', '#65e5ff');
          updateBadges();
          continue;
        }
        endGame({ blink: true });
        return;
      }
      hoop.contactCooldown = Math.max(0, hoop.contactCooldown - dt);
      if (hoop.powerup && !hoop.powerup.collected) {
        hoop.powerup.x = hoop.x + hoop.w / 2;
        hoop.powerup.y = hoop.y - 22;
        const dx = p.x - hoop.powerup.x;
        const dy = p.y - hoop.powerup.y;
        if (dx * dx + dy * dy < (p.r + hoop.powerup.radius) ** 2) {
          hoop.powerup.collected = true;
          g.shields = Math.min(3, g.shields + 1);
          g.shieldFlash = 0.9;
          announce('SHIELD ACTIVATED', '#65e5ff');
          updateBadges();
        }
      }
      const inLane = p.x + p.r > hoop.x + 8 && p.x - p.r < hoop.x + hoop.w - 8;
      const crossedDown = previousY <= hoop.y && p.y >= hoop.y && p.vy > 0;
      const passMargin = p.r + 1;
      const throughOpening = p.x > hoop.x + passMargin && p.x < hoop.x + hoop.w - passMargin;
      const rimY = Math.abs(p.y - hoop.y) < p.r + 4;
      const rimEnd = inLane && (
        Math.abs(p.x - hoop.x) < p.r + 7 ||
        Math.abs(p.x - (hoop.x + hoop.w)) < p.r + 7
      );
      const hitFromAbove = previousY <= hoop.y && p.vy > 0;
      const hitFromBelow = previousY >= hoop.y && p.vy < 0;
      if (!hoop.scored && !hoop.bounced && hoop.contactCooldown === 0 && rimY && rimEnd && (hitFromAbove || hitFromBelow)) {
        hoop.contactCooldown = 0.38;
        if (hitFromAbove) {
          // A rim hit from above rebounds up, allowing another downward shot.
          hoop.bounced = true;
          p.y = hoop.y - p.r - 5;
          p.vy = -Math.max(330, Math.abs(p.vy) * 0.7);
        } else if (hitFromBelow) {
          // Contact from underneath only pushes the ball back below the rim.
          p.y = hoop.y + p.r + 5;
          p.vy = Math.max(330, Math.abs(p.vy) * 0.7);
        }
        continue;
      }

      if (!hoop.scored && crossedDown && inLane && (throughOpening || hoop.bounced)) {
        hoop.scored = true;
        const swish = throughOpening && p.x > hoop.x + p.r + 8 && p.x < hoop.x + hoop.w - p.r - 8;
        if (swish) {
          g.streak += 1;
          g.multiplier = g.streak === 1 ? 1 : Math.min(2 ** (g.streak - 1), 64);
          if (g.streak >= 2 && streakSound.paused) {
            streakSound.play().catch(() => {});
          }
        } else {
          g.streak = 0;
          g.multiplier = 1;
          streakSound.pause();
          streakSound.currentTime = 0;
        }
        const points = (swish ? 2 : 1) * g.multiplier;
        g.score += points;
        hoop.sparkTimer = 1.15;
        $('liveScore').textContent = String(g.score);
        g.flash = swish ? 0.18 : 0.08;
        updateBadges();
        if (g.multiplier > 1) announce(`${g.multiplier}× STREAK!`, '#fff06a');
        else if (swish) announce('SWISH!', '#fff06a');
      }
    }

    g.hoops = g.hoops.filter((hoop) => hoop.scored || hoop.x + hoop.w > -15);
    if (p.y - p.r < 0 || p.y + p.r >= g.ground) endGame();
    for (const particle of g.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    g.particles = g.particles.filter((particle) => particle.life > 0);
    g.flash = Math.max(0, g.flash - dt);
  }

  function draw() {
    if (!game) return;
    const g = game;
    const p = g.player;
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#8ed6e7');
    sky.addColorStop(0.62, '#c8eddf');
    sky.addColorStop(1, '#f7e6b8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#ffffff66';
    ctx.beginPath();
    ctx.arc(width * 0.78, height * 0.2, Math.min(width, height) * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8dcbb3';
    ctx.beginPath();
    ctx.moveTo(0, height * 0.71);
    ctx.quadraticCurveTo(width * 0.19, height * 0.57, width * 0.4, height * 0.7);
    ctx.quadraticCurveTo(width * 0.72, height * 0.54, width, height * 0.7);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    for (const hoop of g.hoops) {
      const centerX = hoop.x + hoop.w / 2;
      const centerY = hoop.y;
      const radiusX = hoop.w / 2;
      const radiusY = 18;
      const oval = () => {
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      };

      // Dark edge and glossy red surface create the floating donut-shaped rim.
      ctx.lineCap = 'round';
      ctx.shadowColor = hoop.scored ? '#ffe65e' : '#ff284e';
      ctx.shadowBlur = 7 + Math.sin(g.elapsed * 7 + centerY) * 3;
      oval();
      ctx.strokeStyle = '#090b12';
      ctx.lineWidth = 17;
      ctx.stroke();

      const redShine = ctx.createLinearGradient(0, centerY - radiusY, 0, centerY + radiusY);
      redShine.addColorStop(0, '#ffb0a0');
      redShine.addColorStop(0.22, '#ff2525');
      redShine.addColorStop(0.5, '#d50012');
      redShine.addColorStop(0.76, '#ff4040');
      redShine.addColorStop(1, '#8f0010');
      oval();
      ctx.strokeStyle = redShine;
      ctx.lineWidth = 11;
      ctx.stroke();

      // Thin highlights follow the upper and lower curves of the ring.
      ctx.beginPath();
      ctx.ellipse(centerX, centerY - 2, radiusX * 0.78, radiusY * 0.58, 0, Math.PI * 1.13, Math.PI * 1.87);
      ctx.strokeStyle = '#ffd9d4';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 2, radiusX * 0.74, radiusY * 0.55, 0, Math.PI * 0.14, Math.PI * 0.86);
      ctx.strokeStyle = '#79000b';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (hoop.powerup && !hoop.powerup.collected) {
        const shieldX = hoop.x + hoop.w / 2;
        const shieldY = hoop.y - 22;
        drawShield(shieldX, shieldY, 14);
        drawStar(shieldX + 16, shieldY - 9, 3.5, '#d4f7ff', g.elapsed);
      }
      if (hoop.sparkTimer > 0) {
        ctx.globalAlpha = clamp(hoop.sparkTimer / 1.15, 0, 1);
        for (let i = 0; i < 5; i += 1) {
          const angle = g.elapsed * 3.2 + i * Math.PI * 2 / 5;
          const sx = centerX + Math.cos(angle) * (radiusX * 0.72);
          const sy = centerY - 20 + Math.sin(angle) * 17;
          drawStar(sx, sy, i % 2 ? 5 : 7, '#fff05d', angle);
        }
        ctx.globalAlpha = 1;
      }
    }

    ctx.fillStyle = '#d9edc7';
    ctx.fillRect(0, g.ground, width, height - g.ground);
    ctx.fillStyle = '#78ae83';
    ctx.fillRect(0, g.ground, width, 5);
    for (const particle of g.particles) {
      ctx.globalAlpha = clamp(particle.life / 0.22, 0, 1);
      ctx.fillStyle = '#fff7cb';
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (g.ballVisible !== false) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(clamp(p.vy / 1000, -0.35, 0.55));
      const tintIndex = g.streak > 1 ? (g.streak - 2) % ballColors.length : 0;
      const hueShifts = [28, 112, 188, 252, 322];
      if (g.shields > 0 || g.shieldFlash > 0) {
        const pulse = 1 + Math.sin(g.elapsed * 10) * 0.08;
        ctx.save();
        ctx.globalAlpha = g.shields > 0 ? 0.9 : clamp(g.shieldFlash / 0.9, 0, 1);
        ctx.shadowColor = '#32d7ff';
        ctx.shadowBlur = 16;
        ctx.strokeStyle = '#72e8ff';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, (p.r + 8) * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (g.streak > 1) {
        ctx.shadowColor = ballColors[tintIndex];
        ctx.shadowBlur = 14;
      }
      if (g.shields > 0) drawShield(p.r * 0.72, -p.r * 0.72, 9);
      if (basketball.complete && basketball.naturalWidth) {
        const spriteSize = p.r * 2.35;
        ctx.filter = g.streak > 1 ? `hue-rotate(${hueShifts[tintIndex]}deg) saturate(1.45)` : 'none';
        ctx.drawImage(basketball, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
        ctx.filter = 'none';
      } else {
        ctx.fillStyle = g.streak > 1 ? ballColors[tintIndex] : '#f58c43';
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#253047';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }

    if (g.announcement) {
      const progress = 1 - g.announcement.timer / g.announcement.duration;
      ctx.save();
      ctx.globalAlpha = clamp(g.announcement.timer / 0.25, 0, 1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 38px system-ui, sans-serif';
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#111827bb';
      ctx.shadowColor = g.announcement.color;
      ctx.shadowBlur = 18;
      const textY = height * 0.25 - progress * 35;
      ctx.strokeText(g.announcement.text, width / 2, textY);
      ctx.fillStyle = g.announcement.color;
      ctx.fillText(g.announcement.text, width / 2, textY);
      ctx.restore();
    }

    if (g.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${g.flash * 1.7})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function frame(now) {
    const dt = Math.min((now - lastFrame) / 1000, 0.04);
    lastFrame = now;
    update(dt);
    draw();
    if (game?.running) raf = requestAnimationFrame(frame);
  }

  function flapFromInput(event) {
    if (event.type === 'keydown' && (event.code !== 'Space' || event.repeat)) return;
    if (event.type === 'keydown') event.preventDefault();
    if ($('gameScreen').classList.contains('hidden') || !$('gameOverModal').classList.contains('hidden')) return;
    flap();
  }

  function togglePause() {
    if (!game || game.over) return;
    if (game.running) {
      game.running = false;
      game.paused = true;
      cancelAnimationFrame(raf);
      gameBgm.pause();
      streakSound.pause();
      setPauseButton(true);
      return;
    }
    if (!game.paused) return;
    game.paused = false;
    game.running = true;
    lastFrame = performance.now();
    setPauseButton(false);
    gameBgm.play().catch(() => {});
    if (game.streak >= 2) streakSound.play().catch(() => {});
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('pointerdown', flapFromInput);
  window.addEventListener('keydown', flapFromInput);
  $('playButton').addEventListener('click', startGame);
  $('retryButton').addEventListener('click', startGame);
  $('pauseButton').addEventListener('click', togglePause);
  $('quitButton').addEventListener('click', () => {
    gameBgm.pause();
    gameBgm.currentTime = 0;
    streakSound.pause();
    streakSound.currentTime = 0;
    if (game?.running) {
      game.running = false;
      game.over = true;
      cancelAnimationFrame(raf);
    }
    setPauseButton(false);
    $('gameScreen').classList.add('hidden');
  });
  $('menuButton').addEventListener('click', () => $('gameScreen').classList.add('hidden'));

  return { setSaveStatus: (message) => { $('saveStatus').textContent = message; } };
}
