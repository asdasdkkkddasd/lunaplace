        // --- 1. 기본 설정 및 데이터 ---
        const COLS = 10;
        const ROWS = 20;
        const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        
        const SHAPES = [
            [], // 0: empty
            [[1, 1, 1, 1]], // I (Cyan)
            [[2, 0, 0], [2, 2, 2]], // J (Blue)
            [[0, 0, 3], [3, 3, 3]], // L (Orange)
            [[4, 4], [4, 4]], // O (Yellow)
            [[0, 5, 5], [5, 5, 0]], // S (Green)
            [[0, 6, 0], [6, 6, 6]], // T (Purple)
            [[7, 7, 0], [0, 7, 7]]  // Z (Red)
        ];
        
        const COLORS = ['transparent', 'cyan', 'blue', 'orange', 'yellow', 'green', 'purple', 'red'];

        let currentPiece = null;
        let currentX = 0;
        let currentY = 0;
        let nextPieceType = null;
        let holdPieceType = null;
        let canHold = true;
        let score = 0;
        let lines = 0;
        let level = 1;
        let gameInterval;
        let speed = 1000;

        // DOM elements
        const startButton = document.getElementById('start-button');
        const menu = document.querySelector('.menu');
        const gameContainer = document.querySelector('.game-container');


        // --- 2. 게임 로직 ---

        function init() {
            // Hide menu, show game
            menu.style.display = 'none';
            gameContainer.style.display = 'flex';
            gameContainer.classList.remove('game-over');


            // Reset game state
            for(let r = 0; r < ROWS; r++) {
                for(let c = 0; c < COLS; c++) {
                    board[r][c] = 0;
                }
            }
            score = 0;
            lines = 0;
            level = 1;
            speed = 1000;
            document.getElementById('score').innerText = score;
            document.getElementById('lines').innerText = lines;
            document.getElementById('level').innerText = level;


            nextPieceType = Math.floor(Math.random() * 7) + 1;
            spawnPiece();
            draw();
            gameInterval = setInterval(gameLoop, speed);
            document.addEventListener('keydown', handleInput);
        }

        function spawnPiece() {
            const type = nextPieceType;
            nextPieceType = Math.floor(Math.random() * 7) + 1;
            
            currentPiece = SHAPES[type];
            currentX = Math.floor((COLS - currentPiece[0].length) / 2);
            currentY = 0;
            
            // 패배 조건 확인
            if (collide(currentX, currentY, currentPiece)) {
                alert("Game Over! Score: " + score);
                clearInterval(gameInterval);
                gameContainer.classList.add('game-over');
                menu.style.display = 'flex';
                return; // Stop game loop implicitly
            }
            
            canHold = true;
            drawNext();
        }

        function collide(x, y, piece) {
            for (let r = 0; r < piece.length; r++) {
                for (let c = 0; c < piece[r].length; c++) {
                    if (piece[r][c] !== 0) {
                        let newX = x + c;
                        let newY = y + r;
                        if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY][newX] !== 0)) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        function merge() {
            let colorIndex = 0;
            for(let r=0; r<currentPiece.length; r++) {
                for(let c=0; c<currentPiece[r].length; c++){
                    if(currentPiece[r][c] !== 0) {
                        colorIndex = currentPiece[r][c];
                        break;
                    }
                }
                if(colorIndex !== 0) break;
            }

            for (let r = 0; r < currentPiece.length; r++) {
                for (let c = 0; c < currentPiece[r].length; c++) {
                    if (currentPiece[r][c] !== 0) {
                        board[currentY + r][currentX + c] = colorIndex;
                    }
                }
            }
        }

        function rotate(piece) {
            const newPiece = piece[0].map((_, i) => piece.map(row => row[i]).reverse());
            if (!collide(currentX, currentY, newPiece)) {
                currentPiece = newPiece;
            } else {
                // Wall kick (간단 버전: 좌우로 살짝 밀어보기)
                if (!collide(currentX - 1, currentY, newPiece)) {
                    currentX -= 1;
                    currentPiece = newPiece;
                } else if (!collide(currentX + 1, currentY, newPiece)) {
                    currentX += 1;
                    currentPiece = newPiece;
                }
            }
        }

        function clearLines() {
            let linesCleared = 0;
            for (let r = ROWS - 1; r >= 0; r--) {
                if (board[r].every(cell => cell !== 0)) {
                    board.splice(r, 1);
                    board.unshift(Array(COLS).fill(0));
                    linesCleared++;
                    r++; 
                }
            }
            if (linesCleared > 0) {
                lines += linesCleared;
                score += linesCleared * 100 * linesCleared;
                level = Math.floor(lines / 10) + 1;
                speed = Math.max(100, 1000 - (level - 1) * 100);
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, speed);
                
                document.getElementById('score').innerText = score;
                document.getElementById('lines').innerText = lines;
                document.getElementById('level').innerText = level;
            }
        }

        function gameLoop() {
            if (!collide(currentX, currentY + 1, currentPiece)) {
                currentY++;
            } else {
                merge();
                clearLines();
                spawnPiece();
            }
            draw();
        }

        // 고스트 블록 위치 계산
        function getGhostY() {
            let ghostY = currentY;
            while (!collide(currentX, ghostY + 1, currentPiece)) {
                ghostY++;
            }
            return ghostY;
        }

        function hold() {
            if (!canHold) return;
            
            // 현재 블록의 색상 인덱스 찾기
            let currentColorIdx = 0;
             for(let r=0; r<currentPiece.length; r++) {
                if(currentPiece[r].some(v=>v!==0)) {
                    currentColorIdx = currentPiece[r].find(v=>v!==0);
                    break;
                }
            }

            if (holdPieceType === null) {
                holdPieceType = currentColorIdx; // 현재 조각 타입 저장
                spawnPiece(); // 새 조각
            } else {
                let temp = holdPieceType;
                holdPieceType = currentColorIdx;
                currentPiece = SHAPES[temp]; // 저장된 조각 불러오기
                currentX = Math.floor((COLS - currentPiece[0].length) / 2);
                currentY = 0;
            }
            canHold = false;
            drawHold();
        }


        // --- 3. 렌더링 (그리기) ---

        function draw() {
            const boardDiv = document.getElementById('game-board');
            boardDiv.innerHTML = ''; // 초기화

            // 1. 이미 고정된 블록 그리기
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (board[r][c] !== 0) {
                        const block = document.createElement('div');
                        block.classList.add('block');
                        block.classList.add(COLORS[board[r][c]]);
                        block.style.gridRowStart = r + 1;
                        block.style.gridColumnStart = c + 1;
                        boardDiv.appendChild(block);
                    }
                }
            }

            // 2. 고스트 블록 그리기 (그림자)
            const ghostY = getGhostY();
            for (let r = 0; r < currentPiece.length; r++) {
                for (let c = 0; c < currentPiece[r].length; c++) {
                    if (currentPiece[r][c] !== 0) {
                        const block = document.createElement('div');
                        block.classList.add('block', 'ghost');
                        // 색상은 현재 블록 색을 따라가되 투명하게 할 수도 있지만, 여기선 흰 테두리로 통일
                        block.style.gridRowStart = ghostY + r + 1;
                        block.style.gridColumnStart = currentX + c + 1;
                        boardDiv.appendChild(block);
                    }
                }
            }

            // 3. 현재 떨어지는 블록 그리기
            let colorIndex = 0;
             for(let r=0; r<currentPiece.length; r++) {
                if(currentPiece[r].some(v=>v!==0)) {
                    colorIndex = currentPiece[r].find(v=>v!==0);
                    break;
                }
            }

            for (let r = 0; r < currentPiece.length; r++) {
                for (let c = 0; c < currentPiece[r].length; c++) {
                    if (currentPiece[r][c] !== 0) {
                        const block = document.createElement('div');
                        block.classList.add('block');
                        block.classList.add(COLORS[colorIndex]);
                        block.style.gridRowStart = currentY + r + 1;
                        block.style.gridColumnStart = currentX + c + 1;
                        boardDiv.appendChild(block);
                    }
                }
            }
        }

        function drawNext() {
            const nextDiv = document.getElementById('next-grid');
            nextDiv.innerHTML = '';
            const piece = SHAPES[nextPieceType];
            drawMiniGrid(nextDiv, piece, nextPieceType);
        }

        function drawHold() {
            const holdDiv = document.getElementById('hold-grid');
            holdDiv.innerHTML = '';
            if (holdPieceType) {
                const piece = SHAPES[holdPieceType];
                drawMiniGrid(holdDiv, piece, holdPieceType);
            }
        }

        function drawMiniGrid(element, piece, colorIdx) {
            let offsetX = 0;
            let offsetY = 0;
            if(piece.length === 2) offsetY = 1; // O 블록 중앙 정렬

            for (let r = 0; r < piece.length; r++) {
                for (let c = 0; c < piece[r].length; c++) {
                    if (piece[r][c] !== 0) {
                        const block = document.createElement('div');
                        block.classList.add('block');
                        block.classList.add(COLORS[colorIdx]);
                        block.style.gridRowStart = r + 1 + offsetY;
                        block.style.gridColumnStart = c + 1 + offsetX;
                        element.appendChild(block);
                    }
                }
            }
        }

        function handleInput(e) {
            if (e.key === 'ArrowLeft') {
                if (!collide(currentX - 1, currentY, currentPiece)) {
                    currentX--;
                    draw();
                }
            }
            else if (e.key === 'ArrowRight') {
                if (!collide(currentX + 1, currentY, currentPiece)) {
                    currentX++;
                    draw();
                }
            }
            else if (e.key === 'ArrowDown') {
                if (!collide(currentX, currentY + 1, currentPiece)) {
                    currentY++;
                    draw();
                }
            }
            else if (e.key === 'ArrowUp') {
                rotate(currentPiece);
                draw();
            }
            else if (e.key === ' ') { // Space Drop
                while (!collide(currentX, currentY + 1, currentPiece)) {
                    currentY++;
                }
                clearInterval(gameInterval); // Clear interval to prevent immediate next drop
                gameLoop(); // Force a game loop cycle to merge and spawn next
                gameInterval = setInterval(gameLoop, speed); // Restart interval
            }
            else if (e.key === 'c' || e.key === 'C') {
                hold();
                draw();
            }
        }

        // 게임 시작
        init();

        startButton.addEventListener('click', init);