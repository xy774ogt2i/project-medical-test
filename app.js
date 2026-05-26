// app.js

const app = document.getElementById("app");

const startBtn = document.getElementById("startBtn");
const mistakesBtn = document.getElementById("mistakesBtn");
const resetStatsBtn = document.getElementById("resetStatsBtn");

const progressEl = document.getElementById("progress");
const scoreEl = document.getElementById("score");

let questions = [];
let currentQuestionIndex = 0;
let correctAnswers = 0;
let currentQuestions = [];
let mistakes = JSON.parse(localStorage.getItem("mistakes")) || {};

// 🔧 Функция для исправления невалидных экранирований в JSON
function fixInvalidJsonEscapes(text) {
  // Заменяем \' на ' (невалидно в JSON)
  text = text.replace(/\\'/g, "'");
  // Заменяем другие невалидные экранирования: \x → x (кроме допустимых)
  text = text.replace(/\\([^"\\/bfnrtu])/g, '$1');
  return text;
}

// 🔧 Функция для нормализации ключей объекта (убирает пробелы в концах ключей)
function normalizeKeys(obj) {
  if (Array.isArray(obj)) {
    return obj.map(normalizeKeys);
  }
  if (obj && typeof obj === 'object') {
    const normalized = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = key.trim();
      normalized[cleanKey] = normalizeKeys(value);
    }
    return normalized;
  }
  return obj;
}

async function loadQuestions() {
  try {
    const res = await fetch("./questions.json");
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    // Читаем как текст, чтобы предварительно обработать
    let text = await res.text();
    
    // Исправляем невалидные экранирования
    text = fixInvalidJsonEscapes(text);
    
    // Парсим JSON
    let data = JSON.parse(text);
    
    // Нормализуем ключи (убираем пробелы в концах: "id " → "id")
    questions = normalizeKeys(data);
    
    console.log(`Загружено ${questions.length} вопросов`);
    
  } catch (e) {
    console.error("❌ Ошибка загрузки вопросов:", e.message);
    app.innerHTML = `
      <div class="result-screen">
        <h2>⚠️ Ошибка загрузки</h2>
        <p>Не удалось загрузить вопросы.</p>
        <p><small>${e.message}</small></p>
      </div>
    `;
  }
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function startTest(onlyMistakes = false) {
  currentQuestionIndex = 0;
  correctAnswers = 0;

  if (onlyMistakes) {
    currentQuestions = questions.filter(q => mistakes[q.id]);
  } else {
    currentQuestions = shuffle(questions);
  }

  if (currentQuestions.length === 0) {
    app.innerHTML = `
      <div class="result-screen">
        <h2>Ошибок пока нет 🎉</h2>
      </div>
    `;
    return;
  }

  renderQuestion();
}

function renderQuestion() {
  const q = currentQuestions[currentQuestionIndex];

  progressEl.textContent =
    `${currentQuestionIndex + 1} / ${currentQuestions.length}`;

  scoreEl.textContent =
    `Правильно: ${correctAnswers}`;

  app.innerHTML = `
    <div class="question-card">
      <div class="question-title">
        ${q.question}
      </div>

      <div class="answers">
        ${q.options.map((option, index) => `
          <button class="answer-btn" data-index="${index}">
            ${option}
          </button>
        `).join("")}
      </div>
    </div>
  `;

  document.querySelectorAll(".answer-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      handleAnswer(Number(btn.dataset.index));
    });
  });
}

function handleAnswer(selectedIndex) {
  const q = currentQuestions[currentQuestionIndex];
  const buttons = document.querySelectorAll(".answer-btn");

  buttons.forEach(btn => btn.classList.add("disabled"));

  buttons.forEach((btn, index) => {
    if (index === q.correct) {
      btn.classList.add("correct");
    }

    if (index === selectedIndex && index !== q.correct) {
      btn.classList.add("wrong");
    }
  });

  if (selectedIndex === q.correct) {
    correctAnswers++;
  } else {
    mistakes[q.id] = {
      wrongCount: (mistakes[q.id]?.wrongCount || 0) + 1,
      question: q.question
    };

    localStorage.setItem(
      "mistakes",
      JSON.stringify(mistakes)
    );
  }

  setTimeout(() => {
    currentQuestionIndex++;

    if (currentQuestionIndex >= currentQuestions.length) {
      showResults();
    } else {
      renderQuestion();
    }
  }, 1200);
}

function showResults() {
  const percent =
    Math.round((correctAnswers / currentQuestions.length) * 100);

  const wrongQuestions =
    currentQuestions.filter(q => mistakes[q.id]);

  app.innerHTML = `
    <div class="result-screen">
      <h2>Результат</h2>

      <p>Правильных ответов: ${correctAnswers}</p>
      <p>Процент: ${percent}%</p>

      <div class="mistakes-list">
        <h3>Проблемные вопросы:</h3>

        ${
          wrongQuestions.length === 0
            ? "<p>Ошибок нет 🎉</p>"
            : wrongQuestions.map(q => `
              <div class="mistake-item">
                ${q.question}
              </div>
            `).join("")
        }
      </div>
    </div>
  `;
}

resetStatsBtn.addEventListener("click", () => {
  localStorage.removeItem("mistakes");
  mistakes = {};
  alert("Статистика сброшена");
});

startBtn.addEventListener("click", () => {
  startTest(false);
});

mistakesBtn.addEventListener("click", () => {
  startTest(true);
});

loadQuestions();
