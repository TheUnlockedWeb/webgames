const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const deathEl = document.getElementById('death-count');

// 1. Setup & Constants
canvas.width = 600;
canvas.height = 400;

const SZ = 20; // Size of one grid unit
let deaths = 0;

const player = {
    x: 40, y: 190, w: 15, h: 15,
    spawnX: 40, spawnY: 190,
    speed: 3
};

// 2. Enemy Data (Complex Patterns)
// Each enemy has an [x, y] and a movement logic
const enemies = [
    { x: 150, y: 50,  dir: 1, speed: 6, range: [50, 350] },
    { x: 250, y: 350, dir: -1, speed: 8, range: [50, 350] },
    { x: 350, y: 50,  dir: 1, speed: 10, range: [50, 350] },
    { x: 450, y: 350, dir: -1, speed: 12, range: [50, 350] },
    // Horizontal sweepers
    { x: 100, y: 100, dx: 1, dy: 0, speed: 5, hRange: [100, 500] }
];

const goal = { x: 540, y: 180, w: 40, h: 40 };

const keys = {};
window.onkeydown = (e) => keys[e.code] = true;
window.onkeyup = (e) => keys[e.code] = false;

// 3. Game Logic
function update() {
    // Player Movement
    if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y < canvas.height - player.h) player.y += player.speed;
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < canvas.width - player.w) player.x += player.speed;

    // Enemy AI
    enemies.forEach(en => {
        if (en.range) { // Vertical bounce logic
            en.y += en.speed * en.dir;
            if (en.y <= en.range[0] || en.y >= en.range[1]) en.dir *= -1;
        } else { // Horizontal loop logic
            en.x += en.speed;
            if (en.x > en.hRange[1]) en.x = en.hRange[0];
        }

        // Collision Detection (Hitbox Math)
        if (player.x < en.x + 10 && player.x + player.w > en.x &&
            player.y < en.y + 10 && player.y + player.h > en.y) {
            reset();
        }
    });

    // Goal Check
    if (player.x > goal.x) {
        alert("PROTOCOL COMPLETE. YOU SURVIVED.");
        reset();
    }
}

function reset() {
    deaths++;
    deathEl.innerText = deaths;
    player.x = player.spawnX;
    player.y = player.spawnY;
}

// 4. Rendering
function draw() {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines (Visual Decoration)
    ctx.strokeStyle = '#111';
    for(let i=0; i<canvas.width; i+=20) {
        ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,400); ctx.stroke();
    }

    // Draw Goal
    ctx.fillStyle = '#0f0';
    ctx.fillRect(goal.x, goal.y, goal.w, goal.h);

    // Draw Enemies (Neon Orbs)
    ctx.fillStyle = '#f00';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#f00';
    enemies.forEach(en => {
        ctx.beginPath();
        ctx.arc(en.x, en.y, 8, 0, Math.PI*2);
        ctx.fill();
    });

    // Draw Player
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.shadowBlur = 0;

    update();
    requestAnimationFrame(draw);
}

draw();
