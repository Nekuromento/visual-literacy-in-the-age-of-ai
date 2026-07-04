const data = window.SURVEY_DATA;

const state = {
  stage: "intro",
  questionIndex: 0,
  answers: {
    test1: Array(data.tests[0].questions.length).fill(null),
    test2: Array(data.tests[1].questions.length).fill(null),
  },
  visualAnswers: {},
};

const stages = [
  ["intro", "Intro"],
  ["test1", "T1"],
  ["score1", "Score"],
  ["training", "Train"],
  ["test2", "T2"],
  ["final", "Final"],
];

const app = document.querySelector("#app");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setStage(stage) {
  state.stage = stage;
  state.questionIndex = 0;
  window.scrollTo({ top: 0, behavior: "smooth" });
  render();
}

function resetTest(testId) {
  const test = data.tests.find((item) => item.id === testId);
  state.answers[testId] = Array(test.questions.length).fill(null);
}

function resetAll() {
  resetTest("test1");
  resetTest("test2");
  state.visualAnswers = {};
}

function stageIndex(stage = state.stage) {
  return stages.findIndex(([key]) => key === stage);
}

function topbar() {
  const current = stageIndex();
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div>
          <p class="brand-title">${escapeHtml(data.title)}</p>
          <p class="brand-subtitle">${escapeHtml(data.subtitle)}</p>
        </div>
        <nav class="stage-tabs" aria-label="Survey sections">
          ${stages
            .map(([key, label], index) => {
              const className =
                index === current ? "active" : index < current ? "done" : "";
              return `<span class="stage-pill ${className}">${escapeHtml(label)}</span>`;
            })
            .join("")}
        </nav>
      </div>
    </header>
  `;
}

function coverImages() {
  const picks = [
    data.tests[0].questions[0].image,
    data.training.artifactItems.find((item) => item.type === "images")?.images[0],
    data.tests[1].questions[8].image,
  ].filter(Boolean);

  return `
    <div class="cover-strip" aria-hidden="true">
      ${picks
        .map(
          (image) =>
            `<img src="${escapeHtml(image.src)}" alt="" loading="eager" />`,
        )
        .join("")}
    </div>
  `;
}

function answerKind(value) {
  return value === "Real" ? "real" : value === "AI-generated" ? "ai" : "";
}

function introView() {
  return `
    ${topbar()}
    <section class="wrap intro-layout">
      <div>
        <h1>${escapeHtml(data.title)}</h1>
        <h2 class="intro-subtitle">${escapeHtml(data.subtitle)}</h2>
        <p class="lede">${escapeHtml(data.description)}</p>
        <div class="info-band">
          <h3>What to expect:</h3>
          <ul class="info-list">
            ${data.expectations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          </ul>
        </div>
        <p class="author-note">${escapeHtml(data.authorship)}</p>
        <p class="footer-note">
          This version is for reading and practice. It keeps answers in this page only and does not submit responses.
        </p>
        <div class="intro-actions">
          <button class="button" data-action="start-test1">Start Test #1</button>
        </div>
      </div>
      ${coverImages()}
    </section>
  `;
}

function testProgress(test) {
  const answered = state.answers[test.id].filter(Boolean).length;
  const total = test.questions.length;
  const width = `${Math.round((answered / total) * 100)}%`;
  return `
    <aside class="test-sidebar">
      <div class="progress-meter">
        <div class="meter-track"><div class="meter-fill" style="width:${width}"></div></div>
        <div class="meter-copy">
          <span>${answered} answered</span>
          <span>${total} total</span>
        </div>
        <div class="question-dots" aria-label="Question progress">
          ${test.questions
            .map((_, index) => {
              const classes = [
                state.questionIndex === index ? "current" : "",
                state.answers[test.id][index] ? "answered" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return `<span class="dot ${classes}"></span>`;
            })
            .join("")}
        </div>
      </div>
    </aside>
  `;
}

function testView(testIndex) {
  const test = data.tests[testIndex];
  const question = test.questions[state.questionIndex];
  const selected = state.answers[test.id][state.questionIndex];
  const isLast = state.questionIndex === test.questions.length - 1;
  return `
    ${topbar()}
    <section class="wrap">
      <p class="eyebrow">${escapeHtml(test.title)}</p>
      <h2>${escapeHtml(test.title)}</h2>
      ${test.intro ? `<p class="lede">${escapeHtml(test.intro)}</p>` : ""}
      ${test.hint ? `<p class="author-note">${escapeHtml(test.hint)}</p>` : ""}
      <div class="test-layout">
        <article class="question-panel">
          <div class="question-media">
            <img src="${escapeHtml(question.image.src)}" alt="${escapeHtml(question.prompt)}" />
          </div>
          <div class="question-body">
            <span class="question-count">Question ${state.questionIndex + 1} of ${test.questions.length}</span>
            <h3 class="question-title">${escapeHtml(question.prompt)}</h3>
            <div class="answer-grid">
              ${question.options
                .map(
                  (option) => `
                    <button
                      class="answer-button ${answerKind(option)} ${selected === option ? "selected" : ""}"
                      data-action="answer"
                      data-test="${escapeHtml(test.id)}"
                      data-value="${escapeHtml(option)}"
                    >
                      ${escapeHtml(option)}
                    </button>
                  `,
                )
                .join("")}
            </div>
            <div class="question-actions">
              <button class="button secondary" data-action="prev-question" ${state.questionIndex === 0 ? "disabled" : ""}>Back</button>
              <button class="button" data-action="${isLast ? "finish-test" : "next-question"}" ${selected ? "" : "disabled"}>
                ${isLast ? "See score" : "Next"}
              </button>
            </div>
          </div>
        </article>
        ${testProgress(test)}
      </div>
    </section>
  `;
}

function scoreFor(test) {
  return test.questions.reduce((score, question, index) => {
    return score + (state.answers[test.id][index] === question.answer ? 1 : 0);
  }, 0);
}

function scoreView(testIndex) {
  const test = data.tests[testIndex];
  const score = scoreFor(test);
  const isFirst = test.id === "test1";
  return `
    ${topbar()}
    <section class="wrap">
      <article class="score-panel">
        <h2>Well done!</h2>
        <p class="score-sentence">Your score for ${escapeHtml(test.title.toLowerCase())} is ${score} / ${test.questions.length}</p>
        <p class="body-copy">
          ${isFirst ? "The training material follows before the second round." : "Both rounds are complete. The solution images are below."}
        </p>
        <div class="score-actions">
          <button class="button secondary" data-action="${isFirst ? "retake-test1" : "retake-test2"}">Retake ${escapeHtml(test.title)}</button>
          <button class="button" data-action="${isFirst ? "open-training" : "open-final"}">
            ${isFirst ? "Open training" : "View solutions"}
          </button>
        </div>
      </article>
    </section>
  `;
}

function trainingContent(items) {
  const chunks = [];
  let imageBuffer = [];

  function trainingImage(image) {
    return `
      <figure class="content-image">
        <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" loading="lazy" />
        ${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}
      </figure>
    `;
  }

  function flushImages() {
    if (!imageBuffer.length) return;
    chunks.push(`
      <div class="${imageBuffer.length > 2 ? "image-grid four" : "image-pair"}">
        ${imageBuffer
          .map((image) => trainingImage(image))
          .join("")}
      </div>
    `);
    imageBuffer = [];
  }

  for (const item of items) {
    if (item.type === "images") {
      imageBuffer.push(...item.images);
      continue;
    }
    flushImages();
    if (item.type === "h2") chunks.push(`<h2>${escapeHtml(item.text)}</h2>`);
    if (item.type === "h3") chunks.push(`<h3>${escapeHtml(item.text)}</h3>`);
    if (item.type === "p") chunks.push(`<p>${escapeHtml(item.text)}</p>`);
  }
  flushImages();
  return chunks.join("");
}

function visualQuiz(quiz, index) {
  const selected = state.visualAnswers[index];
  return `
    <article class="training-quiz">
      <h3>${escapeHtml(quiz.prompt)}</h3>
      <div class="quiz-option-grid">
        ${quiz.options
          .map((option) => {
            const classes = [
              selected === option.label ? "selected" : "",
              selected && quiz.answer === option.label ? "correct" : "",
              selected === option.label && selected !== quiz.answer ? "incorrect" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return `
              <button class="image-option ${classes}" data-action="visual-answer" data-index="${index}" data-value="${escapeHtml(option.label)}">
                <img src="${escapeHtml(option.image.src)}" alt="${escapeHtml(`${quiz.prompt} option ${option.label}`)}" loading="lazy" />
                <span>${escapeHtml(option.label)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
      ${
        selected
          ? `<p class="feedback">${escapeHtml(selected === quiz.answer ? quiz.feedback : "This is AI - try again!")}</p>`
          : ""
      }
    </article>
  `;
}

function trainingView() {
  return `
    ${topbar()}
    <section class="wrap training-section">
      <div>
        <p class="eyebrow">Detection training</p>
        <h2>${escapeHtml(data.training.title)}</h2>
        <p class="lede">${escapeHtml(data.training.intro)}</p>
      </div>
      <div class="training-content">
        ${trainingContent(data.training.artifactItems)}
        <h2>${escapeHtml(data.training.visualLanguage.title)}</h2>
        ${data.training.visualLanguage.intro.map((text) => `<p>${escapeHtml(text)}</p>`).join("")}
      </div>
      <div class="visual-quizzes">
        ${data.training.visualLanguage.quizzes.map((quiz, index) => visualQuiz(quiz, index)).join("")}
      </div>
      <div class="training-content">
        ${trainingContent(data.training.researchItems)}
      </div>
      <div class="training-actions">
        <button class="button secondary" data-action="back-score1">Back to Test #1 score</button>
        <button class="button" data-action="start-test2">${escapeHtml(data.training.ready || "Start Test #2")}</button>
      </div>
    </section>
  `;
}

function finalView() {
  const test2 = data.tests[1];
  const score = scoreFor(test2);
  return `
    ${topbar()}
    <section class="wrap training-section">
      <article class="score-panel">
        <h2>Well done!</h2>
        <p class="score-sentence">Your score for test #2 is ${score} / ${test2.questions.length}</p>
        <p class="body-copy">Thank you for your participation!</p>
        <div class="final-actions">
          <button class="button secondary" data-action="retake-test2">Retake Test #2</button>
          <button class="button secondary" data-action="restart">Start over</button>
        </div>
      </article>
      ${data.solutions
        .map((solution, solutionIndex) => {
          const sourceTest = data.tests[solutionIndex];
          return `
            <article class="solution-panel">
              <h2>${escapeHtml(solution.title)}</h2>
              <p class="legend-copy">Each image is labeled with its original question number, correct classification, and recovered source/model caption.</p>
              <div class="solution-legend" aria-label="Classification legend">
                <span><i class="legend-dot real"></i>Real</span>
                <span><i class="legend-dot ai"></i>AI-generated</span>
              </div>
              <div class="solution-grid">
                ${solution.images
                  .map((image, imageIndex) => {
                    const question = sourceTest.questions[imageIndex];
                    const answer = question?.answer || "";
                    const sourceCaption = image.caption || "";
                    return `
                      <figure class="solution-card ${answerKind(answer)}">
                        <img src="${escapeHtml(image.src)}" alt="${escapeHtml(sourceCaption || image.alt)}" />
                        <figcaption>
                          <span>${escapeHtml(question?.prompt.split(".")[0] || `#${imageIndex + 1}`)}</span>
                          <strong>${escapeHtml(answer)}</strong>
                          ${sourceCaption ? `<em>${escapeHtml(sourceCaption)}</em>` : ""}
                        </figcaption>
                      </figure>
                    `;
                  })
                  .join("")}
              </div>
            </article>
          `;
        })
        .join("")}
      <p class="footer-note">Original survey source: ${escapeHtml(data.sourceUrl)}</p>
    </section>
  `;
}

function render() {
  const view =
    state.stage === "intro"
      ? introView()
      : state.stage === "test1"
        ? testView(0)
        : state.stage === "score1"
          ? scoreView(0)
          : state.stage === "training"
            ? trainingView()
            : state.stage === "test2"
              ? testView(1)
              : finalView();
  app.innerHTML = view;
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "start-test1") setStage("test1");
  if (action === "retake-test1") {
    resetTest("test1");
    setStage("test1");
  }
  if (action === "start-test2") setStage("test2");
  if (action === "retake-test2") {
    resetTest("test2");
    setStage("test2");
  }
  if (action === "open-training") setStage("training");
  if (action === "back-score1") setStage("score1");
  if (action === "open-final") setStage("final");
  if (action === "restart") {
    resetAll();
    setStage("intro");
  }

  if (action === "answer") {
    state.answers[target.dataset.test][state.questionIndex] = target.dataset.value;
    render();
  }

  if (action === "prev-question") {
    state.questionIndex = Math.max(0, state.questionIndex - 1);
    render();
  }

  if (action === "next-question") {
    state.questionIndex += 1;
    window.scrollTo({ top: 0, behavior: "smooth" });
    render();
  }

  if (action === "finish-test") {
    setStage(state.stage === "test1" ? "score1" : "final");
  }

  if (action === "visual-answer") {
    state.visualAnswers[target.dataset.index] = target.dataset.value;
    render();
  }
});

render();
