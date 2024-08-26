const socket = new WebSocket("ws://localhost:8080");
let gameState;
let moveHistory = [];

//websocket message for handling responses
socket.onmessage = function (event) {
  try {
    const message = JSON.parse(event.data);
    if (message.type === "STATE" && message.gameState) {
      gameState = message.gameState;
      renderBoard();
      updateTurnIndicator();
    } else {
      console.error("Received unexpected message format:", message);
    }
  } catch (error) {
    console.error("Error parsing WebSocket message:", error);
  }
};

socket.onerror = function (error) {
  console.error("WebSocket error:", error);
};

socket.onclose = function () {
  console.log("WebSocket connection closed.");
  alert("Connection to the game server was lost.");
};

//rendering Board
function renderBoard() {
  // console.log("Rendering board with state:", gameState.board);
  const gameBoard = document.getElementById("gameBoard");
  gameBoard.innerHTML = ""; // Clear previous board

  if (!gameState.board || gameState.board.length !== 5) {
    console.error("Error: Invalid board state", gameState.board);
    return;
  }

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const cell = document.createElement("div");
      cell.className = "grid-item";
      const character = gameState.board[row][col];
      if (character) {
        cell.textContent = character;
        cell.classList.add(character.startsWith("A") ? "player-A" : "player-B");
        if (character.startsWith(gameState.currentPlayer)) {
          cell.onclick = () => handleCellClick(row, col, character);
        }
      }
      gameBoard.appendChild(cell);
    }
  }
}

function updateTurnIndicator() {
  const playerTurn = document.getElementById("playerTurn");

  if (gameState && gameState.currentPlayer) {
    playerTurn.textContent = `Player ${gameState.currentPlayer}'s turn`;
  } else {
    console.error("Error: gameState or currentPlayer is undefined");
  }
}

let previousSelectedCell = null;

//handling functionality after clicking cell
function handleCellClick(row, col, character) {
  const moveOptions = document.getElementById("moveOptions");
  if (!moveOptions) {
    console.error("Error: moveOptions element not found");
    return;
  }

  // Clear any existing move buttons
  moveOptions.innerHTML = ""; // Clear previous buttons

  // Highlight the current cell
  if (previousSelectedCell) {
    previousSelectedCell.classList.remove("selected-cell");
  }

  const gameBoard = document.getElementById("gameBoard");
  const currentCell = gameBoard.children[row * 5 + col];
  currentCell.classList.add("selected-cell");
  previousSelectedCell = currentCell;

  // Filter valid moves for the character
  const validMoves = getValidMovesForCharacter(character);

  // Create move buttons for each valid direction
  validMoves.forEach((direction) => {
    const button = document.createElement("button");
    button.textContent = direction;
    button.onclick = () => handleMoveSelection(character, direction);
    moveOptions.appendChild(button);
  });

  // Display move options container
  moveOptions.style.display = "block";
}

function getValidMovesForCharacter(character) {
  // Define possible moves for different characters
  const moveDirections = {
    P1: ["L", "R", "F", "B"],
    P2: ["L", "R", "F", "B"],
    P3: ["L", "R", "F", "B"],
    H1: ["L", "R", "F", "B"],
    H2: ["FL", "FR", "BL", "BR"],
  };

  // Extract character type (e.g., P1, H1)
  const characterType = character.split("-")[1];

  // Return valid moves for the character type
  return moveDirections[characterType] || [];
}

//handling selection of moves
function handleMoveSelection(character, move) {
  const moveOptions = document.getElementById("moveOptions");
  if (!moveOptions) {
    console.error("Error: moveOptions element not found");
    return;
  }

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(
      JSON.stringify({
        type: "MOVE",
        player: gameState.currentPlayer,
        characterName: character.split("-")[1],
        move,
      })
    );
    moveHistory.push(
      `${gameState.currentPlayer}-${character.split("-")[1]}: ${move}`
    );
    updateMoveHistory();
    updateSelectedMove(character, move);
  } else {
    console.error("Error: WebSocket connection is not open");
  }

  // Hide move options after selection
  moveOptions.style.display = "none";
}

//assign valid characters for valid moves
function getValidMovesForCharacter(character) {
  // Customize this function to return the valid moves for the selected character
  const characterType = character.split("-")[1];
  switch (characterType) {
    case "P1":
    case "P2":
    case "P3":
      return ["L", "R", "F", "B"];
    case "H1":
      return ["L", "R", "F", "B"];
    case "H2":
      return ["FL", "FR", "BL", "BR"];
    default:
      return [];
  }
}

//handling socket messaging for wrong moves
socket.onmessage = function (event) {
  try {
    const message = JSON.parse(event.data);

    if (message.type === "STATE") {
      gameState = message.gameState;
      renderBoard();
      updateTurnIndicator();
    } else if (message.type === "error") {
      // Display an alert for invalid moves
      alert("Ohho! wrong move 😔");
    }
  } catch (error) {
    console.error("Error parsing WebSocket message:", error);
  }
};

//updating moves after selecting
function updateSelectedMove(character, move) {
  const selectedMove = document.getElementById("selectedMove");
  selectedMove.textContent = `Selected: ${character} - ${move}`;
}

//updating and storing move history
function updateMoveHistory() {
  const moveHistoryDiv = document.getElementById("moveHistory");
  moveHistoryDiv.innerHTML = "<h5>Move History</h5>";

  // Create a row to hold the columns
  let row = document.createElement("div");
  row.className = "row";
  moveHistoryDiv.appendChild(row);

  // Create the first column
  let col = document.createElement("div");
  col.className = "col";
  let ol = document.createElement("ol");
  col.appendChild(ol);
  row.appendChild(col);

  moveHistory.forEach((move, index) => {
    if (index > 0 && index % 7 === 0) {
      // If 7 moves are already in the column, start a new column
      col = document.createElement("div");
      col.className = "col";
      ol = document.createElement("ol");
      ol.start = index + 1;
      col.appendChild(ol);
      row.appendChild(col);
    }

    // Add the move to the ordered list
    const li = document.createElement("li");
    li.innerHTML = move.includes("Captured")
      ? `<span style="color:red;">${move}</span>`
      : move;
    ol.appendChild(li);
  });
}
//showing toast mesasaging
function showWinnerToast(winner) {
  const toastBody = document.getElementById("toastBody");
  toastBody.textContent = `🎉 Player ${winner} wins! 🎉`;

  // Get the toast element
  const toastElement = document.getElementById("winnerToast");

  // Initialize the toast using Bootstrap's toast class
  const toast = new bootstrap.Toast(toastElement);

  // Show the toast
  toast.show();
}
