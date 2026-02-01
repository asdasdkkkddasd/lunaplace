document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('score');
    const startButton = document.getElementById('start-button');

    const gridSize = 20;
    let snake = [{ x: 10, y: 10 }];
    let food = {};
    let score = 0;
    let direction = 'right';
    let changingDirection = false;
    let gameRunning = false;
    let gameLoop;

    const main = () => {
        if (!gameRunning) return;

        gameLoop = setTimeout(() => {
            changingDirection = false;
            clearCanvas();
            drawFood();
            moveSnake();
            drawSnake();
            main();
        }, 100);
    };

    const startGame = () => {
        if (gameRunning) return;
        gameRunning = true;
        snake = [{ x: 10, y: 10 }];
        direction = 'right';
        score = 0;
        scoreElement.textContent = score;
        generateFood();
        startButton.textContent = 'Restart Game';
        main();
    };

    const clearCanvas = () => {
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color');
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const drawSnake = () => {
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
        snake.forEach((part, index) => {
            ctx.fillStyle = index === 0 ? '#FFFFFF' : accentColor;
            ctx.strokeStyle = '#000000';
            ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize, gridSize);
            ctx.strokeRect(part.x * gridSize, part.y * gridSize, gridSize, gridSize);
        });
    };

    const moveSnake = () => {
        const head = { x: snake[0].x, y: snake[0].y };

        switch (direction) {
            case 'up': head.y -= 1; break;
            case 'down': head.y += 1; break;
            case 'left': head.x -= 1; break;
            case 'right': head.x += 1; break;
        }

        snake.unshift(head);

        if (checkCollision()) {
            endGame();
            return;
        }

        if (head.x === food.x && head.y === food.y) {
            score += 10;
            scoreElement.textContent = score;
            generateFood();
        } else {
            snake.pop();
        }
    };

    const generateFood = () => {
        food.x = Math.floor(Math.random() * (canvas.width / gridSize));
        food.y = Math.floor(Math.random() * (canvas.height / gridSize));
        // Ensure food doesn't spawn on the snake
        snake.forEach(part => {
            if (part.x === food.x && part.y === food.y) {
                generateFood();
            }
        });
    };

    const drawFood = () => {
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-color');
        ctx.fillStyle = accentColor;
        ctx.strokeStyle = '#000000';
        ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
        ctx.strokeRect(food.x * gridSize, food.y * gridSize, gridSize, gridSize);
    };

    const changeDirection = (event) => {
        if (changingDirection) return;
        changingDirection = true;

        const keyPressed = event.key;
        const goingUp = direction === 'up';
        const goingDown = direction === 'down';
        const goingLeft = direction === 'left';
        const goingRight = direction === 'right';

        if (keyPressed === 'ArrowLeft' && !goingRight) direction = 'left';
        if (keyPressed === 'ArrowUp' && !goingDown) direction = 'up';
        if (keyPressed === 'ArrowRight' && !goingLeft) direction = 'right';
        if (keyPressed === 'ArrowDown' && !goingUp) direction = 'down';
    };
    
    const checkCollision = () => {
        const head = snake[0];
        // Wall collision
        if (head.x < 0 || head.x * gridSize >= canvas.width || head.y < 0 || head.y * gridSize >= canvas.height) {
            return true;
        }
        // Self collision
        for (let i = 4; i < snake.length; i++) {
            if (head.x === snake[i].x && head.y === snake[i].y) {
                return true;
            }
        }
        return false;
    };

    const endGame = () => {
        gameRunning = false;
        clearTimeout(gameLoop);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = "40px 'Orbitron', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.font = "20px 'Orbitron', sans-serif";
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
        
        startButton.textContent = 'Start Game';
    };

    startButton.addEventListener('click', startGame);
    document.addEventListener('keydown', changeDirection);
});
