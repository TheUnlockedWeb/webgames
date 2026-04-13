# python/main.py
import turtle

# Setup the screen for the browser
screen = turtle.Screen()
screen.setup(600, 600)
turtle.speed(3)

def drawBoard():
    turtle.penup()
    turtle.goto(-150, 50) # Starting position
    turtle.pendown()
    
    # Drawing the grid lines
    for i in range(2):
        turtle.left(90)
        turtle.forward(150)
        turtle.back(100)
        turtle.left(90)
        turtle.forward(200)
        turtle.back(300)
        turtle.forward(200)
        turtle.left(90)
        turtle.forward(50)
        turtle.right(90)
        
    # Completing the outer grid lines
    turtle.right(90)
    turtle.forward(150)
    turtle.left(180)
    turtle.forward(200)
    turtle.left(90)
    turtle.forward(100)
    turtle.right(90)
    turtle.forward(100)

def drawX():
    turtle.pendown()
    turtle.left(45)
    turtle.forward(40)
    turtle.back(80)
    turtle.forward(40)
    turtle.right(90)
    turtle.forward(40)
    turtle.back(80)
    turtle.forward(40)
    turtle.left(45) # Reset heading
    turtle.penup()

def drawO():
    # Move to the edge of where the circle should be
    turtle.penup()
    turtle.right(90)
    turtle.forward(35)
    turtle.left(90)
    
    # Draw the circle
    turtle.pendown()
    turtle.circle(35)
    
    # Return to center position
    turtle.penup()
    turtle.left(90)
    turtle.forward(35)
    turtle.right(90)

# --- Execution Logic ---

# 1. Draw the grid
drawBoard()

# 2. Reset to center to start placing pieces
turtle.penup()
turtle.home()
turtle.setheading(0)

# 3. Draw an 'O' in the left-center square
turtle.goto(-100, 0)
drawO()

# 4. Draw an 'X' in the center square
turtle.goto(0, 0)
drawX()

# 5. Draw another 'O' in the right-center square
turtle.goto(100, 0)
drawO()

# Keep the drawing on the screen
turtle.done()
