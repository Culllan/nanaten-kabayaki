// ==============
// DOM要素の取得
// ==============
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const homeScreen = document.getElementById('home-screen');
const clearScreen = document.getElementById('clear-screen');
const failureScreen = document.getElementById('failure-screen');
const startButton = document.getElementById('start-button');
const highscoreButton = document.getElementById('highscore-button');
const restartButtons = document.querySelectorAll('.restart-button');
const finalScoreEls = document.querySelectorAll('.final-score');
const tapInstruction = document.getElementById('tap-instruction');

// オーディオ要素
const bgm = document.getElementById('bgm');
const endSe = document.getElementById('end-se');

// ==============
// ゲーム設定
// ==============
let score = 0;
let highScore = localStorage.getItem('danmakuHighScore') || 0;
let gameRunning = false;
let animationFrameId;
let gameTimer = 0;
const gameDuration = 30 * 60;

// ========
// プレイヤー
// ========
const player = { x: 0, y: 0, width: 0, height: 0, bullets: [], shootInterval: 15, shootTimer: 0 };

// ========
// 敵・ボス
// ========
let enemies = [];
let enemySpawnInterval = 30;
let enemySpawnTimer = 0;
let boss = null;
let bossAppearanceScore = 150;

// ==================
// イベントリスナー設定
// ==================
startButton.addEventListener('click', startGame);
highscoreButton.addEventListener('click', () => alert(`最高得点: ${highScore}`));
restartButtons.forEach(button => button.addEventListener('click', () => {
    clearScreen.style.display = 'none';
    failureScreen.style.display = 'none';
    startGame();
}));

function updatePlayerPosition(clientX) {
    const rect = canvas.getBoundingClientRect();
    let newX = clientX - rect.left;
    if (newX < player.width / 2) newX = player.width / 2;
    if (newX > canvas.width - player.width / 2) newX = canvas.width - player.width / 2;
    player.x = newX;
}

canvas.addEventListener('mousemove', (e) => {
    if (!gameRunning) return;
    updatePlayerPosition(e.clientX);
});

canvas.addEventListener('touchstart', (e) => {
    if (!gameRunning) return;
    e.preventDefault();
    updatePlayerPosition(e.touches[0].clientX);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!gameRunning) return;
    e.preventDefault();
    updatePlayerPosition(e.touches[0].clientX);
}, { passive: false });


// ==================
// ゲームのコア関数
// ==================

function setGameScale() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    player.width = canvas.width * 0.08;
    player.height = canvas.width * 0.08;
    player.x = canvas.width / 2;
    player.y = canvas.height - player.height * 1.5;
    ctx.font = `${canvas.width * 0.05}px sans-serif`;
}

function resetGame() {
    score = 0;
    enemies = [];
    boss = null;
    player.bullets = [];
    enemySpawnTimer = 0;
    player.shootTimer = 0;
    gameTimer = gameDuration;
}

function startGame() {
    homeScreen.style.display = 'none';
    setGameScale();
    resetGame();
    gameRunning = true;
    bgm.currentTime = 0;
    bgm.play().catch(e => console.log("BGMの再生に失敗:", e));
    gameLoop();
    tapInstruction.style.display = 'block';
    setTimeout(() => {
        tapInstruction.style.display = 'none';
    }, 2000);
}

function endGame(isCleared) {
    if (!gameRunning) return;
    gameRunning = false;
    bgm.pause();
    cancelAnimationFrame(animationFrameId);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('danmakuHighScore', highScore);
    }
    finalScoreEls.forEach(el => el.textContent = score);
    if (isCleared) {
        clearScreen.style.display = 'flex';
    } else {
        failureScreen.style.display = 'flex';
    }
}

function playDestroySE() {
    const se = new Audio('mp3/na.mp3');
    se.play();
}


// ==================
// 描画関連の関数
// ==================
function drawPlayer() {
    ctx.fillStyle = '#0ff';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - player.height / 2);
    ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2);
    ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
    ctx.closePath();
    ctx.fill();
}
function drawBullets() {
    ctx.fillStyle = '#ff0';
    player.bullets.forEach(bullet => {
        ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height);
    });
}
function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.drawImage(enemyImage, enemy.x - enemy.width / 2, enemy.y - enemy.height / 2, enemy.width, enemy.height);
    });
}
function drawBoss() {
    if (boss) {
        ctx.drawImage(bossImage, boss.x - boss.width / 2, boss.y - boss.height / 2, boss.width, boss.height);
        const barY = boss.y - boss.height / 2 - canvas.height * 0.02;
        ctx.fillStyle = 'red';
        ctx.fillRect(boss.x - boss.width / 2, barY, boss.width, canvas.height * 0.015);
        ctx.fillStyle = 'green';
        ctx.fillRect(boss.x - boss.width / 2, barY, boss.width * (boss.hp / boss.maxHp), canvas.height * 0.015);
    }
}
function drawUI() {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, canvas.width * 0.03, canvas.height * 0.05);
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${(gameTimer / 60).toFixed(2)}`, canvas.width * 0.97, canvas.height * 0.05);
}


// ==================
// 更新処理の関数
// ==================
function updatePlayer() {
    player.shootTimer++;
    if (player.shootTimer >= player.shootInterval) {
        player.shootTimer = 0;
        player.bullets.push({
            x: player.x,
            y: player.y - player.height / 2,
            width: canvas.width * 0.02,
            height: canvas.height * 0.03,
            speed: canvas.height * 0.02
        });
    }
}
function updateEnemies() {
    if (!boss && score < bossAppearanceScore) {
        enemySpawnTimer++;
        if (enemySpawnTimer >= enemySpawnInterval) {
            enemySpawnTimer = 0;
            const size = canvas.width * 0.1;
            enemies.push({
                x: Math.random() * canvas.width,
                y: -size,
                width: size,
                height: size,
                speed: canvas.height * 0.003 + Math.random() * (canvas.height * 0.002)
            });
        }
    }
    enemies.forEach((enemy, index) => {
        enemy.y += enemy.speed;
        if (enemy.y > canvas.height + enemy.height) {
            enemies.splice(index, 1);
        }
    });
}
function updateBoss() {
    if (score >= bossAppearanceScore && !boss) {
        enemies = [];
        const size = canvas.width * 0.25;
        boss = {
            x: canvas.width / 2, y: canvas.height * 0.2, width: size, height: size,
            speed: canvas.width * 0.002, direction: 1,
            maxHp: 50, hp: 50,
        };
    }
    if (boss) {
        boss.x += boss.speed * boss.direction;
        if (boss.x > canvas.width - boss.width / 2 || boss.x < boss.width / 2) {
            boss.direction *= -1;
        }
    }
}

// ==================
// 当たり判定 (バグを修正した箇所)
// ==================
function checkCollisions() {
    for (let i = player.bullets.length - 1; i >= 0; i--) {
        const bullet = player.bullets[i];
        let bulletRemoved = false;

        // vs 敵
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            if (bullet.x < enemy.x + enemy.width / 2 && bullet.x + bullet.width > enemy.x - enemy.width / 2 &&
                bullet.y < enemy.y + enemy.height / 2 && bullet.y + bullet.height > enemy.y - enemy.height / 2) {
                
                player.bullets.splice(i, 1);
                enemies.splice(j, 1);
                score += 10;
                playDestroySE();
                bulletRemoved = true;
                break;
            }
        }

        if (bulletRemoved) {
            continue;
        }

        // vs ボス
        if (boss) {
            if (bullet.x < boss.x + boss.width / 2 && bullet.x + bullet.width > boss.x - boss.width / 2 &&
                bullet.y < boss.y + boss.height / 2 && bullet.y + bullet.height > boss.y - boss.height / 2) {
                
                player.bullets.splice(i, 1);
                boss.hp -= 2;
                score += 5;
                if (boss.hp <= 0) {
                    score += 500;
                    endSe.play();
                    boss = null;
                    endGame(true);
                    return;
                }
            }
        }
    }
}

// ==================
// メインゲームループ
// ==================
function gameLoop() {
    if (!gameRunning) return;
    gameTimer--;
    if (gameTimer <= 0) {
        endGame(false);
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updatePlayer();
    updateBullets();
    updateEnemies();
    updateBoss();
    checkCollisions();
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawBoss();
    drawUI();
    animationFrameId = requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => {
    if (gameRunning) {
        setGameScale();
    }
});