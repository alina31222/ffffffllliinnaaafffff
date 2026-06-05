const CANVAS_W = 960;
const CANVAS_H = 540;
const GRAVITY = 0.5;
const JUMP_FORCE = -13.5;
const MOVE_SPEED = 5;
const GROUND_Y = 460;
const PLAYER_W = 56;
const PLAYER_H = 72;
const ENEMY_W = 52;
const ENEMY_H = 52;
const COIN_W = 36;
const COIN_H = 36;
const BLOCK_TILE = 52;
const MAX_LIVES = 3;
const INVINCIBLE_FRAMES = 90;
const ENEMY_SPAWN_RATE = 80;
const COIN_SPAWN_RATE = 50;
const BLOCK_SPAWN_RATE = 120;
const PLATFORM_SPAWN_RATE = 160;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const sprites = {};
const spriteFiles = {
  player_idle: 'Sprites/Characters/Default/character_yellow_idle.png',
  player_walk_a: 'Sprites/Characters/Default/character_yellow_walk_a.png',
  player_walk_b: 'Sprites/Characters/Default/character_yellow_walk_b.png',
  player_jump: 'Sprites/Characters/Default/character_yellow_jump.png',
  player_hit: 'Sprites/Characters/Default/character_yellow_hit.png',
  bg_clouds: 'Sprites/Backgrounds/Default/background_clouds.png',
  bg_trees: 'Sprites/Backgrounds/Default/background_fade_trees.png',
  bg_hills: 'Sprites/Backgrounds/Default/background_fade_hills.png',
  enemy_bee: 'Sprites/Enemies/Default/bee_rest.png',
  enemy_slime: 'Sprites/Enemies/Default/slime_normal_rest.png',
  enemy_saw: 'Sprites/Enemies/Default/saw_rest.png',
  coin: 'Sprites/Tiles/Default/coin_gold_side.png',
  heart_full: 'Sprites/Tiles/Default/hud_heart.png',
  heart_empty: 'Sprites/Tiles/Default/hud_heart_empty.png',
  tile_grass: 'Sprites/Tiles/Default/terrain_grass_block_top.png',
  tile_dirt: 'Sprites/Tiles/Default/terrain_dirt_block.png',
  block_blue: 'Sprites/Tiles/Default/block_blue.png',
  block_red: 'Sprites/Tiles/Default/block_red.png',
  block_empty: 'Sprites/Tiles/Default/block_empty.png',
  block_spikes: 'Sprites/Tiles/Default/block_spikes.png',
  brick: 'Sprites/Tiles/Default/brick_brown.png',
  platform: 'Sprites/Tiles/Default/bridge_logs.png',
};

let loadedCount = 0;
const totalSprites = Object.keys(spriteFiles).length;
let gameReady = false;

for (const [key, path] of Object.entries(spriteFiles)) {
  const img = new Image();
  img.onload = () => {
    loadedCount++;
    if (loadedCount === totalSprites) {
      gameReady = true;
      drawLoading(100);
    }
  };
  img.onerror = () => {
    loadedCount++;
    if (loadedCount === totalSprites) {
      gameReady = true;
      drawLoading(100);
    }
  };
  img.src = path;
  sprites[key] = img;
}

function drawLoading(pct) {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#fff';
  ctx.font = '32px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Loading...', CANVAS_W / 2, CANVAS_H / 2 - 20);
  ctx.fillStyle = '#e94560';
  ctx.fillRect(CANVAS_W / 2 - 150, CANVAS_H / 2 + 10, 300 * (pct / 100), 20);
}

const game = {
  score: 0,
  lives: MAX_LIVES,
  gameOver: false,
  started: false,
  frame: 0,
  invincible: 0,
  enemies: [],
  coins: [],
  blocks: [],
  platforms: [],
  particles: [],
  floatingTexts: [],
  bgOffset1: 0,
  bgOffset2: 0,
  bgOffset3: 0,
  walkFrame: 0,
  walkTimer: 0,
  enemySpawnTimer: 0,
  coinSpawnTimer: 0,
  blockSpawnTimer: 0,
  platformSpawnTimer: 0,
  speedMultiplier: 1,
};

const keys = {};
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'r' || e.key === 'R') restartGame();
  if (e.key === ' ' || e.key === 'Space') {
    if (!game.started) { game.started = true; e.preventDefault(); }
    if (game.gameOver) restartGame();
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('click', () => {
  if (!game.started) { game.started = true; }
  if (game.gameOver) restartGame();
});

const player = { x: 120, y: GROUND_Y - PLAYER_H, vx: 0, vy: 0, onGround: true, animState: 'idle' };

function restartGame() {
  game.score = 0;
  game.lives = MAX_LIVES;
  game.gameOver = false;
  game.frame = 0;
  game.invincible = 0;
  game.enemies = [];
  game.coins = [];
  game.blocks = [];
  game.platforms = [];
  game.particles = [];
  game.floatingTexts = [];
  game.walkFrame = 0;
  game.walkTimer = 0;
  game.enemySpawnTimer = 0;
  game.coinSpawnTimer = 0;
  game.blockSpawnTimer = 0;
  game.platformSpawnTimer = 0;
  game.speedMultiplier = 1;
  player.x = 120;
  player.y = GROUND_Y - PLAYER_H;
  player.vy = 0;
  player.onGround = true;
  player.animState = 'idle';
}

function rectCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnEnemy() {
  const types = ['bee', 'slime', 'saw'];
  const type = types[Math.floor(Math.random() * types.length)];
  let y, w = ENEMY_W, h = ENEMY_H;
  if (type === 'slime') y = GROUND_Y - ENEMY_H - 4;
  else if (type === 'bee') y = 120 + Math.random() * 200;
  else y = GROUND_Y - ENEMY_H - 20;
  const speed = (2 + Math.random() * 2.5) * game.speedMultiplier;
  game.enemies.push({ x: CANVAS_W + 20, y, w, h, type, speed, hit: false });
}

function spawnCoin() {
  const y = 100 + Math.random() * (GROUND_Y - COIN_H - 140);
  game.coins.push({ x: CANVAS_W + 10, y, w: COIN_W, h: COIN_H, collected: false, bob: Math.random() * Math.PI * 2 });
}

function spawnBlock() {
  const blockColors = ['block_blue', 'block_red', 'block_empty', 'brick'];
  const color = blockColors[Math.floor(Math.random() * blockColors.length)];
  const height = 1 + Math.floor(Math.random() * 3);
  const bh = height * BLOCK_TILE;
  const speed = (1.5 + Math.random() * 1.5) * game.speedMultiplier;
  game.blocks.push({
    x: CANVAS_W + 20,
    y: GROUND_Y - bh,
    w: BLOCK_TILE,
    h: bh,
    tiles: height,
    color,
    speed,
  });
}

function spawnPlatform() {
  const tiles = 2 + Math.floor(Math.random() * 3);
  const pw = tiles * BLOCK_TILE;
  const py = 140 + Math.random() * (GROUND_Y - 240);
  const speed = (1 + Math.random() * 1.5) * game.speedMultiplier;
  game.platforms.push({
    x: CANVAS_W + 20,
    y: py,
    w: pw,
    h: BLOCK_TILE,
    tiles,
    speed,
  });
}

function spawnFloatingText(x, y, text, color) {
  game.floatingTexts.push({ x, y, text, color, life: 60, maxLife: 60 });
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    game.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 2,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      color,
      size: 3 + Math.random() * 4,
    });
  }
}

function update() {
  if (!game.started || game.gameOver) return;

  game.frame++;

  game.speedMultiplier = 1 + game.score / 2000;

  player.animState = 'idle';
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    player.x -= MOVE_SPEED;
    player.animState = 'walk';
  }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    player.x += MOVE_SPEED;
    player.animState = 'walk';
  }
  if ((keys['ArrowUp'] || keys['w'] || keys['W'] || keys[' ']) && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    player.animState = 'jump';
  }

  player.vy += GRAVITY;
  player.y += player.vy;
  player.onGround = false;

  for (const p of game.platforms) {
    if (player.vy >= 0 &&
        player.x + PLAYER_W > p.x + 4 &&
        player.x < p.x + p.w - 4 &&
        player.y + PLAYER_H >= p.y &&
        player.y + PLAYER_H <= p.y + 18) {
      player.y = p.y - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
      break;
    }
  }

  if (player.y + PLAYER_H >= GROUND_Y) {
    player.y = GROUND_Y - PLAYER_H;
    player.vy = 0;
    player.onGround = true;
  }

  if (player.onGround && player.animState === 'jump') player.animState = 'idle';

  player.x = Math.max(0, Math.min(CANVAS_W - PLAYER_W, player.x));

  if (player.animState === 'walk') {
    game.walkTimer++;
    if (game.walkTimer >= 10) {
      game.walkTimer = 0;
      game.walkFrame = game.walkFrame === 0 ? 1 : 0;
    }
  }

  if (game.invincible > 0) game.invincible--;

  game.bgOffset1 -= 0.15;
  game.bgOffset2 -= 0.6;
  game.bgOffset3 -= 1.2;

  game.enemySpawnTimer++;
  if (game.enemySpawnTimer >= Math.max(25, ENEMY_SPAWN_RATE / game.speedMultiplier)) {
    spawnEnemy();
    game.enemySpawnTimer = 0;
  }

  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    e.x -= e.speed;
    if (e.x + e.w < -20) { game.enemies.splice(i, 1); continue; }

    if (!e.hit && game.invincible === 0) {
      const pb = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };
      const eb = { x: e.x, y: e.y, w: e.w, h: e.h };
      if (rectCollide(pb, eb)) {
        e.hit = true;
        game.lives--;
        game.invincible = INVINCIBLE_FRAMES;
        spawnParticles(player.x + PLAYER_W / 2, player.y + PLAYER_H / 2, '#ff4444', 15);
        if (game.lives <= 0) {
          game.gameOver = true;
        }
      }
    }

    if (e.hit) {
      game.enemies.splice(i, 1);
    }
  }

  game.blockSpawnTimer++;
  if (game.blockSpawnTimer >= Math.max(40, BLOCK_SPAWN_RATE / game.speedMultiplier)) {
    spawnBlock();
    game.blockSpawnTimer = 0;
  }

  for (let i = game.blocks.length - 1; i >= 0; i--) {
    const b = game.blocks[i];
    b.x -= b.speed;
    if (b.x + b.w < -50) { game.blocks.splice(i, 1); continue; }

    const canLand = player.vy >= 0 &&
      player.x + PLAYER_W > b.x + 4 &&
      player.x < b.x + b.w - 4 &&
      player.y + PLAYER_H >= b.y &&
      player.y + PLAYER_H <= b.y + 16;

    if (canLand) {
      player.y = b.y - PLAYER_H;
      player.vy = 0;
      player.onGround = true;
      continue;
    }

    const overlapX = player.x + PLAYER_W > b.x + 2 && player.x < b.x + b.w - 2;
    const overlapY = player.y + PLAYER_H > b.y + 4 && player.y < b.y + b.h;
    if (overlapX && overlapY) {
      if (player.x < b.x) {
        player.x = b.x - PLAYER_W;
      } else {
        player.x = b.x + b.w;
      }
    }
  }

  game.platformSpawnTimer++;
  if (game.platformSpawnTimer >= Math.max(60, PLATFORM_SPAWN_RATE / game.speedMultiplier)) {
    spawnPlatform();
    game.platformSpawnTimer = 0;
  }

  for (let i = game.platforms.length - 1; i >= 0; i--) {
    const p = game.platforms[i];
    p.x -= p.speed;
    if (p.x + p.w < -40) { game.platforms.splice(i, 1); }
  }

  game.coinSpawnTimer++;
  if (game.coinSpawnTimer >= Math.max(20, COIN_SPAWN_RATE / game.speedMultiplier)) {
    spawnCoin();
    game.coinSpawnTimer = 0;
  }

  for (let i = game.coins.length - 1; i >= 0; i--) {
    const c = game.coins[i];
    c.x -= 1.5 * game.speedMultiplier;
    if (c.x + c.w < -20) { game.coins.splice(i, 1); continue; }

    const pb = { x: player.x, y: player.y, w: PLAYER_W, h: PLAYER_H };
    const cb = { x: c.x, y: c.y, w: c.w, h: c.h };
    if (!c.collected && rectCollide(pb, cb)) {
      c.collected = true;
      game.score += 100;
      spawnParticles(c.x + c.w / 2, c.y + c.h / 2, '#ffd700', 12);
      spawnFloatingText(c.x, c.y - 10, '+100', '#ffd700');
      game.coins.splice(i, 1);
    }
  }

  for (let i = game.particles.length - 1; i >= 0; i--) {
    const p = game.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.1;
    p.life--;
    if (p.life <= 0) game.particles.splice(i, 1);
  }

  for (let i = game.floatingTexts.length - 1; i >= 0; i--) {
    const ft = game.floatingTexts[i];
    ft.y -= 1.5;
    ft.life--;
    if (ft.life <= 0) game.floatingTexts.splice(i, 1);
  }
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  if (!game.started) {
    drawStartScreen();
    return;
  }

  drawBackground();
  drawGround();

  for (const c of game.coins) {
    const bobY = c.y + Math.sin(game.frame * 0.05 + c.bob) * 4;
    drawSprite('coin', c.x, bobY, c.w, c.h);
  }

  for (const b of game.blocks) {
    for (let t = 0; t < b.tiles; t++) {
      const by = b.y + t * BLOCK_TILE;
      drawSprite(t === 0 && b.color === 'brick' ? 'brick' : b.color, b.x, by, b.w, BLOCK_TILE);
    }
  }

  for (const p of game.platforms) {
    for (let t = 0; t < p.tiles; t++) {
      drawSprite('platform', p.x + t * BLOCK_TILE, p.y, BLOCK_TILE, p.h);
    }
  }

  for (const e of game.enemies) {
    let spriteKey = 'enemy_bee';
    if (e.type === 'slime') spriteKey = 'enemy_slime';
    else if (e.type === 'saw') spriteKey = 'enemy_saw';
    drawSprite(spriteKey, e.x, e.y, e.w, e.h);
  }

  if (game.invincible > 0 && game.invincible % 8 < 4) {
  } else {
    let spriteKey = 'player_idle';
    if (player.animState === 'walk') {
      spriteKey = game.walkFrame === 0 ? 'player_walk_a' : 'player_walk_b';
    } else if (!player.onGround) {
      spriteKey = 'player_jump';
    } else if (game.invincible > 0) {
      spriteKey = 'player_hit';
    }
    drawSprite(spriteKey, player.x, player.y, PLAYER_W, PLAYER_H);
  }

  for (const p of game.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  for (const ft of game.floatingTexts) {
    const alpha = ft.life / ft.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x + 20, ft.y);
  }
  ctx.globalAlpha = 1;

  drawUI();

  if (game.gameOver) drawGameOver();
}

function drawSprite(key, x, y, w, h) {
  const img = sprites[key];
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(x, y, w, h);
  }
}

function drawBackground() {
  const layers = [
    { key: 'bg_clouds', offset: game.bgOffset1, speed: 0.15 },
    { key: 'bg_hills', offset: game.bgOffset2, speed: 0.6 },
    { key: 'bg_trees', offset: game.bgOffset3, speed: 1.2 },
  ];
  for (const layer of layers) {
    const img = sprites[layer.key];
    if (img && img.complete) {
      const bw = img.naturalWidth;
      const bh = img.naturalHeight;
      const scale = CANVAS_H / bh;
      const sw = bw * scale;
      const ox = ((layer.offset) % sw + sw) % sw;
      for (let x = -ox; x < CANVAS_W; x += sw) {
        ctx.drawImage(img, x, 0, sw, CANVAS_H);
      }
    }
  }
}

function drawGround() {
  const grass = sprites.tile_grass;
  const dirt = sprites.tile_dirt;
  const tileSize = 64;

  if (grass && grass.complete && dirt && dirt.complete) {
    for (let x = 0; x < CANVAS_W; x += tileSize) {
      ctx.drawImage(grass, x, GROUND_Y, tileSize, tileSize);
    }
    for (let y = GROUND_Y + tileSize; y < CANVAS_H; y += tileSize) {
      for (let x = 0; x < CANVAS_W; x += tileSize) {
        ctx.drawImage(dirt, x, y, tileSize, tileSize);
      }
    }
  } else {
    ctx.fillStyle = '#4a7c3f';
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, GROUND_Y + 12, CANVAS_W, CANVAS_H - GROUND_Y - 12);
  }
}

function drawUI() {
  const heartW = 36;
  const heartH = 36;
  const padding = 16;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(8, 6, 260, 60);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.strokeRect(8, 6, 260, 60);

  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd700';
  const coinIcon = sprites.coin;
  if (coinIcon && coinIcon.complete) {
    ctx.drawImage(coinIcon, padding, 16, 28, 28);
  }
  ctx.fillText(game.score, padding + 34, 42);

  for (let i = 0; i < MAX_LIVES; i++) {
    const lx = 120 + i * (heartW + 4);
    const ly = 16;
    if (i < game.lives) {
      drawSprite('heart_full', lx, ly, heartW, heartH);
    } else {
      drawSprite('heart_empty', lx, ly, heartW, heartH);
    }
  }
}

function drawStartScreen() {
  drawBackground();

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 56px monospace';
  ctx.fillText('DODGE BALLS', CANVAS_W / 2, CANVAS_H / 2 - 80);

  ctx.font = '22px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText('Coins  |  Enemies  |  Blocks  |  Platforms!', CANVAS_W / 2, CANVAS_H / 2 - 20);

  ctx.font = '28px monospace';
  ctx.fillStyle = '#e94560';
  ctx.fillText('Click or press SPACE to start', CANVAS_W / 2, CANVAS_H / 2 + 50);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('Arrow Keys / WASD - Move & Jump', CANVAS_W / 2, CANVAS_H / 2 + 100);
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 64px monospace';
  ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 60);

  ctx.fillStyle = '#ffd700';
  ctx.font = '36px monospace';
  ctx.fillText('Score: ' + game.score, CANVAS_W / 2, CANVAS_H / 2 + 10);

  ctx.fillStyle = '#fff';
  ctx.font = '26px monospace';
  ctx.fillText('Press R or Click to Restart', CANVAS_W / 2, CANVAS_H / 2 + 70);
}

function gameLoop() {
  if (gameReady) {
    update();
    draw();
  } else {
    drawLoading(Math.min(100, Math.floor((loadedCount / totalSprites) * 100)));
  }
  requestAnimationFrame(gameLoop);
}

gameLoop();
