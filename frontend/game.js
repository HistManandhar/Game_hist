const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const leaderboardScreen = document.getElementById('leaderboardScreen');
const currentScoreEl = document.getElementById('currentScore');
const currentSpeedEl = document.getElementById('currentSpeed');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const scoreForm = document.getElementById('scoreForm');
const playerNameInput = document.getElementById('playerName');
const submitScoreBtn = document.getElementById('submitScoreBtn');
const restartBtn = document.getElementById('restartBtn');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardLoading = document.getElementById('leaderboardLoading');

// Event Listeners for Buttons
document.getElementById('startBtn').addEventListener('click', initGame);
document.getElementById('viewLeaderboardBtn').addEventListener('click', showLeaderboard);
document.getElementById('closeLeaderboardBtn').addEventListener('click', () => {
    leaderboardScreen.classList.remove('active');
    if (!gameState.isPlaying && !gameState.isGameOver) {
        startScreen.classList.add('active');
    } else if (gameState.isGameOver) {
        gameOverScreen.classList.add('active');
    }
});
restartBtn.addEventListener('click', initGame);

scoreForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = playerNameInput.value.trim();
    if (name && gameState.distance > 0) {
        submitScoreBtn.disabled = true;
        submitScoreBtn.textContent = 'SUBMITTING...';
        await submitScore(name, Math.floor(gameState.distance));
        scoreForm.style.display = 'none';
        restartBtn.style.display = 'block';
        showLeaderboard();
    }
});

// Game State
let gameState = {
    isPlaying: false,
    isGameOver: false,
    distance: 0,
    speed: 0,
    maxSpeed: 15,
    acceleration: 0.1,
    friction: 0.05,
    cameraY: 0
};

// Player Car
let player = {
    x: 0,
    y: 0,
    width: 40,
    height: 80,
    color: '#00f0ff',
    vx: 0,
    vy: 0,
    steerSpeed: 7,
    steerFriction: 0.85
};

// Inputs
let keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false
};

// Road and Obstacles
let obstacles = [];
let roadLines = [];
const laneWidth = canvas.width / 3;

// Resize handling
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Adjust player starting position if not playing
    if (!gameState.isPlaying) {
        player.x = canvas.width / 2 - player.width / 2;
        player.y = canvas.height - player.height - 50;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial call

// Input Handling
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key] = true;
        keys[e.key.toLowerCase()] = true;
    }
});
window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key) || keys.hasOwnProperty(e.key.toLowerCase())) {
        keys[e.key] = false;
        keys[e.key.toLowerCase()] = false;
    }
});

function initGame() {
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    leaderboardScreen.classList.remove('active');
    
    scoreForm.style.display = 'block';
    restartBtn.style.display = 'none';
    submitScoreBtn.disabled = false;
    submitScoreBtn.textContent = 'SUBMIT SCORE';
    playerNameInput.value = '';

    resizeCanvas();

    gameState = {
        isPlaying: true,
        isGameOver: false,
        distance: 0,
        speed: 5, // starting speed
        maxSpeed: 20,
        acceleration: 0.05,
        friction: 0.02,
        cameraY: 0
    };

    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 50;
    player.vx = 0;

    obstacles = [];
    roadLines = [];
    
    // Init road lines
    for(let i = 0; i < canvas.height; i += 80) {
        roadLines.push({ y: i });
    }

    gameLoop();
}

function spawnObstacle() {
    // Determine lane (0, 1, or 2)
    const lane = Math.floor(Math.random() * 3);
    const w = 40;
    const h = 80;
    // Calculate x based on lane
    const laneWidth = canvas.width / 3;
    const x = (lane * laneWidth) + (laneWidth / 2) - (w / 2);
    
    // Slight random offset
    const offsetX = (Math.random() - 0.5) * 20;
    
    obstacles.push({
        x: x + offsetX,
        y: -h - 50,
        width: w,
        height: h,
        color: '#ff003c',
        speed: Math.random() * 3 + 2 // Obstacles move slower than max speed
    });
}

function updatePhysics() {
    if (!gameState.isPlaying) return;

    // Acceleration & Braking
    if (keys.ArrowUp || keys.w) {
        gameState.speed += gameState.acceleration;
    } else if (keys.ArrowDown || keys.s) {
        gameState.speed -= gameState.acceleration * 2; // Braking is stronger
    } else {
        // Natural friction
        gameState.speed -= gameState.friction;
    }

    // Cap speed
    if (gameState.speed > gameState.maxSpeed) gameState.speed = gameState.maxSpeed;
    if (gameState.speed < 2) gameState.speed = 2; // Minimum forward movement

    // Steering
    if (keys.ArrowLeft || keys.a) {
        player.vx -= 1.5;
    }
    if (keys.ArrowRight || keys.d) {
        player.vx += 1.5;
    }

    // Apply steering friction and cap lateral velocity
    player.vx *= player.steerFriction;
    player.x += player.vx;

    // Boundary collision (road edges)
    if (player.x < 0) {
        player.x = 0;
        player.vx = 0;
    }
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
        player.vx = 0;
    }

    // Distance update based on speed
    gameState.distance += (gameState.speed / 10);
    gameState.cameraY += gameState.speed;

    // Update UI
    currentScoreEl.textContent = Math.floor(gameState.distance);
    currentSpeedEl.textContent = Math.floor(gameState.speed * 10);

    // Road lines animation
    for (let i = 0; i < roadLines.length; i++) {
        roadLines[i].y += gameState.speed;
        if (roadLines[i].y > canvas.height) {
            roadLines[i].y = -80; // Reset to top
        }
    }

    // Obstacles logic
    // Spawn chance based on speed
    if (Math.random() < 0.02 + (gameState.speed * 0.001)) {
        // Prevent spawning too close to each other
        if (obstacles.length === 0 || obstacles[obstacles.length - 1].y > 200) {
             spawnObstacle();
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        
        // Relative speed (player speed - obstacle speed)
        obs.y += (gameState.speed - obs.speed);

        // Collision Detection (AABB)
        // Adjust hitboxes slightly for forgiving gameplay
        const margin = 5;
        if (player.x + margin < obs.x + obs.width - margin &&
            player.x + player.width - margin > obs.x + margin &&
            player.y + margin < obs.y + obs.height - margin &&
            player.y + player.height - margin > obs.y + margin) {
            gameOver();
        }

        // Remove if off screen bottom
        if (obs.y > canvas.height) {
            obstacles.splice(i, 1);
        }
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#1e1e24'; // Asphalt color
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw road lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const laneWidth = canvas.width / 3;
    for (let line of roadLines) {
        // Left dashed line
        ctx.fillRect(laneWidth - 2, line.y, 4, 40);
        // Right dashed line
        ctx.fillRect(laneWidth * 2 - 2, line.y, 4, 40);
    }

    // Draw Obstacles
    for (let obs of obstacles) {
        drawCar(obs.x, obs.y, obs.width, obs.height, obs.color);
    }

    // Draw Player
    drawCar(player.x, player.y, player.width, player.height, player.color, true);
}

function drawCar(x, y, w, h, color, isPlayer = false) {
    ctx.save();
    ctx.translate(x, y);

    // Car shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(4, 4, w, h);

    // Car body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 8);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#0f0f13';
    ctx.beginPath();
    ctx.roundRect(4, h * 0.2, w - 8, h * 0.25, 4);
    ctx.fill();

    // Rear window
    ctx.beginPath();
    ctx.roundRect(6, h * 0.7, w - 12, h * 0.15, 2);
    ctx.fill();

    // Headlights
    if (isPlayer) {
        // Neon glow effect for player
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff';
        ctx.fillRect(4, -2, 8, 4);
        ctx.fillRect(w - 12, -2, 8, 4);
    } else {
         // Taillights for obstacles (since they move same direction)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(4, h - 2, 8, 4);
        ctx.fillRect(w - 12, h - 2, 8, 4);
    }

    ctx.restore();
}

function gameOver() {
    gameState.isPlaying = false;
    gameState.isGameOver = true;
    
    // Screen shake effect
    canvas.style.transform = 'translate(5px, 5px)';
    setTimeout(() => canvas.style.transform = 'translate(-5px, -5px)', 50);
    setTimeout(() => canvas.style.transform = 'translate(5px, -5px)', 100);
    setTimeout(() => canvas.style.transform = 'translate(0, 0)', 150);

    finalScoreDisplay.textContent = Math.floor(gameState.distance);
    
    setTimeout(() => {
        gameOverScreen.classList.add('active');
        playerNameInput.focus();
    }, 500);
}

function gameLoop() {
    if (gameState.isPlaying) {
        updatePhysics();
        draw();
        requestAnimationFrame(gameLoop);
    } else if (gameState.isGameOver) {
        // Just draw the final frame
        draw();
    }
}

// API Interactions
async function fetchLeaderboard() {
    leaderboardLoading.style.display = 'block';
    leaderboardList.innerHTML = '';
    
    try {
        const response = await fetch('http://localhost:3000/api/scores');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        leaderboardLoading.style.display = 'none';
        
        if (data.length === 0) {
            leaderboardList.innerHTML = '<li><div class="name" style="text-align:center;">No scores yet!</div></li>';
            return;
        }

        data.forEach((entry, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="name">${escapeHTML(entry.player_name)}</span>
                <span class="score">${entry.score}</span>
            `;
            leaderboardList.appendChild(li);
        });

    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        leaderboardLoading.style.display = 'none';
        leaderboardList.innerHTML = '<li><div class="name" style="color:red; text-align:center;">Failed to load scores.</div></li>';
    }
}

async function submitScore(name, score) {
    try {
        const response = await fetch('http://localhost:3000/api/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ player_name: name, score: score })
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        // Wait briefly for smooth UI transition
        await new Promise(r => setTimeout(r, 500));
    } catch (error) {
        console.error('Error submitting score:', error);
        alert('Failed to submit score. Please try again.');
    }
}

function showLeaderboard() {
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    leaderboardScreen.classList.add('active');
    fetchLeaderboard();
}

// Utility to prevent XSS in leaderboard display
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initial draw (before start)
resizeCanvas();
draw();
