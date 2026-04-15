// script/script.js

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

document.addEventListener('DOMContentLoaded', () => {
    // --- Fullscreen Button Logic ---
    const btn = document.getElementById('fullscreen-btn');
    if (btn) {
        btn.addEventListener('click', toggleFullscreen);
    }

    // --- Random Message Logic ---
    const messageContainer = document.getElementById('random-message');
    
    const messages = [
        "EthanUnlocked's Python is improving by going to Coastal Learning Hub! Exactly how he made this game using Python!",
        "Play with a Friend or against AI!",
        "Improve your TicTacToe skills by playing some of these matches!",
        "The main application to code Python is Thonny. Unfortuneately, this is blocked in some schools (especially mine ☹️)",
        "Join EthanUnlocked's Discord by using the links that are across the website!"
    ];

    let messageInterval;

    function changeMessage() {
        if (!messageContainer || messages.length === 0) return;

        // 1. Find the old message and make it float away
        const oldMsg = messageContainer.querySelector('.msg-span');
        if (oldMsg) {
            oldMsg.classList.replace('msg-active', 'msg-exit');
            // Remove it from the DOM after the animation finishes
            setTimeout(() => oldMsg.remove(), 800);
        }

        // 2. Create the new message span
        const newMsg = document.createElement('span');
        newMsg.className = 'msg-span msg-enter';
        newMsg.textContent = messages[Math.floor(Math.random() * messages.length)];
        
        messageContainer.appendChild(newMsg);

        // 3. Trigger the animation (using a tiny timeout to ensure the browser registers the change)
        setTimeout(() => {
            newMsg.classList.replace('msg-enter', 'msg-active');
        }, 50);
    }

    // Start immediately and set the interval
    changeMessage();
    messageInterval = setInterval(changeMessage, 5000);


    // --- MutationObserver Logic ---
    const container = document.getElementById('turtle-container');
    const observer = new MutationObserver((mutations) => {
        const loadingMsg = document.getElementById('loading-msg');
        const randomMsgDiv = document.getElementById('random-message');
        
        if (container.querySelector('canvas')) {
            if (loadingMsg) loadingMsg.style.display = 'none';
            if (randomMsgDiv) randomMsgDiv.style.display = 'none';
            clearInterval(messageInterval); 
            observer.disconnect();
        }
    });

    observer.observe(container, { childList: true });
});
