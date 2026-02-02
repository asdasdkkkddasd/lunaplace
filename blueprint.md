# Luna Place Blueprint

## Overview

This is a Tetris-like game running in the browser. The user wants to improve the game over sequence.

## Current State

- The game is functional.
- When the game is over, an alert pops up, and the user is returned to the main menu.

## Planned Changes

1.  **Enhance Game Over Screen:**
    -   Instead of an alert, a "GAME OVER" message will be displayed over the game board.
    -   The game board will be covered by a semi-transparent gray overlay.
    -   The game will freeze, but remain visible under the overlay.

2.  **Implement Changes:**
    -   **`style.css`**: Add styles for the overlay and "GAME OVER" text.
    -   **`index.html`**: Add the "GAME OVER" text element.
    -   **`main.js`**: Modify the `spawnPiece` function to show the overlay and text instead of an alert.
