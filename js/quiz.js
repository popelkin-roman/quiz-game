import { questions } from "./questions.js";
const COUNTER = 30;
let timeLeft = document.querySelector(".time-left");
let quizContainer = document.getElementById("container");
let countOfQuestion = document.querySelector(".number-of-question");
let displayContainer = document.querySelector(".display-container");
let scoreContainer = document.querySelector(".score-container");
let nextQuiz = document.getElementById("nextQuiz");
let userScoreValue = document.querySelector(".user-score__value");
let userScoreBonus = document.querySelector(".user-score__bonus");
let startScreen = document.querySelector(".start-screen");
let startButton = document.getElementById("start-button");
let topicBtns = document.querySelectorAll(".topic-button");
let ratingElement = document.querySelector(".rang__score");
let ratingValue = 0;
let startDesription = document.querySelector(".start-screen__description");
let modal = document.querySelector(".modal");
let overlay = document.querySelector(".overlay");
let closeModalBtn = document.querySelector(".btn--close-modal");
let leaderboard = document.querySelector(".leaderboard");
let leaderboardBtn = document.querySelector(".rang__btn");
let closeLeaderboardBtn = document.querySelector(".leaderboard__btn");
let lbTable = document.querySelector(".lb-table");
let authorization = document.querySelector(".authorization");
let authorizationBtn = document.querySelector(".authorization__btn");
let loader = document.querySelector(".loader");
let questionCount;
let scoreCount = 0;
let countdown;
let quizArray;
let quizResultName;
let quizCards;
let player;
let audioContext = new AudioContext();
let gainNode = audioContext.createGain();
let playingBuffer;
let quizesScores = {};

const openModal = function (e) {
  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");
};
const closeModal = function () {
  modal.classList.add("hidden");
  overlay.classList.add("hidden");
};

const openLeaderboard = function (e) {
  leaderboard.classList.remove("hidden");
  overlay.classList.remove("hidden");
  // if (player && player.getMode() !== "lite") {
  createLeaderboard();
  // }
};
const closeLeaderboard = function () {
  leaderboard.classList.add("hidden");
  overlay.classList.add("hidden");
  if (ratingValue > 5000) {
    ysdk.feedback.canReview().then(({ value, reason }) => {
      if (value) {
        ysdk.feedback.requestReview().then(({ feedbackSent }) => {
          console.log(feedbackSent);
        });
      } else {
        console.log(reason);
      }
    });
  }
};

const authorize = function () {
  ysdk.auth
    .openAuthDialog()
    .then(() => {
      // Игрок успешно авторизован
      authorization.classList.add("hide");
      loader.classList.remove("hide");
      createLeaderboard();
    })
    .catch(() => {
      // Игрок не авторизован.
    });
};

leaderboardBtn.addEventListener("click", openLeaderboard);
closeModalBtn.addEventListener("click", closeModal);
closeLeaderboardBtn.addEventListener("click", closeLeaderboard);
overlay.addEventListener("click", closeModal);
overlay.addEventListener("click", closeLeaderboard);
authorizationBtn.addEventListener("click", authorize);

//Mute when blur
window.addEventListener("blur", () => {
  gainNode.gain.value = 0;
});
window.addEventListener("focus", () => {
  gainNode.gain.value = 1;
});

topicBtns.forEach((el) => {
  el.addEventListener("click", openStartScreen);
  quizesScores[el.id] = 0;
});

YaGames.init().then((ysdk) => {
  console.log("Yandex SDK initialized");
  window.ysdk = ysdk;
  ysdk.adv.showFullscreenAdv();
  try {
    let localScores = localStorage.getItem("quizesScores");
    if (localScores) quizesScores = JSON.parse(localScores);
    ratingValue = +localStorage.getItem("ratingValue");
  } catch {
    console.log("Чтобы сохранить прогресс, выйдите из режима инкогнито");
  }
  ysdk
    .getPlayer()
    .then((_player) => {
      player = _player;
      if (player.getMode() === "lite") {
        loader.classList.add("hide");
        authorization.classList.remove("hide");
      }
      player.getStats().then((topics) => {
        if (topics) quizesScores = topics;
      });
    })
    .catch((err) => {
      openModal();
    })
    .finally(() => {
      updateScores(quizesScores);
    });
  ysdk
    .getLeaderboards()
    .then((lb) => {
      lb.getLeaderboardPlayerEntry("leaderboard2023")
        .then((res) => {
          if (res.score) ratingValue = res.score;
        })
        .catch((err) => {});
    })
    .catch((e) => {
      // console.log("error in ysdk createScore");
    })
    .finally(() => {
      ratingElement.innerHTML = formatScore(ratingValue);
    });
});

function openStartScreen(e) {
  let topicButton = e.target.closest(".topic-button");
  quizResultName = topicButton.id;
  quizArray = questions[quizResultName].questions;
  startDesription.innerHTML = questions[quizResultName].description;
  startDesription.classList.remove("hide");
  startButton.classList.remove("hide");

  startScreen.classList.remove("hide");
  document.querySelector(".card__side--back").classList.add(quizResultName);
  document.querySelector(".card__side--front").style.transform =
    "rotateY(-180deg)";
  document.querySelector(".card__side--back").style.transform = "rotateY(0)";
}

nextQuiz.addEventListener("click", goToHomeScreen);

function goToHomeScreen() {
  document.querySelector(`.card__side--front`).style.transform = `rotateY(0)`;
  document.querySelector(
    `.card__side--back`
  ).style.transform = `rotateY(180deg)`;
  scoreContainer.classList.add(`hide`);
  document.querySelector(".card__side--back").classList.remove(quizResultName);
  if (ratingValue > 15000) {
    //
  } else {
    ysdk.adv.showFullscreenAdv();
  }
}

//Timer
const timerDisplay = (count) => {
  timeLeft.innerHTML = `${count}`;
  countdown = setInterval(() => {
    count--;
    count < 10
      ? (timeLeft.innerHTML = `0${count}`)
      : (timeLeft.innerHTML = `${count}`);
    if (count === 0) {
      clearInterval(countdown);
      displayNext();
    }
  }, 1000);
};

//Display quiz
const quizDisplay = (questionCount) => {
  quizCards = document.querySelectorAll(".container-mid");
  //Hide other cards
  quizCards.forEach((card) => {
    card.classList.add("hide");
  });
  //display current question card
  quizCards[questionCount].classList.remove("hide");
  if (quizCards[questionCount].querySelector("audio")) {
    // if (playingBuffer) playingBuffer.stop(0);
    async function getFile(path) {
      let res = await fetch(path);
      let arrayBuffer = await res.arrayBuffer();
      let audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      return audioBuffer;
    }
    function playSample(sample) {
      let sampleSource = audioContext.createBufferSource();
      sampleSource.buffer = sample;
      sampleSource.connect(gainNode).connect(audioContext.destination);
      sampleSource.start(0);
      return sampleSource;
    }

    let path = quizCards[questionCount].querySelector("audio").src;
    getFile(path).then((res) => {
      if (playingBuffer) playingBuffer.stop(0);
      playingBuffer = playSample(res);
    });
  }
};

//Quiz Creation
function quizCreator() {
  quizArray.sort(() => Math.random() - 0.5);
  for (let i of quizArray) {
    i.options.sort(() => Math.random() - 0.5);
    let div = document.createElement("div");
    div.classList.add("container-mid", "hide");
    countOfQuestion.innerHTML = 1 + "/" + quizArray.length;
    if (i.image) {
      let imageDiv = document.createElement("div");
      imageDiv.classList.add("image-container");
      let imageElement = document.createElement("img");
      imageElement.src = i.image;
      imageDiv.appendChild(imageElement);
      div.appendChild(imageDiv);
    }
    //audio
    if (i.audio) {
      let audioDiv = document.createElement("div");
      audioDiv.classList.add("audio-container");
      let audioElement = document.createElement("audio");
      audioElement.src = i.audio;
      audioDiv.appendChild(audioElement);
      div.appendChild(audioDiv);
    }
    //question
    let questionAnswersBlock = document.createElement("div");
    let question_DIV = document.createElement("p");
    questionAnswersBlock.classList.add("answers-block");
    question_DIV.classList.add("question");
    question_DIV.innerHTML = i.question;
    if (i.question.length > 25) question_DIV.classList.add("question-small");
    questionAnswersBlock.appendChild(question_DIV);
    //options
    let options = "";
    i.options.forEach((opt) => {
      options += `<button class="option-div" onclick="checker(this)">${opt}</button>`;
    });
    questionAnswersBlock.innerHTML += options;
    div.appendChild(questionAnswersBlock);
    quizContainer.appendChild(div);
  }
}

//Checker Function to check if option is correct or not
function checker(userOption) {
  let userSolution = userOption.innerText;
  let question =
    document.getElementsByClassName("container-mid")[questionCount];
  let options = question.querySelectorAll(".option-div");

  if (userSolution === quizArray[questionCount].correct) {
    scoreCount++;
  }
  clearInterval(countdown);
  options.forEach((element) => {
    element.disabled = true;
  });

  displayNext();
}

function displayNext() {
  questionCount++;

  if (questionCount === quizArray.length) {
    setTimeout(() => {
      if (playingBuffer) playingBuffer.stop(0);
    }, 100);
    displayContainer.classList.add("hide");
    userScoreBonus.classList.add("hidden");
    scoreContainer.classList.remove("hide");
    // userScore.innerHTML =
    // "Твой результат:<br/>" + scoreCount + " из " + questionCount;
    let prevScore = quizesScores[quizResultName] || 0;
    quizesScores[quizResultName] = Math.max(prevScore, scoreCount);
    saveScores(quizesScores);
    updateScores(quizesScores);
    ratingValue += scoreCount * 100;
    if (scoreCount === questionCount) ratingValue += 1000;
    localStorage.setItem("ratingValue", ratingValue);
    ysdk.getLeaderboards().then((lb) => {
      lb.setLeaderboardScore("leaderboard2023", ratingValue);
    });
    ratingElement.innerHTML = formatScore(ratingValue);
    userScoreValue.innerText = 0;
    animateScore(userScoreValue, scoreCount * 100);
  } else {
    if (playingBuffer) playingBuffer.stop(0);
    countOfQuestion.innerHTML = questionCount + 1 + "/" + quizArray.length;
    quizDisplay(questionCount);
    clearInterval(countdown);
    timerDisplay(COUNTER);
  }
}

function animateScore(element, value) {
  let speed = 200;
  let data = +element.innerText;

  let time = value / speed;
  if (data < value) {
    element.innerText = Math.ceil(data + time);
    setTimeout(animateScore.bind(null, element, value), 1);
  } else {
    element.innerText = value;
    if (value == 500) {
      setTimeout(() => userScoreBonus.classList.remove("hidden"), 100);
      setTimeout(() => animateScore(element, 1500), 1000);
    }
  }
}

function saveScores(scores) {
  ysdk
    .getPlayer()
    .then((_player) => {
      _player.setStats(scores);
    })
    .catch((err) => {});
  localStorage.setItem("quizesScores", JSON.stringify(scores));
}

function updateScores(scores) {
  let topics = {};
  for (let key in scores) {
    let topic = key.slice(0, 7);
    if (!topics.hasOwnProperty(topic)) topics[topic] = scores[key];
    else topics[topic] += scores[key];
    addProgressToButton(key, scores[key]);
  }
  for (let key in topics) {
    document.querySelector(`.${key} .topic__score`).innerHTML =
      topics[key] + "|20";
  }
  function addProgressToButton(key, score) {
    let button = document.querySelector(`#${key}`);
    let btnClassName;
    switch (score) {
      case 1:
        btnClassName = "twenty-percent";
        break;
      case 2:
        btnClassName = "fourty-percent";
        break;
      case 3:
        btnClassName = "sixty-percent";
        break;
      case 4:
        btnClassName = "eighty-percent";
        break;
      case 5:
        btnClassName = "hundred-percent";
        break;
      default:
        btnClassName = "zero";
        break;
    }
    button.classList.add(btnClassName);
  }
}

startButton.addEventListener("click", () => {
  startScreen.classList.add("hide");
  displayContainer.classList.remove("hide");
  initial();
});

function initial() {
  quizContainer.innerHTML = "";
  questionCount = 0;
  scoreCount = 0;
  clearInterval(countdown);
  timerDisplay(COUNTER);
  quizCreator();
  quizDisplay(questionCount);
}

// function createLeaderboard() {
//   let res = {
//     userRank: 5,
//     entries: [
//       {
//         score: 1000,
//         rank: 1,
//         player: {
//           publicName: "Valuta Skuratov",
//         },
//       },
//       {
//         score: 900,
//         rank: 2,
//         player: {
//           publicName: "Valuta Skuratov",
//         },
//       },
//       {
//         score: 800,
//         rank: 3,
//         player: {
//           publicName: "Valuta Skuratov",
//         },
//       },
//       {
//         score: 700,
//         rank: 4,
//         player: {
//           publicName: "Valuta Skuratov",
//         },
//       },
//       {
//         score: 600,
//         rank: 5,
//         player: {
//           publicName: "Valuta Skuratov",
//         },
//       },
//       {
//         score: 500,
//         rank: 6,
//         player: {
//           publicName: "Valuta Skuratov",
//         },
//       },
//       {
//         score: 400,
//         rank: 7,
//         player: {
//           publicName: "Valuta Skuratov",
//         },
//       },
//       {
//         score: 300,
//         rank: 8,
//         player: {
//           publicName: "Valuta Skuratov",
//         },
//       },
//     ],
//   };
//   setTimeout(() => {
//     createTable(res);
//     loader.classList.add("hide");
//     lbTable.classList.remove("hide");
//   }, 2 * 1000);
// }

function createLeaderboard() {
  ysdk.getLeaderboards().then((_lb) => {
    _lb
      .getLeaderboardEntries("leaderboard2023", { includeUser: true })
      .then((res) => {
        createTable(res);
        loader.classList.add("hide");
        lbTable.classList.remove("hide");
      });
  });
}

function createTable(res) {
  let tableItems = new Map();

  res.entries.forEach((entry) => {
    const formattedScore = formatScore(entry.score);
    const name = entry.player.publicName || "Имя скрыто";
    tableItems.set(entry.rank, {
      score: formattedScore,
      name: name,
    });
  });

  for (let rank of tableItems.keys()) {
    let entry = tableItems.get(rank);
    let isUser = rank === res.userRank;
    if (rank <= 6) {
      addTableRow(rank, rank, entry.score, entry.name, isUser);
    }
    if (isUser && rank > 6) {
      addTableRow(6, "...", "...", "...");
      addTableRow(7, rank, entry.score, entry.name, isUser);
      addTableRow(8, "...", "...", "...");
    }
  }

  function addTableRow(line, place, score, name, isUser) {
    let row = document.querySelector(`.lb-table__row--${line}`);
    row.querySelector(".lb-table__place").innerHTML = place;
    row.querySelector(".lb-table__score").innerHTML = score;
    row.querySelector(".lb-table__name").innerHTML = name;
    if (isUser) row.classList.add("lb-table__user");
    else row.classList.remove("lb-table__user");
  }
}

function formatScore(score) {
  let res = "";
  let strArray = score.toString().split("");
  for (let i = 1; i <= strArray.length; i++) {
    let index = strArray.length - i;
    res = strArray[index] + res;
    if (i % 3 === 0) res = " " + res;
  }
  return res.trim();
}

window.onload = () => {
  window.checker = checker;
  startScreen.classList.remove("hide");
  displayContainer.classList.add("hide");
};
