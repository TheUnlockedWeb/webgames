import turtle

def drawBoard():
  turtle.penup()
  turtle.forward(50)
  turtle.pendown()
  for i in range (2):
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
  turtle.left(45)
  turtle.penup()

def drawO():
  turtle.penup()
  turtle.right(90)
  turtle.forward(35)
  turtle.left(90)
  turtle.forward(35)
  turtle.right(90)

drawBoard()

turtle.penup()
turtle.home()
turtle.setheading(0)

turtle.back(100)
drawO()

turtle.forward(100)
drawX()
