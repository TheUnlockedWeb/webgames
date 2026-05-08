/*-------------------------------- Constants --------------------------------*/

const allCategories = [
    "Fire", "Water", "Poison", "Flying",
    "Electric", "Grass", "Bug", "Ground",
    "Psychic", "Steel", "Fairy",
    "Monotype", "Legendary or Mythical",
    "Can Learn Tackle", "Can Mega Evolve",
    "First Stage Evolution", "Second Stage Evolution", "Third Stage Evolution"
];

let board;

let win;

let attempts;

let points;


/*---------------------------- Variables (state) ----------------------------*/

const maxAttempts = 9;

/*------------------------ Cached Element References ------------------------*/
const squareEls = document.querySelectorAll('.cell')

const giveUpEl = document.querySelector('#give-up')

const easyButton = document.querySelector('#easy')
const mediumButton = document.querySelector('#medium')
const hardButton = document.querySelector('#hard')
const expertButton = document.querySelector('#expert')
const randomButton = document.querySelector('#random')


const row1 = document.getElementById('row-1')
const row2 = document.getElementById('row-2')
const row3 = document.getElementById('row-3')

const col1 = document.getElementById('col-1')
const col2 = document.getElementById('col-2')
const col3 = document.getElementById('col-3')

function randomizer(category) {
    const randomNumber = Math.floor(Math.random()*allCategories.length)
    const catName = allCategories[randomNumber]
    category.innerText=catName
    allCategories.splice(randomNumber,1)
}

/*-------------------------------- Functions --------------------------------*/

function initRandom() {

    alert("Warning! Random is experimental. You could end up with a typing that does not exist, such as Ice/Normal. Proceed at your own risk!")

    board = ['', '', '', '', '', '', '', '', ''];
    win = false;
    attempts = 0;
    points = 0;
    
    randomizer(row1)
    randomizer(row2)
    randomizer(row3)
    randomizer(col1)
    randomizer(col2)
    randomizer(col3)

    squareEls.forEach(cell => cell.textContent = '')
    ppCount()
    pointCount()
    render()
}

function initEasy() {

    board = ['', '', '', '', '', '', '', '', ''];
    win = false;
    attempts = 0;
    points = 0;
    
    row1.innerText = "Grass";
    row2.innerText = "Water";
    row3.innerText = "Fire";
    col1.innerText = "First Stage Evolution";
    col2.innerText = "Second Stage Evolution";
    col3.innerText = "Third Stage Evolution";

    const rowLabels = [row1.innerText, row2.innerText, row3.innerText];
    const colLabels = [col1.innerText, col2.innerText, col3.innerText];
  
    squareEls.forEach((cell, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      cell.textContent = '';
      cell.dataset.row = rowLabels[row];
      cell.dataset.col = colLabels[col];
    });

    ppCount()
    pointCount()
    render()
}

function initMedium() {

    board = ['', '', '', '', '', '', '', '', ''];
    win = false;
    attempts = 0;
    points = 0;
    
    row1.innerText = "Legendary or Mythical";
    row2.innerText = "Can Learn Tackle";
    row3.innerText = "Evolves by Level Up";
    col1.innerText = "Psychic";
    col2.innerText = "Fire";
    col3.innerText = "Electric";

    const rowLabels = [row1.innerText, row2.innerText, row3.innerText];
    const colLabels = [col1.innerText, col2.innerText, col3.innerText];
  
    squareEls.forEach((cell, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      cell.textContent = '';
      cell.dataset.row = rowLabels[row];
      cell.dataset.col = colLabels[col];
    });

    ppCount()
    pointCount()
    render()
}

function initHard() {

    board = ['', '', '', '', '', '', '', '', ''];
    win = false;
    attempts = 0;
    points = 0;
    
    row1.innerText = "Evolves by Item";
    row2.innerText = "Can Mega Evolve";
    row3.innerText = "Electric";
    col1.innerText = "Steel";
    col2.innerText = "Water";
    col3.innerText = "Monotype";

    const rowLabels = [row1.innerText, row2.innerText, row3.innerText];
    const colLabels = [col1.innerText, col2.innerText, col3.innerText];
  
    squareEls.forEach((cell, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      cell.textContent = '';
      cell.dataset.row = rowLabels[row];
      cell.dataset.col = colLabels[col];
    });

    ppCount()
    pointCount()
    render()
}

function initExpert() {

    board = ['', '', '', '', '', '', '', '', ''];
    win = false;
    attempts = 0;
    points = 0;
    
    row1.innerText = "Fairy";
    row2.innerText = "Dark";
    row3.innerText = "Rock";
    col1.innerText = "Third Stage Evolution";
    col2.innerText = "Can Mega Evolve";
    col3.innerText = "Flying";

    const rowLabels = [row1.innerText, row2.innerText, row3.innerText];
    const colLabels = [col1.innerText, col2.innerText, col3.innerText];
  
    squareEls.forEach((cell, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      cell.textContent = '';
      cell.dataset.row = rowLabels[row];
      cell.dataset.col = colLabels[col];
    });

    ppCount()
    pointCount()
    render()
}

function giveUp() {
    alert('Oh no! Player whited out! Return back to Pokemon Center');
    board = ['', '', '', '', '', '', '', '', ''];
    squareEls.forEach(cell => cell.textContent = '');

    win = false;
    attempts = 0;
    points = 0;
    ppCount()
    pointCount()
    render()
}

function render() {
    console.log("This is the board:", board)
}

function handleClick(index, cell) {
    if (board[index] || attempts >= maxAttempts) return;

    const guess = prompt(`Enter a valid Pokemon`)
    if (guess) {

        const pokemon = pokemonList.find(p => p.name.toLowerCase() === guess.toLowerCase())
        const col = cell.dataset.col
        const row = cell.dataset.row

        if (board.includes(guess)) {
            alert(`${guess} is already in play! Please try another Pokemon`);
            return
        }


        let isCorrect = true;
    
        if (
            row === "Normal" && !pokemon.typing.includes("Normal") ||
            row === "Flying" && !pokemon.typing.includes("Flying") ||
            row === "Fire" && !pokemon.typing.includes("Fire") ||
            row === "Water" && !pokemon.typing.includes("Water") ||
            row === "Electric" && !pokemon.typing.includes("Electric") ||
            row === "Grass" && !pokemon.typing.includes("Grass") ||
            row === "Ice" && !pokemon.typing.includes("Ice") ||
            row === "Fighting" && !pokemon.typing.includes("Fighting") ||
            row === "Poison" && !pokemon.typing.includes("Poison") ||
            row === "Ground" && !pokemon.typing.includes("Ground") ||
            row === "Psychic" && !pokemon.typing.includes("Psychic") ||
            row === "Bug" && !pokemon.typing.includes("Bug") ||
            row === "Rock" && !pokemon.typing.includes("Rock") ||
            row === "Ghost" && !pokemon.typing.includes("Ghost") ||
            row === "Dragon" && !pokemon.typing.includes("Dragon") ||
            row === "Dark" && !pokemon.typing.includes("Dark") ||
            row === "Steel" && !pokemon.typing.includes("Steel") ||
            row === "Fairy" && !pokemon.typing.includes("Fairy") ||
            row === "Monotype" && !pokemon.isMonotype ||
            row === "First Stage Evolution" && !pokemon.isFirstStage ||
            row === "Second Stage Evolution" && !pokemon.isSecondStage ||
            row === "Third Stage Evolution" && !pokemon.isThirdStage ||
            row === "Legendary or Mythical" && !pokemon.isLegendaryOrMythical ||
            row === "Evolves with Item" && !pokemon.evolvesWithItem ||
            row === "Evolves by Level Up" && !pokemon.evolvesByLevelUp ||
            row === "Can Mega Evolve" && !pokemon.canMegaEvolve ||
            row === "Can Learn Tackle" && !pokemon.canLearnTackle
        ) {
            isCorrect = false
        }

        if (
            col === "Normal" && !pokemon.typing.includes("Normal") ||
            col === "Flying" && !pokemon.typing.includes("Flying") ||
            col === "Fire" && !pokemon.typing.includes("Fire") ||
            col === "Water" && !pokemon.typing.includes("Water") ||
            col === "Electric" && !pokemon.typing.includes("Electric") ||
            col === "Ice" && !pokemon.typing.includes("Ice") ||
            col === "Grass" && !pokemon.typing.includes("Grass") ||
            col === "Fighting" && !pokemon.typing.includes("Fighting") ||
            col === "Poison" && !pokemon.typing.includes("Poison") ||
            col === "Ground" && !pokemon.typing.includes("Ground") ||
            col === "Psychic" && !pokemon.typing.includes("Psychic") ||
            col === "Bug" && !pokemon.typing.includes("Bug") ||
            col === "Rock" && !pokemon.typing.includes("Rock") ||
            col === "Ghost" && !pokemon.typing.includes("Ghost") ||
            col === "Dragon" && !pokemon.typing.includes("Dragon") ||
            col === "Dark" && !pokemon.typing.includes("Dark") ||
            col === "Steel" && !pokemon.typing.includes("Steel") ||
            col === "Fairy" && !pokemon.typing.includes("Fairy") ||
            col === "Monotype" && !pokemon.isMonotype ||
            col === "First Stage Evolution" && !pokemon.isFirstStage ||
            col === "Second Stage Evolution" && !pokemon.isSecondStage ||
            col === "Third Stage Evolution" && !pokemon.isThirdStage ||
            col === "Legendary or Mythical" && !pokemon.isLegendaryOrMythical ||
            col === "Evolves with Item" && !pokemon.evolvesWithItem ||
            col === "Evolves by Level Up" && !pokemon.evolvesByLevelUp ||
            col === "Can Mega Evolve" && !pokemon.canMegaEvolve ||
            col === "Can Learn Tackle" && !pokemon.canLearnTackle
        ) {
            isCorrect = false
        }

        if (isCorrect) {
            cell.textContent = guess;
            board[index] = guess;
            attempts++;
            points++;
            
            pointCount();
            ppCount();
            render();
        } else{
            alert("Incorrect! Please try again");
            attempts++;

            ppCount();
        }

        console.log(isCorrect)

        if (attempts === maxAttempts) {
            endGame()
        }
    }

}

function ppCount() {
    const ppCounter = document.querySelector('.pp');
    ppCounter.textContent = `PP: ${maxAttempts-attempts}/9`
}

function pointCount() {
    const pointCounter = document.querySelector('.point-counter')
    pointCounter.textContent = `Points: ${points}/9`
}

function endGame() {

    if (points === 9) {
        alert("Congrats, you won!")
    } else {
    alert("You ran out of PP! Game over.")
}
}

/*----------------------------- Event Listeners -----------------------------*/

squareEls.forEach((cell, index) => {
    cell.addEventListener('click', () => handleClick(index, cell));
});

easyButton.addEventListener('click', initEasy);
mediumButton.addEventListener('click', initMedium);
hardButton.addEventListener('click', initHard);
expertButton.addEventListener('click', initExpert);
randomButton.addEventListener('click', initRandom)

giveUpEl.addEventListener('click', giveUp);
