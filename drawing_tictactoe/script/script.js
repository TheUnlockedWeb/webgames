// script/script.js

/**
 * Function to toggle the drawing container in and out of fullscreen mode
 */
function toggleFullscreen() {
    const container = document.getElementById('turtle-container');

    // Check if there is currently an element in fullscreen mode
    if (!document.fullscreenElement) {
        // If not, try to enter fullscreen
        container.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        // If we are already in fullscreen, exit it
        document.exitFullscreen();
    }
}

/**
 * Event Listener setup
 */
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('fullscreen-btn');
    
    if (btn) {
        btn.addEventListener('click', toggleFullscreen);
    }

    // Optional: MutationObserver to hide the loading message 
    // when PyScript injects the canvas
    const container = document.getElementById('turtle-container');
    const observer = new MutationObserver((mutations) => {
        const loadingMsg = document.getElementById('loading-msg');
        if (loadingMsg && container.querySelector('canvas')) {
            loadingMsg.style.display = 'none';
            observer.disconnect(); // Stop watching once loaded
        }
    });

    observer.observe(container, { childList: true });
});
