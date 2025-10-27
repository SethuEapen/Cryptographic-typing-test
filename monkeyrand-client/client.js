const sidEl = document.getElementById("sid");
const valEl = document.getElementById("val");

// socket config
const socket = io("http://localhost:3000", { transports: ["websocket"] });

socket.on("connect", () => {
    // You'll get a temporary client-side id immediately
    sidEl.textContent = socket.id || "(pending)";
});

socket.on("server:assigned-id", ({ socketId }) => {
    // Authoritative id from server (same as socket.id, but explicit)
    sidEl.textContent = socketId;
});

// Answer RPCs from the server
socket.on("rpc:request", ({ requestId, event, payload }) => {
    if (event === "getData") {
    const value = valEl.value;
    socket.emit("rpc:response", { requestId, payload: { value } });
    } else {
    socket.emit("rpc:response", { requestId, error: `unknown event ${event}` });
    }
});

// typing test 

async function fillWordsDiv() {
    const res = await fetch("https://random-word-api.herokuapp.com/word?number=51");
    const words = await res.json();
    console.log(words);
    const wordsDiv = document.getElementById("words");

    for (let i = 0; i < 50; i++) {
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
    let wordIndex = 0;
    let letterIndex = 0;
    let words = document.querySelectorAll(".word");
    let letters = words[wordIndex].querySelectorAll(".letter")
    let lastIncorrect = false;
    // Highlight first letter
    letters[letterIndex].dataset.state = "active";


    document.addEventListener("keydown", (event) => {
        const key = event.key;

        // Ignore special keys like Shift, Ctrl, etc.
        if (key.length > 1 && key !== "Backspace") return;

        if (key === "Backspace") {
            console.log("Backspace pressed");
            if (letterIndex > 0) {
                if (letters[letterIndex - 1].classList.contains("additionalFailed")) {
                    words[wordIndex].removeChild(letters[letterIndex - 1])
                    letters = words[wordIndex].querySelectorAll(".letter")
                } else {
                    letters[letterIndex].dataset.state = "pending";
                    
                }
                letterIndex --;
                letters[letterIndex].dataset.state = "active";
            } else if (lastIncorrect) { //go to end of last word
                console.log("lastwasincorrect")
                letters[letterIndex].dataset.state = "pending";
                lastIncorrect = false;
                wordIndex --;
                letters = words[wordIndex].querySelectorAll(".letter")
                letterIndex = letters.length - 1
                letters[letterIndex].dataset.state = "active";
            }
        }
        else if (key === " ") {
            const current = letters[letterIndex];
            const expected = current.textContent;

            if (key === expected) {
                current.dataset.state = "correct";
            } else {
                current.dataset.state = "incorrect";
                current.classList.add("skipped")
            }
            lastIncorrect = false
            //check if word is correct
            for (let letter of letters) {
                if (letter.dataset.state != "correct") {
                    lastIncorrect = true
                    if (letter.dataset.state === "pending") {
                        letter.classList.add("skipped")
                    }
                    letter.dataset.state = "incorrect"
                }
            }
            console.log(letters)
            wordIndex++
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
            } else {
                const additionalFailed = document.createElement("span");
                additionalFailed.classList.add("letter", "additionalFailed")
                additionalFailed.dataset.state = "incorrect"
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