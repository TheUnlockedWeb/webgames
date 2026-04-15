import turtle
import random

# --- Setup ---
screen = turtle.Screen()
screen.setup(600, 700) # Added extra height for text
screen.title("Tic Tac Toe vs AI")
turtle.speed(0)
turtle.hideturtle()

# --- Game State ---
current_player = "X"
board = [" "] * 9 
game_over = False
centers = {
    0: (-100, 100), 1: (0, 100), 2: (100, 100),
    3: (-100, 0),   4: (0, 0),   5: (100, 0),
    6: (-100, -100),7: (0, -100),8: (100, -100)
}

# --- Settings Pop-ups ---
mode = screen.textinput("Game Mode", "Type 'player' for 1v1 or 'bot' for AI:").lower()
difficulty = 1
if mode == "bot":
    difficulty = screen.numinput("Difficulty", "Choose 1 (Easy) or 2 (Impossible):", minval=1, maxval=2)

# --- Drawing Functions ---

def drawBoard():
    turtle.pencolor("black")
    turtle.pensize(3)
    for x in [-50, 50]:
        turtle.penup(); turtle.goto(x, 150); turtle.pendown(); turtle.goto(x, -150)
    for y in [-50, 50]:
        turtle.penup(); turtle.goto(-150, y); turtle.pendown(); turtle.goto(150, y)
    turtle.penup()

def drawX():
    turtle.pendown(); turtle.pencolor("blue"); turtle.pensize(3)
    turtle.setheading(45); turtle.forward(40); turtle.back(80); turtle.forward(40)
    turtle.setheading(135); turtle.forward(40); turtle.back(80); turtle.forward(40)
    turtle.setheading(0); turtle.penup()

def drawO():
    turtle.penup(); turtle.pencolor("green"); turtle.setheading(0); turtle.forward(35)
    turtle.setheading(90); turtle.pendown(); turtle.pensize(3); turtle.circle(35)
    turtle.penup(); turtle.setheading(0)

# --- AI Logic ---

def botMove():
    global current_player
    if game_over: return
    
    empty_slots = [i for i, s in enumerate(board) if s == " "]
    if not empty_slots: return

    move = -1
    
    # Difficulty 2: Impossible (Tries to block or win)
    if difficulty == 2:
        wins = [(0,1,2), (3,4,5), (6,7,8), (0,3,6), (1,4,7), (2,5,8), (0,4,8), (2,4,6)]
        # 1. Check if bot can win now
        for a, b, c in wins:
            line = [board[a], board[b], board[c]]
            if line.count("O") == 2 and line.count(" ") == 1:
                move = [a, b, c][line.index(" ")]
        # 2. Block player if they are about to win
        if move == -1:
            for a, b, c in wins:
                line = [board[a], board[b], board[c]]
                if line.count("X") == 2 and line.count(" ") == 1:
                    move = [a, b, c][line.index(" ")]

    # Difficulty 1 (Easy) or fallback for Diff 2
    if move == -1:
        move = random.choice(empty_slots)

    # Perform the move
    board[move] = "O"
    turtle.goto(centers[move])
    drawO()
    if checkWin():
        endGame(f"PLAYER {current_player} WINS!")
    elif " " not in board:
        endGame("IT'S A DRAW!")
    else:
        current_player = "X"

# --- Main Logic ---

def checkWin():
    wins = [(0,1,2), (3,4,5), (6,7,8), (0,3,6), (1,4,7), (2,5,8), (0,4,8), (2,4,6)]
    for a, b, c in wins:
        if board[a] == board[b] == board[c] and board[a] != " ":
            turtle.pencolor("red"); turtle.pensize(10); turtle.penup()
            turtle.goto(centers[a]); turtle.pendown(); turtle.goto(centers[c])
            return True
    return False

def endGame(message):
    global game_over
    game_over = True
    turtle.penup(); turtle.goto(0, 200); turtle.pencolor("black")
    turtle.write(message, align="center", font=("Arial", 30, "bold"))

def playerClicked(x, y):
    global current_player, game_over
    if game_over: return

    if -150 < x < 150 and -150 < y < 150:
        col = int((x + 150) // 100); row = int((150 - y) // 100); index = row * 3 + col
        
        if board[index] == " ":
            board[index] = current_player
            turtle.penup(); turtle.goto(centers[index])
            
            if current_player == "X":
                drawX()
            else:
                drawO()

            if checkWin():
                endGame(f"PLAYER {current_player} WINS!")
            elif " " not in board:
                endGame("IT'S A DRAW!")
            else:
                current_player = "O" if current_player == "X" else "X"
                # If mode is bot, trigger bot move immediately
                if mode == "bot" and not game_over:
                    botMove()

# --- Run ---
drawBoard()
screen.onscreenclick(playerClicked)
turtle.done()
