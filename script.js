// ==============
// DOM要素の取得
// ==============
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const homeScreen = document.getElementById('home-screen');
const clearScreen = document.getElementById('clear-screen');   // 【新規】
const failureScreen = document.getElementById('failure-screen'); // 【変更】
const startButton = document.getElementById('start-button');
const highscoreButton = document.getElementById('highscore-button');
const restartButtons = document.querySelectorAll('.restart-button'); // 【変更】
const finalScoreEls = document.querySelectorAll('.final-score');   // 【変更】

// オーディオ要素
const bgm = document.getElementById('bgm');
const endSe = document.getElementById('end-se');

// ==============
// 画像の読み込み
// ==============
const enemyImage = new Image();
enemyImage.src = 'image/ka.png';
const bossImage = new Image();
bossImage.src = 'image/u.png';

// ==============
// ゲーム設定
// ==============
canvas.width = 600;
canvas.height = 800;
let score = 0;
let highScore = localStorage.getItem('danmakuHighScore') || 0;
let gameRunning = false;
let animationFrameId;

let gameTimer = 0;
const gameDuration = 30 * 60; // 30秒

// ========
// プレイヤー
// ========
const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 30,
    height: 30,
    bullets: [],
    shootInterval: 10,
    shootTimer: 0
};

// ========
// 敵キャラクター
// ========
let enemies = [];
let enemySpawnInterval = 20;
let enemySpawnTimer = 0;

// ========
// ボスキャラクター
// ========
let boss = null;
const bossAppearanceScore = 300;

// ==================
// イベントリスナー設定
// ==================
startButton.addEventListener('click', () => {
    homeScreen.style.display = 'none';
    startGame();
});

highscoreButton.addEventListener('click', () => {
    alert(`最高得点: ${highScore}`);
});

// 【変更】両方のリスタートボタンにイベントを設定
restartButtons.forEach(button => {
    button.addEventListener('click', () => {
        clearScreen.style.display = 'none';
        failureScreen.style.display = 'none';
        startGame();
    });
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left;
});


// ==================
// ゲームのコア関数
// ==================
function resetGame() {
    score = 0;
    player.x = canvas.width / 2;
    player.bullets = [];
    enemies = [];
    boss = null;
    enemySpawnTimer = 0;
    player.shootTimer = 0;
    gameTimer = gameDuration;
}

function startGame() {
    resetGame();
    gameRunning = true;
    bgm.currentTime = 0;
    bgm.play();
    gameLoop();
}

// 【変更】ゲーム終了処理をクリア/失敗で分岐
function endGame(isCleared) {
    if (!gameRunning) return; // 二重呼び出し防止
    gameRunning = false;
    bgm.pause();
    cancelAnimationFrame(animationFrameId);

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('danmakuHighScore', highScore);
    }
    
    // スコアを両方の画面に設定
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
// 描画関連の関数 (変更なし)
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
        ctx.fillStyle = 'red';
        ctx.fillRect(boss.x - boss.width / 2, boss.y - boss.height / 2 - 20, boss.width, 10);
        ctx.fillStyle = 'green';
        ctx.fillRect(boss.x - boss.width / 2, boss.y - boss.height / 2 - 20, boss.width * (boss.hp / boss.maxHp), 10);
    }
}
function drawUI() {
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${score}`, 20, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`TIME: ${(gameTimer / 60).toFixed(2)}`, canvas.width - 20, 40);
}


// ==================
// 更新処理の関数 (変更なし)
// ==================
function updatePlayer() {
    player.shootTimer++;
    if (player.shootTimer >= player.shootInterval) {
        player.shootTimer = 0;
        player.bullets.push({x: player.x, y: player.y - player.height / 2, width: 5, height: 15, speed: 10});
    }
}
function updateBullets() {
    player.bullets.forEach((bullet, index) => {
        bullet.y -= bullet.speed;
        if (bullet.y < 0) {
            player.bullets.splice(index, 1);
        }
    });
}
function updateEnemies() {
    if (!boss && score < bossAppearanceScore) {
        enemySpawnTimer++;
        if (enemySpawnTimer >= enemySpawnInterval) {
            enemySpawnTimer = 0;
            enemies.push({x: Math.random() * canvas.width, y: -30, width: 50, height: 50, speed: 3 + Math.random() * 3});
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
        boss = {
            x: canvas.width / 2, y: 150, width: 120, height: 120,
            speed: 2, direction: 1, maxHp: 80, hp: 80,
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
// 当たり判定
// ==================
function checkCollisions() {
    // プレイヤーの弾 vs 敵
    for (let i = player.bullets.length - 1; i >= 0; i--) {
        for (let j = enemies.length - 1; j >= 0; j--) {
            const bullet = player.bullets[i];
            const enemy = enemies[j];
            if (!bullet || !enemy) continue; // 安全策
            if (bullet.x < enemy.x + enemy.width / 2 && bullet.x + bullet.width > enemy.x - enemy.width / 2 &&
                bullet.y < enemy.y + enemy.height / 2 && bullet.y + bullet.height > enemy.y - enemy.height / 2) {
                player.bullets.splice(i, 1);
                enemies.splice(j, 1);
                score += 10;
                playDestroySE();
                break;
            }
        }
    }

    // プレイヤーの弾 vs ボス
    if (boss) {
        for (let i = player.bullets.length - 1; i >= 0; i--) {
            const bullet = player.bullets[i];
            if (!bullet) continue;
            if (bullet.x < boss.x + boss.width / 2 && bullet.x + bullet.width > boss.x - boss.width / 2 &&
                bullet.y < boss.y + boss.height / 2 && bullet.y + bullet.height > boss.y - boss.height / 2) {
                player.bullets.splice(i, 1);
                boss.hp -= 2;
                score += 5;
                if (boss.hp <= 0) {
                    score += 500;
                    endSe.play();
                    boss = null; // ボスを消す
                    endGame(true); // 【変更】クリアとしてゲーム終了
                    return; // 処理を抜ける
                }
                break;
            }
        }
    }
}

// ==================
// メインゲームループ
// ==================
function gameLoop() {
    if (!gameRunning) return;

    // タイマー更新
    gameTimer--;
    if (gameTimer <= 0) {
        endGame(false); // 【変更】時間切れは失敗としてゲーム終了
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