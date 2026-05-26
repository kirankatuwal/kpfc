/* ============================================================
   PTE Spelling Practice — app logic
   Depends on WORD_BANK from words.js
   ============================================================ */

// ---------- Helpers ----------
function pickRandomWords(count) {
  const pool = [...WORD_BANK];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function computeRevealMask(word) {
  const letters = word.split("");
  const mask = letters.map(() => false);
  const letterIndices = letters
    .map((c, i) => (/[a-zA-Z]/.test(c) ? i : -1))
    .filter((i) => i >= 0);

  if (letterIndices.length === 0) return mask;
  mask[letterIndices[0]] = true;
  mask[letterIndices[letterIndices.length - 1]] = true;

  const target = Math.max(2, Math.round(letterIndices.length * 0.25));
  const middle = letterIndices.slice(1, -1);
  for (let i = middle.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [middle[i], middle[j]] = [middle[j], middle[i]];
  }
  let revealed = 2;
  for (const idx of middle) {
    if (revealed >= target) break;
    mask[idx] = true;
    revealed++;
  }
  return mask;
}

// ---------- State ----------
let count = 20;
let session = pickRandomWords(20);
let testWords = [];
let masks = [];
let currentIndex = 0;
let answers = [];
let feedback = "idle"; // idle | correct | wrong

// ---------- DOM refs ----------
const learnPhase = document.getElementById("learnPhase");
const testPhase = document.getElementById("testPhase");
const resultsPhase = document.getElementById("resultsPhase");
const wordGrid = document.getElementById("wordGrid");
const countControl = document.getElementById("countControl");
const wordCountSelect = document.getElementById("wordCountSelect");
const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const checkBtn = document.getElementById("checkBtn");
const wordInput = document.getElementById("wordInput");
const wordCounter = document.getElementById("wordCounter");
const progressPct = document.getElementById("progressPct");
const progressBar = document.getElementById("progressBar");
const testMeaning = document.getElementById("testMeaning");
const testExample = document.getElementById("testExample");
const tileRow = document.getElementById("tileRow");
const letterInfo = document.getElementById("letterInfo");
const feedbackBox = document.getElementById("feedbackBox");
const scoreCorrect = document.getElementById("scoreCorrect");
const scoreTotal = document.getElementById("scoreTotal");
const scoreMessage = document.getElementById("scoreMessage");
const reviewList = document.getElementById("reviewList");

// ---------- Render ----------
function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function renderLearn() {
  hide(testPhase);
  hide(resultsPhase);
  show(learnPhase);
  show(countControl);

  wordGrid.innerHTML = "";
  session.forEach((w, i) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        <span class="card-number">${String(i + 1).padStart(2, "0")}</span>
        <span class="card-pos">${w.pos}</span>
      </div>
      <h3 class="card-word">${w.word}</h3>
      <p class="card-meaning">${w.meaning}</p>
      <p class="card-example">E.g. ${w.example}</p>
    `;
    wordGrid.appendChild(card);
  });
}

function renderTiles(word, mask, revealAll) {
  tileRow.innerHTML = "";
  word.split("").forEach((ch, i) => {
    if (!/[a-zA-Z]/.test(ch)) {
      const spacer = document.createElement("div");
      spacer.className = "tile-spacer";
      tileRow.appendChild(spacer);
      return;
    }
    const tile = document.createElement("div");
    tile.className = "letter-tile";
    tile.textContent = (mask[i] || revealAll) ? ch : "";
    tileRow.appendChild(tile);
  });
}

function updateProgress() {
  const total = testWords.length;
  const effective = currentIndex + (feedback !== "idle" ? 1 : 0);
  const pct = Math.round((effective / total) * 100);
  wordCounter.textContent = `Word ${currentIndex + 1} of ${total}`;
  progressPct.textContent = `${pct}%`;
  progressBar.style.width = `${pct}%`;
}

function renderTest() {
  hide(learnPhase);
  hide(resultsPhase);
  show(testPhase);
  hide(countControl);

  const current = testWords[currentIndex];
  const mask = masks[currentIndex];

  testMeaning.textContent = current.meaning;
  testExample.textContent = `E.g. ${current.example}`;
  letterInfo.innerHTML = `${current.word.replace(/[^a-zA-Z]/g, "").length} letters &middot; <span style="font-style: italic;">${current.pos}</span>`;

  renderTiles(current.word, mask, feedback !== "idle");

  wordInput.value = answers[currentIndex] || "";
  wordInput.disabled = feedback !== "idle";
  checkBtn.disabled = feedback !== "idle";

  feedbackBox.innerHTML = "";
  if (feedback === "correct") {
    feedbackBox.innerHTML = `<div class="feedback-msg feedback-correct">&#10003; Correct! Well done!</div>`;
  } else if (feedback === "wrong") {
    feedbackBox.innerHTML = `<div class="feedback-msg feedback-wrong">&#10007; The correct spelling is: <strong>${current.word}</strong></div>`;
  }

  updateProgress();
  setTimeout(() => wordInput.focus(), 0);
}

function renderResults() {
  hide(learnPhase);
  hide(testPhase);
  show(resultsPhase);
  show(countControl);

  const total = testWords.length;
  let correctCount = 0;
  testWords.forEach((w, i) => {
    if (answers[i].trim().toLowerCase() === w.word.toLowerCase()) correctCount++;
  });
  const pct = (correctCount / total) * 100;
  const message = pct >= 80
    ? "Excellent work! You are well prepared."
    : pct >= 60
      ? "Good effort! Keep practising."
      : "Keep going \u2014 practice makes perfect!";

  scoreCorrect.textContent = correctCount;
  scoreTotal.textContent = total;
  scoreMessage.textContent = message;

  reviewList.innerHTML = "";
  testWords.forEach((w, i) => {
    const ans = answers[i] || "";
    const ok = ans.trim().toLowerCase() === w.word.toLowerCase();
    const li = document.createElement("li");
    li.className = "review-item";
    li.innerHTML = `
      <div class="review-left">
        <span class="review-badge ${ok ? 'ok' : 'wrong'}">${ok ? '\u2713' : '\u2717'}</span>
        <span class="review-word">${w.word}</span>
      </div>
      ${!ok ? `<span class="review-answer">You typed: ${ans || "(empty)"}</span>` : ""}
    `;
    reviewList.appendChild(li);
  });
}

// ---------- Actions ----------
function startTest() {
  masks = session.map((w) => computeRevealMask(w.word));
  currentIndex = 0;
  answers = Array(session.length).fill("");
  feedback = "idle";
  testWords = session;
  renderTest();
}

function restart() {
  session = pickRandomWords(count);
  testWords = [];
  masks = [];
  currentIndex = 0;
  answers = [];
  feedback = "idle";
  renderLearn();
}

function submit() {
  if (feedback !== "idle") return;
  const guess = wordInput.value.trim();
  if (!guess) return;

  const current = testWords[currentIndex];
  const correct = guess.toLowerCase() === current.word.toLowerCase();
  answers[currentIndex] = guess;
  feedback = correct ? "correct" : "wrong";
  renderTest();

  setTimeout(() => {
    if (currentIndex + 1 >= testWords.length) {
      renderResults();
    } else {
      currentIndex++;
      feedback = "idle";
      renderTest();
    }
  }, 1800);
}

// ---------- Events ----------
wordCountSelect.addEventListener("change", (e) => {
  count = parseInt(e.target.value, 10);
  session = pickRandomWords(count);
  renderLearn();
});

startBtn.addEventListener("click", startTest);
retryBtn.addEventListener("click", restart);
checkBtn.addEventListener("click", submit);
wordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submit();
});

// ---------- Init ----------
renderLearn();