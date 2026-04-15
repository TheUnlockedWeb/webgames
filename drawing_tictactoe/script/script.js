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

    // --- Ordered Message Logic ---
    const messageContainer = document.getElementById('random-message');
    
    const messages = [
        "EthanUnlocked's Python is improving by going to Coastal Learning Hub! Exactly how he made this game using Python!",
        "Play with a Friend or against AI!",
        "Improve your TicTacToe skills by playing some of these matches!",
        "The main application to code Python is Thonny. Unfortuneately, this is blocked in some schools (especially mine ☹️)",
        "Join EthanUnlocked's Discord by using the links that are across the website!"
    ];

    let messageInterval;
    let currentIndex = 0; // Starts at the first message

    function changeMessage() {
        if (!messageContainer || messages.length === 0) return;

        // 1. Find the old message and make it float away
        const oldMsg = messageContainer.querySelector('.msg-span');
        if (oldMsg) {
            oldMsg.classList.add('msg-exit');
            oldMsg.classList.remove('msg-active');
            // Remove from DOM after transition (800ms matches CSS transition)
            setTimeout(() => oldMsg.remove(), 800);
        }

        // 2. Create the new message span
        const newMsg = document.createElement('span');
        newMsg.className = 'msg-span msg-enter';
        newMsg.textContent = messages[currentIndex];
        
        messageContainer.appendChild(newMsg);

        // 3. Trigger the animation into the active view
        setTimeout(() => {
            newMsg.classList.add('msg-active');
            newMsg.classList.remove('msg-enter');
        }, 50);

        // 4. Update index for next time (Looping back to 0 at the end)
        currentIndex = (currentIndex + 1) % messages.length;
    }

    // Start rotation immediately and repeat every 5 seconds
    changeMessage();
    messageInterval = setInterval(changeMessage, 5000);


    // --- MutationObserver Logic ---
    // Watches for when PyScript injects the canvas so we can hide the loading UI
    const container = document.getElementById('turtle-container');
    const observer = new MutationObserver((mutations) => {
        const loadingMsg = document.getElementById('loading-msg');
        const randomMsgDiv = document.getElementById('random-message');
        const loader = document.getElementById('loader');
        
        // If the canvas element exists, the Python script has loaded
        if (container.querySelector('canvas')) {
            if (loadingMsg) loadingMsg.style.display = 'none';
            if (randomMsgDiv) randomMsgDiv.style.display = 'none';
            if (loader) loader.style.display = 'none';
            
            // Clean up the timer to save browser performance
            clearInterval(messageInterval); 
            observer.disconnect(); // Stop the observer
        }
    });

    observer.observe(container, { childList: true });
});
