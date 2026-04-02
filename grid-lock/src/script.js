const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const deathEl = document.getElementById('count');

canvas.width = 600;
canvas.height = 400;

// --- ASSET PRELOADING ---
const assets = {
    player: new Image(),
    enemy: new Image(),
    goal: new Image()
};

// Use the paths you requested
assets.player.src = 'src/img/player.png';
assets.enemy.src = 'src/img/enemy.png';
assets.goal.src = 'src/img/goal.png';

let deaths = 0;
const keys = {};

const player = {
    x: 40, y: 185, w: 30, h: 30,
    speed: 4
};

const goal = { x: 530, y: 150, w: 50, h: 100 };

const enemies = [
    { x: 150, y: 50,  dir: 1,  speed: 5,  range: [50, 350] },
    { x: 280, y: 350, dir: -1, speed: 9,  range: [50, 350] },
    { x: 410, y: 50,  dir: 1,  speed: 13, range: [50, 350] }
];

window.onkeydown = e => keys[e.code] = true;
window.onkeyup = e => keys[e.code] = false;

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + 20 &&
           rect1.x + rect1.w > rect2.x &&
           rect1.y < rect2.y + 20 &&
           rect1.y + rect1.h > rect2.y;
}

function update() {
    // Movement
    if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y < canvas.height - player.h) player.y += player.speed;
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < canvas.width - player.w) player.x += player.speed;

    // Enemy Patrol & Collision
    enemies.forEach(en => {
        en.y += en.speed * en.dir;
        if (en.y <= en.range[0] || en.y >= en.range[1]) en.dir *= -1;

        if (checkCollision(player, en)) {
            deaths++;
            deathEl.innerText = deaths;
            player.x = 40; player.y = 185;
        }
    });

    // Win Check
    if (player.x + player.w > goal.x && player.y > goal.y && player.y < goal.y + goal.h) {
        alert("ACCESS GRANTED.");
        location.reload();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Goal Sprite
    ctx.drawImage(assets.goal, goal.x, goal.y, goal.w, goal.h);

    // Draw Enemy Sprites
    enemies.forEach(en => {
        ctx.drawImage(assets.enemy, en.x, en.y, 25, 25);
    });

    // Draw Player Sprite
    ctx.drawImage(assets.player, player.x, player.y, player.w, player.h);

    update();
    requestAnimationFrame(draw);
}

// Start once the player image is ready
assets.player.onload = () => {
    draw();
};
