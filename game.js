(() => {
  'use strict';

  // ===== Configuration =====
  const DIFFICULTY = {
    easy:   { hp: 120, baseSpeed: 18, spawnEvery: 2.6, wordLevels: [['short'], ['short'], ['short', 'medium'], ['medium']] },
    medium: { hp: 100, baseSpeed: 26, spawnEvery: 2.0, wordLevels: [['short'], ['short', 'medium'], ['medium'], ['medium', 'long']] },
    hard:   { hp: 80,  baseSpeed: 34, spawnEvery: 1.5, wordLevels: [['medium'], ['medium', 'long'], ['long'], ['long']] }
  };

  const WAVE_SIZE = 10; // monsters per wave before boss
  const POWERUP_CHANCE = 0.08;
  const FREEZE_DURATION = 4000;

  // ===== State =====
  const state = {
    running: false,
    paused: false,
    difficulty: 'easy',
    diff: DIFFICULTY.easy,
    hp: 100,
    maxHp: 100,
    score: 0,
    level: 1,
    waveCount: 0,
    spawnTimer: 0,
    activeMonster: null,
    monsters: [],
    bossPending: false,
    bossActive: false,
    frozenUntil: 0,
    typed: '',
    correctChars: 0,
    totalChars: 0,
    startTime: 0,
    bestScore: parseInt(localStorage.getItem('bestScore') || '0', 10)
  };

  // ===== DOM =====
  const $ = id => document.getElementById(id);
  const arena = $('arena');
  const monstersEl = $('monsters');
  const effectsEl = $('effects');
  const overlay = $('overlay');
  const gameOver = $('game-over');
  const banner = $('level-banner');
  const typedText = $('typed-text');
  const castleEl = $('castle');

  $('best-score').textContent = state.bestScore;

  // ===== Utilities =====
  const rand = (min, max) => Math.random() * (max - min) + min;
  const choice = arr => arr[Math.floor(Math.random() * arr.length)];

  function getArenaBounds() {
    const r = arena.getBoundingClientRect();
    return { width: r.width, height: r.height };
  }

  function getCastleEdgeX() {
    const r = castleEl.getBoundingClientRect();
    return r.right - arena.getBoundingClientRect().left - 10;
  }

  // ===== Word selection =====
  function pickWord(forBoss = false) {
    if (forBoss) return choice(WORDS.boss);
    const buckets = state.diff.wordLevels[Math.min(state.level - 1, state.diff.wordLevels.length - 1)];
    const bucket = choice(buckets);
    // avoid duplicate live words
    const live = new Set(state.monsters.map(m => m.word));
    for (let i = 0; i < 12; i++) {
      const w = choice(WORDS[bucket]);
      if (!live.has(w)) return w;
    }
    return choice(WORDS[bucket]);
  }

  // ===== Monster =====
  class Monster {
    constructor(opts = {}) {
      this.boss = !!opts.boss;
      this.powerup = opts.powerup || null; // 'freeze' | 'bomb' | 'heal' | null
      this.word = opts.word || pickWord(this.boss);
      this.typedIdx = 0;

      const bounds = getArenaBounds();
      this.x = bounds.width + 40;
      this.y = rand(140, bounds.height - 180);

      const speedMult = this.boss ? 0.55 : 1;
      this.speed = (state.diff.baseSpeed + (state.level - 1) * 4) * speedMult * rand(0.85, 1.15);

      const emoji = this.boss
        ? choice(BOSS_EMOJIS)
        : (this.powerup ? POWERUP_EMOJIS[this.powerup] : choice(MONSTER_EMOJIS));

      this.el = document.createElement('div');
      this.el.className = 'monster' + (this.boss ? ' boss' : '') + (this.powerup ? ' powerup' : '');

      this.wordEl = document.createElement('div');
      this.wordEl.className = 'word';

      this.bodyEl = document.createElement('div');
      this.bodyEl.className = 'body';
      this.bodyEl.textContent = emoji;

      this.el.appendChild(this.wordEl);
      this.el.appendChild(this.bodyEl);
      monstersEl.appendChild(this.el);

      this.updateWordDisplay();
      this.updatePosition();
    }

    updateWordDisplay() {
      const typed = this.word.slice(0, this.typedIdx);
      const rest = this.word.slice(this.typedIdx);
      this.wordEl.innerHTML =
        `<span class="typed">${typed}</span><span class="untyped">${rest}</span>`;
    }

    updatePosition() {
      this.el.style.left = this.x + 'px';
      this.el.style.top = this.y + 'px';
    }

    update(dt) {
      const now = performance.now();
      const frozen = now < state.frozenUntil;
      this.el.classList.toggle('frozen', frozen);
      if (!frozen) {
        this.x -= this.speed * dt;
      }
      this.updatePosition();
    }

    setActive(active) {
      this.el.classList.toggle('active', active);
    }

    typeChar(ch) {
      const expected = this.word[this.typedIdx];
      if (ch === expected) {
        this.typedIdx++;
        this.updateWordDisplay();
        return this.typedIdx >= this.word.length ? 'done' : 'progress';
      }
      return 'wrong';
    }

    destroy() {
      this.el.remove();
    }

    getCenter() {
      const r = this.el.getBoundingClientRect();
      const a = arena.getBoundingClientRect();
      return { x: r.left + r.width / 2 - a.left, y: r.top + r.height / 2 - a.top };
    }
  }

  // ===== Effects =====
  function spawnZap(x, y, emoji = '⚡') {
    const el = document.createElement('div');
    el.className = 'zap';
    el.textContent = emoji;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    effectsEl.appendChild(el);
    setTimeout(() => el.remove(), 600);
  }

  function spawnScorePop(x, y, text) {
    const el = document.createElement('div');
    el.className = 'score-pop';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    effectsEl.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function flashScreen() {
    const el = document.createElement('div');
    el.className = 'flash';
    effectsEl.appendChild(el);
    setTimeout(() => el.remove(), 350);
  }

  function freezeOverlay() {
    const el = document.createElement('div');
    el.className = 'freeze-overlay';
    effectsEl.appendChild(el);
    setTimeout(() => el.remove(), 600);
  }

  function showBanner(text, ms = 2000) {
    banner.textContent = text;
    banner.classList.remove('hidden');
    // Force restart of animation
    banner.style.animation = 'none';
    void banner.offsetWidth;
    banner.style.animation = '';
    setTimeout(() => banner.classList.add('hidden'), ms);
  }

  // ===== HUD =====
  function updateHUD() {
    $('level').textContent = state.level;
    $('score').textContent = state.score;
    $('wave-progress').textContent = Math.min(state.waveCount, WAVE_SIZE);
    $('wave-total').textContent = WAVE_SIZE;

    const hpPct = Math.max(0, state.hp / state.maxHp) * 100;
    $('hp-bar').style.width = hpPct + '%';
    $('hp-text').textContent = `${Math.max(0, Math.ceil(state.hp))} / ${state.maxHp}`;

    const elapsedMin = (performance.now() - state.startTime) / 60000;
    const wpm = elapsedMin > 0 ? Math.round((state.correctChars / 5) / elapsedMin) : 0;
    $('wpm').textContent = wpm;

    const acc = state.totalChars > 0
      ? Math.round((state.correctChars / state.totalChars) * 100)
      : 100;
    $('accuracy').textContent = acc;
  }

  // ===== Spawning =====
  function spawnMonster() {
    if (state.bossPending) return;
    if (state.waveCount >= WAVE_SIZE) {
      // No more regular spawns until boss happens
      return;
    }

    const opts = {};
    if (Math.random() < POWERUP_CHANCE) {
      const types = ['freeze', 'bomb', 'heal'];
      opts.powerup = choice(types);
    }
    const m = new Monster(opts);
    state.monsters.push(m);
    state.waveCount++;

    if (state.waveCount === WAVE_SIZE) {
      // Schedule a boss after the current monsters thin out a bit
      state.bossPending = true;
      setTimeout(spawnBoss, 2500);
    }
  }

  function spawnBoss() {
    if (!state.running) return;
    state.bossPending = false;
    state.bossActive = true;
    showBanner('⚠ BOSS! ⚠', 1800);
    const boss = new Monster({ boss: true });
    state.monsters.push(boss);
  }

  // ===== Power-ups =====
  function activatePowerup(type, monster) {
    const c = monster.getCenter();
    if (type === 'freeze') {
      state.frozenUntil = performance.now() + FREEZE_DURATION;
      freezeOverlay();
      spawnZap(c.x, c.y, '❄️');
    } else if (type === 'bomb') {
      flashScreen();
      // Kill all visible non-boss monsters
      for (const m of [...state.monsters]) {
        if (m === monster || m.boss) continue;
        const cm = m.getCenter();
        spawnZap(cm.x, cm.y, '💥');
        addScore(10, cm.x, cm.y);
        removeMonster(m);
      }
    } else if (type === 'heal') {
      const heal = Math.min(20, state.maxHp - state.hp);
      state.hp = Math.min(state.maxHp, state.hp + 20);
      spawnScorePop(c.x, c.y, `+${heal} HP 💖`);
    }
  }

  // ===== Score =====
  function addScore(points, x, y) {
    state.score += points;
    if (x != null && y != null) spawnScorePop(x, y, '+' + points);
  }

  function pointsForWord(word, isBoss) {
    let p = word.length * 10;
    if (isBoss) p *= 5;
    return p;
  }

  // ===== Removing monsters =====
  function removeMonster(m) {
    m.destroy();
    state.monsters = state.monsters.filter(x => x !== m);
    if (state.activeMonster === m) {
      state.activeMonster = null;
      state.typed = '';
      typedText.textContent = '';
    }
    if (m.boss) onBossDefeated();
  }

  function onBossDefeated() {
    state.bossActive = false;
    state.level++;
    state.waveCount = 0;
    showBanner(`Level ${state.level}!`, 2000);
  }

  // ===== Input =====
  function handleKey(ch) {
    if (!state.running) return;
    if (!/^[a-zA-Z]$/.test(ch)) return;
    const lower = ch.toLowerCase();
    state.totalChars++;

    if (!state.activeMonster) {
      // Find a monster whose next char matches; prefer closest to castle
      const candidates = state.monsters
        .filter(m => m.word[m.typedIdx] === lower)
        .sort((a, b) => a.x - b.x);
      if (candidates.length === 0) return;
      const m = candidates[0];
      state.activeMonster = m;
      m.setActive(true);
    }

    const m = state.activeMonster;
    const result = m.typeChar(lower);
    if (result === 'wrong') {
      // mistype on active word - count missed but keep lock
      return;
    }
    state.correctChars++;
    state.typed += lower;
    typedText.textContent = state.typed;

    if (result === 'done') {
      const c = m.getCenter();
      spawnZap(c.x, c.y, '⚡');
      addScore(pointsForWord(m.word, m.boss), c.x, c.y);
      if (m.powerup) activatePowerup(m.powerup, m);
      state.typed = '';
      typedText.textContent = '';
      removeMonster(m);
    }
  }

  function handleBackspace() {
    const m = state.activeMonster;
    if (!m || m.typedIdx === 0) return;
    m.typedIdx--;
    m.updateWordDisplay();
    state.typed = state.typed.slice(0, -1);
    typedText.textContent = state.typed;
    if (m.typedIdx === 0) {
      m.setActive(false);
      state.activeMonster = null;
    }
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.running) {
      state.paused = !state.paused;
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (state.running) handleBackspace();
      return;
    }
    if (e.key.length === 1) handleKey(e.key);
  });

  // ===== Game loop =====
  let lastT = 0;
  function loop(t) {
    if (!state.running) return;
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0);
    lastT = t;

    if (!state.paused) {
      // Spawning
      state.spawnTimer += dt;
      const spawnInterval = Math.max(0.6, state.diff.spawnEvery - (state.level - 1) * 0.15);
      if (state.spawnTimer >= spawnInterval && !state.bossActive) {
        state.spawnTimer = 0;
        spawnMonster();
      }

      // Monster updates
      const castleX = getCastleEdgeX();
      for (const m of [...state.monsters]) {
        m.update(dt);
        if (m.x <= castleX) {
          // Hits the castle
          const dmg = m.boss ? 35 : 12;
          state.hp -= dmg;
          castleEl.classList.add('hit');
          setTimeout(() => castleEl.classList.remove('hit'), 400);
          flashScreen();
          removeMonster(m);
          if (state.hp <= 0) {
            endGame();
            return;
          }
        }
      }

      updateHUD();
    }

    requestAnimationFrame(loop);
  }

  // ===== Game lifecycle =====
  function startGame(diffName) {
    state.difficulty = diffName;
    state.diff = DIFFICULTY[diffName];
    state.hp = state.diff.hp;
    state.maxHp = state.diff.hp;
    state.score = 0;
    state.level = 1;
    state.waveCount = 0;
    state.spawnTimer = 0;
    state.activeMonster = null;
    state.bossPending = false;
    state.bossActive = false;
    state.frozenUntil = 0;
    state.typed = '';
    state.correctChars = 0;
    state.totalChars = 0;
    state.startTime = performance.now();

    for (const m of state.monsters) m.destroy();
    state.monsters = [];
    typedText.textContent = '';

    overlay.classList.add('hidden');
    gameOver.classList.add('hidden');

    state.running = true;
    showBanner('Level 1 — Defend!', 1800);
    updateHUD();
    lastT = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame() {
    state.running = false;
    for (const m of state.monsters) m.destroy();
    state.monsters = [];

    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      localStorage.setItem('bestScore', String(state.bestScore));
      $('best-score').textContent = state.bestScore;
    }
    $('final-score').textContent = state.score;
    $('final-level').textContent = state.level;
    gameOver.classList.remove('hidden');
  }

  // ===== Buttons =====
  document.querySelectorAll('[data-diff]').forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.dataset.diff));
  });

  $('play-again').addEventListener('click', () => {
    gameOver.classList.add('hidden');
    overlay.classList.remove('hidden');
  });
})();
