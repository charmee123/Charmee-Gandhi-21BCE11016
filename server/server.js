import { WebSocketServer } from "ws";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name for serving static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up Express app
const app = express();
app.use(express.static(path.join(__dirname, "../client")));

// Serve the index.html file at the root URL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Create HTTP server
const server = http.createServer(app);

// Set up WebSocket server
const wss = new WebSocketServer({ server });

let players = [];
let gameState = initializeGameState();

//initializing game state

function initializeGameState() {
  return {
    board: [
      ["A-P1", "A-P2", "A-H1", "A-H2", "A-P3"],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      ["B-P1", "B-P2", "B-H1", "B-H2", "B-P3"],
    ],
    currentPlayer: "A",
  };
}

function broadcastGameState() {
  const stateMessage = JSON.stringify({ type: "STATE", gameState });
  players.forEach((player) => player.send(stateMessage));
}

function handleMove(player, message) {
  try {
    console.log("Message received:", message);

    if (Buffer.isBuffer(message)) {
      message = message.toString();
    }

    if (typeof message !== "string") {
      player.send(
        JSON.stringify({ type: "error", message: "Invalid message type." })
      );
      return;
    }

    const { player: currentPlayer, characterName, move } = JSON.parse(message);

    // Find the character's current position on the board
    let charPos = null;
    for (let row = 0; row < gameState.board.length; row++) {
      const col = gameState.board[row].indexOf(
        `${currentPlayer}-${characterName}`
      );
      if (col !== -1) {
        charPos = { row, col };
        break;
      }
    }

    if (!charPos) {
      player.send(
        JSON.stringify({
          type: "error",
          message: "Character not found on board.",
        })
      );
      return;
    }

    // Determine the movement of boxes based on character type and direction
    let newPos;
    switch (characterName) {
      case "P1":
      case "P2":
      case "P3":
        newPos = movePawn(charPos, move);
        break;
      case "H1":
        newPos = moveHero1(charPos, move);
        break;
      case "H2":
        newPos = moveHero2(charPos, move);
        break;
      default:
        player.send(
          JSON.stringify({ type: "error", message: "Invalid character type." })
        );
        return;
    }

    // Validation of the new position
    if (!isValidMove(newPos)) {
      player.send(
        JSON.stringify({ type: "error", message: "Move out of bounds." })
      );
      return;
    }

    // Handling combat and move the character
    const target = gameState.board[newPos.row][newPos.col];
    if (target && target.startsWith(gameState.currentPlayer)) {
      player.send(
        JSON.stringify({
          type: "error",
          message: "Cannot move to a position occupied by your own character.",
        })
      );
      return;
    }

    // Appling the move
    gameState.board[charPos.row][charPos.col] = null; // Clear old position
    gameState.board[newPos.row][
      newPos.col
    ] = `${currentPlayer}-${characterName}`; // Move to new position

    // Check if any opponent character is captured
    if (target) {
      console.log(`Character ${target} was captured!`);
    }

    // Switch to the other player
    gameState.currentPlayer = gameState.currentPlayer === "A" ? "B" : "A";

    // Broadcast the updated game state to all clients
    broadcastGameState();
  } catch (error) {
    console.error("Error handling move:", error);
    player.send(
      JSON.stringify({
        type: "error",
        message: "An error occurred while processing the move.",
      })
    );
  }
}

// Movement functions as directed
function movePawn(pos, direction) {
  switch (direction) {
    case "L":
      return { row: pos.row, col: pos.col - 1 };
    case "R":
      return { row: pos.row, col: pos.col + 1 };
    case "F":
      return { row: pos.row - 1, col: pos.col };
    case "B":
      return { row: pos.row + 1, col: pos.col };
    default:
      return pos;
  }
}

function moveHero1(pos, direction) {
  switch (direction) {
    case "L":
      return { row: pos.row, col: pos.col - 2 };
    case "R":
      return { row: pos.row, col: pos.col + 2 };
    case "F":
      return { row: pos.row - 2, col: pos.col };
    case "B":
      return { row: pos.row + 2, col: pos.col };
    default:
      return pos;
  }
}

function moveHero2(pos, direction) {
  switch (direction) {
    case "FL":
      return { row: pos.row - 2, col: pos.col - 2 };
    case "FR":
      return { row: pos.row - 2, col: pos.col + 2 };
    case "BL":
      return { row: pos.row + 2, col: pos.col - 2 };
    case "BR":
      return { row: pos.row + 2, col: pos.col + 2 };
    default:
      return pos;
  }
}

function isValidMove(pos) {
  return pos.row >= 0 && pos.row < 5 && pos.col >= 0 && pos.col < 5;
}

wss.on("connection", (ws) => {
  if (players.length < 2) {
    players.push(ws);
    ws.send(JSON.stringify({ type: "STATE", gameState }));
  } else {
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Game is full. Only two players allowed.",
      })
    );
    ws.close();
  }

  ws.on("message", (message) => {
    handleMove(ws, message);
  });

  ws.on("close", () => {
    players = players.filter((player) => player !== ws);
    if (players.length === 0) {
      gameState = initializeGameState(); // Reset game if all players disconnect
    }
  });
});

//server running on localhost
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
