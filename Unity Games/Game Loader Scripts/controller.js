// Configuration pointing to the exact Unity build files
var config = {
  dataUrl: "Game Loader Scripts/obstacle-dodge.data",
  frameworkUrl: "Game Loader Scripts/obstacle-dodge.framework.js",
  codeUrl: "Game Loader Scripts/obstacle-dodge.wasm",
  streamingAssetsUrl: "StreamingAssets",
  companyName: "DefaultCompany",
  productName: "Obstacle Dodge",
  productVersion: "1.0",
};

// Target the HTML canvas tag
const canvas = document.querySelector("#unity-canvas");

// Execute the 'createUnityInstance' method provided by obstacle-dodge.loader.js
createUnityInstance(canvas, config, (progress) => {
  console.log("Loading progress: " + Math.round(100 * progress) + "%");
}).then((unityInstance) => {
  console.log("Unity Game Loaded successfully!");
  
  // Optional: Expose the instance globally if you need to send web data into Unity later
  window.myGameInstance = unityInstance; 
}).catch((error) => {
  console.error("Error booting Unity instance:", error);
});
