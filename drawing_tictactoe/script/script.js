// script/script.js

/**
 * Function to toggle the drawing container in and out of fullscreen mode
 */
function toggleFullscreen() {
    const container = document.getElementById('turtle-container');

    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
}

/**
 * Event Listener setup
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- Fullscreen Button Logic ---
    const btn = document.getElementById('fullscreen-btn');
    if (btn) {
        btn.addEventListener('click', toggleFullscreen);
    }

    // --- Random Message Logic ---
    const messageElement = document.getElementById('random-message');
    
    // Messages for the sequence
    const messages = [
        "EthanUnlocked's Python is improving by going to Coastal Learning Hub! Exactly how he made this game using Python!",
        "Play with a Friend or against AI!",
        "Improve your TicTacToe skills by playing some of these matches!",
        "The main application to code Python is Thonny. Unfortuneately, this is blocked in some schools (especially mine ☹️)",
        "Join EthanUnlocked's Discord by using the links that are across the website!"
    ];

    let messageInterval;

    function changeMessage() {
        if (messageElement && messages.length > 0) {
            const randomIndex = Math.floor(Math.random() * messages.length);
            messageElement.textContent = messages[randomIndex];
        }
    }

    // Start the messages immediately and set the 5-second timer
    changeMessage();
    messageInterval = setInterval(changeMessage, 5000);


    // --- MutationObserver Logic ---
    // This hides the loading elements once PyScript injects the canvas
    const container = document.getElementById('turtle-container');
    const observer = new MutationObserver((mutations) => {
        const loadingMsg = document.getElementById('loading-msg');
        const randomMsgDiv = document.getElementById('random-message');
        
        if (container.querySelector('canvas')) {
            // Hide the main loading message
            if (loadingMsg) loadingMsg.style.display = 'none';
            
            // Hide the random message and stop the timer
            if (randomMsgDiv) randomMsgDiv.style.display = 'none';
            clearInterval(messageInterval); 

            observer.disconnect(); // Stop watching once loaded
        }
    });

    observer.observe(container, { childList: true });
});
