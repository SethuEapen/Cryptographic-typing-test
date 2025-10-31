
const sidEl = document.getElementById("sid");

// Global timer values accessible to other scopes (RPC handler)
let timerSeconds = 0; // elapsed seconds
let timerFormatted = "0:00"; // display string M:SS
// Global current word index (1-based for display)
let wordIndex = 0;

TOTALWORDS = 50

// typing test 
async function fillWordsDiv() {
    const res = await fetch("https://random-word-api.herokuapp.com/word?number=51");
    const words = await res.json();
    console.log(words);
    const wordsDiv = document.getElementById("words");

    for (let i = 0; i < TOTALWORDS; i++) {
        const newWord = document.createElement("div");
        newWord.id = i;
        newWord.classList.add("word")
        const currword = words[i]
        for (let j = 0; j < currword.length; j++) {
            const currletter = currword[j]
            const newLetter = document.createElement("span");
            newLetter.id = j;
            newLetter.classList.add("letter")
            newLetter.dataset.state = "pending"
            newLetter.textContent = currletter
            newWord.appendChild(newLetter)
        }
        const space = document.createElement("span");
        space.id = "space";
        space.classList.add("letter", "space")
        space.dataset.state = "pending"
        space.textContent = " "
        newWord.appendChild(space)
        wordsDiv.appendChild(newWord)

    }
}

async function runTest() {
    // set up word counting
    wordIndex = 0;
    let letterIndex = 0;
    let words = document.querySelectorAll(".word");
    let letters = words[wordIndex].querySelectorAll(".letter")
    let lastIncorrect = false;
    let timerStarted = false;
    let startTime;
    let timerInterval;
    
    // Create timer display element
    const timerDisplay = document.createElement("div");
    timerDisplay.id = "timer";
    timerDisplay.style.fontSize = "24px";
    timerDisplay.style.marginBottom = "20px";
    timerDisplay.textContent = "0:00";
    document.getElementById("words").insertAdjacentElement("beforebegin", timerDisplay);
    // Create progress display element (shows current word index / total)
    const progressDisplay = document.createElement("div");
    progressDisplay.id = "progress";
    progressDisplay.style.fontSize = "16px";
    progressDisplay.style.marginBottom = "12px";
    // initialize as 1/TOTALWORDS because wordIndex starts at 0
    progressDisplay.textContent = `${wordIndex}/${TOTALWORDS}`;
    // place it just after the timer so they appear together
    timerDisplay.insertAdjacentElement("afterend", progressDisplay);
    
    // Function to update timer
    function updateTimer() {
        const currentTime = Date.now();
        const elapsedTime = Math.floor((currentTime - startTime) / 1000); // Convert to seconds
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;
        // update display and global variables
        timerSeconds = elapsedTime;
        timerFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        timerDisplay.textContent = timerFormatted;
    }
    
    // Highlight first letter
    letters[letterIndex].dataset.state = "active";


    document.addEventListener("keydown", (event) => {
        const key = event.key;

        // Ignore special keys like Shift, Ctrl, etc.
        if (key.length > 1 && key !== "Backspace") return;
        
        // Start timer on first keypress
        if (!timerStarted && key.length === 1) {
            timerStarted = true;
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 1000);
        }

        if (key === "Backspace") {
            console.log("Backspace pressed");
            if (letterIndex > 0) {
                if (letters[letterIndex - 1].dataset.state === "additionalFailed") {
                    words[wordIndex].removeChild(letters[letterIndex - 1])
                    letters = words[wordIndex].querySelectorAll(".letter")
                } else {
                    letters[letterIndex].dataset.state = "pending";
                    
                }
                letterIndex --;
                letters[letterIndex].dataset.state = "active";
            } else if (lastIncorrect) { //go to end of last word
                letters[letterIndex].dataset.state = "pending";
                lastIncorrect = false;
                wordIndex --;
                if (typeof progressDisplay !== 'undefined') {
                    progressDisplay.textContent = `${wordIndex + 1}/${TOTALWORDS}`;
                }
                letters = words[wordIndex].querySelectorAll(".letter")
                
                //find letter index
                letterIndex = letters.length - 1
                let found = false
                for (let i = 0; i < letters.length; i++) {
                    if (!found) {
                        if (letters[i].dataset.state === "skipped") {
                            letterIndex = i
                            found = true
                        }
                    } else {
                        letters[i].dataset.state = "pending"
                    }
                }
                
                letters[letterIndex].dataset.state = "active";
            }
        }
        else if (key === " ") {
            const current = letters[letterIndex];
            const expected = current.textContent;

            if (key === expected) {
                current.dataset.state = "correct";
            } else {
                current.dataset.state = "skipped";
            }
            lastIncorrect = false
            //check if word is correct
            for (let letter of letters) {
                if (letter.dataset.state != "correct") {
                    lastIncorrect = true
                    if (letter.dataset.state === "pending") {
                        letter.dataset.state = "skipped"
                    }
                }
            }
            if (lastIncorrect) {
                words[wordIndex].dataset.state = "incorrect"
            } else {
                words[wordIndex].dataset.state = "correct"
            }

            wordIndex++
            if (wordIndex >= TOTALWORDS) {
                clearInterval(timerInterval);
                alert("Test finished!");
                return;
            }
            // update progress display (human-friendly: 1-based)
            if (typeof progressDisplay !== 'undefined') {
                progressDisplay.textContent = `${wordIndex}/${TOTALWORDS}`;
            }
            letters = words[wordIndex].querySelectorAll(".letter")
            letterIndex = 0
            letters[letterIndex].dataset.state = "active";
        }
        else {
            console.log("Letter typed:", key);
            if (letterIndex < letters.length - 1) {// the last one is the space which we need to escpae using the space key logic
                const current = letters[letterIndex];
                const expected = current.textContent;

                if (key === expected) {
                    current.dataset.state = "correct";
                } else {
                    current.dataset.state = "incorrect";
                }

                letterIndex++;
                letters[letterIndex].dataset.state = "active";
                
                // Check if we're at the end of the last word
                if (wordIndex === TOTALWORDS - 1 && letterIndex === letters.length - 1) {
                    clearInterval(timerInterval);
                    alert("Test finished!");
                }
            } else {
                const additionalFailed = document.createElement("span");
                additionalFailed.classList.add("letter")
                additionalFailed.dataset.state = "additionalFailed"
                additionalFailed.textContent = key
                words[wordIndex].insertBefore(additionalFailed, letters[letterIndex])
                letterIndex++
                letters = words[wordIndex].querySelectorAll(".letter")
            }
        }
    });
}

async function startTest() {
    await fillWordsDiv();
    await runTest();
}
startTest();


// socket config
const socket = io("http://localhost:3000", { transports: ["websocket"] });

socket.on("connect", () => {
    sidEl.textContent = socket.id || "(pending)";
});

socket.on("server:assigned-id", ({ socketId }) => {
    sidEl.textContent = socketId;
});

// Answer RPCs from the server
socket.on("rpc:request", ({ requestId, event, payload }) => {
    if (event === "getData") {
        const timeStr = (typeof timerFormatted !== 'undefined' && timerFormatted) ? timerFormatted : "0:00";
        const idx = (typeof wordIndex !== 'undefined' && wordIndex) ? wordIndex : 0;
        const value = `${timeStr} | ${idx}/${TOTALWORDS}`;
        socket.emit("rpc:response", { requestId, payload: { value } });
    } else {
        socket.emit("rpc:response", { requestId, error: `unknown event ${event}` });
    }
});