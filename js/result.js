// result.js
// 結果画面（result.html）の動作を制御するスクリプト。
// 役割：localStorageからの診断結果取得 → 該当タイプデータの検索 →
//       画面への描画 → （データが不正・期限切れの場合の）エラー表示。
// 16タイプのデータ（personalityTypes / sakeRecommendations）は
// data.js で定義されているものをそのまま利用する。

const RESULT_STORAGE_KEY = "sakePersonalityResult"; // questions.js側と揃えるストレージキー
const RESULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 診断結果をlocalStorageに保持しておく期間（24時間）

// 4軸それぞれの前半文字（左側）・後半文字（右側）と、その説明ラベルの対応
// questions.js側の判定ロジック（judgeAxis）と対になる定義
const AXIS_DEFINITIONS = [
  { frontLetter: "E", backLetter: "I", frontLabel: "社交・外食派", backLabel: "内省・自炊派" },
  { frontLetter: "P", backLetter: "A", frontLabel: "計画・管理派", backLabel: "衝動・刺激派" },
  { frontLetter: "F", backLetter: "D", frontLabel: "効率・タイパ派", backLabel: "こだわり・美的派" },
  { frontLetter: "C", backLetter: "S", frontLabel: "安定・タフ派", backLabel: "繊細・ケア派" }
];

// 画面上のDOM要素をまとめて保持しておくオブジェクト（init内で取得する）
let elements = {};

// 現在表示中の診断結果（タイプコード・性格データ・日本酒データ）
// share.js側のシェア画像生成でも参照するため、モジュール変数として保持しておく
let currentDiagnosisResult = null;

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheDomElements();
  setupRestartLink();

  const resultData = getResultDataFromStorage();

  // 診断結果が取得できない場合はエラー表示にする
  if (resultData === null) {
    showError();
    return;
  }

  const typeCode = resultData.typeCode;
  const personality = personalityTypes[typeCode];
  const sakeList = sakeRecommendations[typeCode];

  // タイプコードに該当するデータが16タイプの中に見つからない場合もエラー表示にする
  if (!personality || !sakeList || sakeList.length === 0) {
    showError();
    return;
  }

  // share.js（SNSシェア画像生成）が参照できるよう、確定した結果を保持しておく
  currentDiagnosisResult = { typeCode: typeCode, personality: personality, sakeList: sakeList };

  renderResult(typeCode, personality, sakeList);
  renderAxisBars(resultData.scores);
  showResultContainer();
}

// 操作・描画に必要なDOM要素をまとめて取得する
function cacheDomElements() {
  elements = {
    errorContainer: document.getElementById("errorContainer"),
    resultContainer: document.getElementById("resultContainer"),
    resultHero: document.getElementById("resultHero"),
    resultFooterActions: document.getElementById("resultFooterActions"),
    typeCodeText: document.getElementById("typeCodeText"),
    typeImage: document.getElementById("typeImage"),
    typeNameText: document.getElementById("typeNameText"),
    descriptionText: document.getElementById("descriptionText"),
    dietDescriptionText: document.getElementById("dietDescriptionText"),
    favoriteFoodsList: document.getElementById("favoriteFoodsList"),
    sakeRecommendationsList: document.getElementById("sakeRecommendationsList"),
    restartLink: document.getElementById("restartLink"),
    axisSection: document.getElementById("axisSection"),
    axisBars: document.getElementById("axisBars")
  };
}

// ------------------------------------------------------------
// 診断結果データの取得
// ------------------------------------------------------------

// localStorageから診断結果（タイプコードとスコア）を読み込んで返す
// 取得できない・形式が不正・保持期限切れの場合はnullを返す
function getResultDataFromStorage() {
  const rawData = localStorage.getItem(RESULT_STORAGE_KEY);

  if (!rawData) {
    return null;
  }

  try {
    const parsedData = JSON.parse(rawData);

    if (!parsedData.typeCode) {
      return null;
    }

    if (isResultExpired(parsedData.savedAt)) {
      // 期限切れの結果はストレージからも削除しておく
      localStorage.removeItem(RESULT_STORAGE_KEY);
      return null;
    }

    return parsedData;
  } catch (error) {
    // JSON.parseに失敗した場合（データが壊れている場合）もnullを返す
    return null;
  }
}

// 保存日時（savedAt）を元に、保持期限（RESULT_EXPIRY_MS）を過ぎているかどうかを判定する
function isResultExpired(savedAt) {
  // savedAtが無い古い形式のデータは、期限切れ扱いにせずそのまま表示する
  if (typeof savedAt !== "number") {
    return false;
  }

  return Date.now() - savedAt > RESULT_EXPIRY_MS;
}

// ------------------------------------------------------------
// 画面への描画
// ------------------------------------------------------------

// タイプコード・性格データ・日本酒データを画面に反映する
function renderResult(typeCode, personality, sakeList) {
  // タイプコード（例：EPFC）はアルファベットの略号なので、文節区切りの対象外とする
  elements.typeCodeText.textContent = typeCode;

  setPhraseText(elements.typeNameText, personality.typeName);
  setPhraseText(elements.descriptionText, personality.description);
  setPhraseText(elements.dietDescriptionText, personality.dietDescription);

  renderFavoriteFoods(personality.favoriteFoods);
  renderTypeImage(typeCode, personality.typeName);
  renderSakeRecommendations(elements.sakeRecommendationsList, sakeList);
}

// 好む食べ物の配列を、リスト（<li>要素）として描画する
function renderFavoriteFoods(favoriteFoods) {
  elements.favoriteFoodsList.innerHTML = "";

  favoriteFoods.forEach((food) => {
    const listItem = document.createElement("li");
    setPhraseText(listItem, food);
    elements.favoriteFoodsList.appendChild(listItem);
  });
}

// おすすめの日本酒の描画（renderSakeRecommendations等）はjs/sake-utils.jsで定義している
// （result.html・types.htmlのモーダルの両方から共通で使うため）

// タイプ画像（images/タイプコード.png）を表示する
// 該当する画像が存在しない場合は、画像エリアごと非表示にする
function renderTypeImage(typeCode, typeName) {
  const imagePath = "images/" + typeCode.toLowerCase() + ".png";

  elements.typeImage.src = imagePath;
  elements.typeImage.alt = typeName;
  elements.typeImage.onerror = () => {
    elements.typeImage.hidden = true;
  };
}

// ------------------------------------------------------------
// 4軸スコアのパーセンテージ表示
// ------------------------------------------------------------

// 4軸それぞれのスコアバーを描画する
// 古い形式のデータ（スコアを保存していない結果）が残っている場合はセクションごと非表示にする
function renderAxisBars(scores) {
  if (!scores || typeof scores !== "object") {
    elements.axisSection.hidden = true;
    return;
  }

  elements.axisBars.innerHTML = "";

  AXIS_DEFINITIONS.forEach((axis, index) => {
    const barElement = createAxisBarElement(axis, scores, index);
    if (barElement) {
      elements.axisBars.appendChild(barElement);
    }
  });

  elements.axisSection.hidden = false;

  setupAxisBarFadeInObserver();
}

// スコアバーが画面内に入ったタイミングで、下から順にフェードインさせる
function setupAxisBarFadeInObserver() {
  const bars = elements.axisBars.querySelectorAll(".axis-bar");

  // Intersection Observer未対応環境や動きを抑えたい設定のユーザーには、最初から全部表示する
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    bars.forEach((bar) => bar.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, observerInstance) => {
      // 1回のコールバックでまとめて画面内に入ったバー同士だけ、その中の順番で少しずつ遅らせる
      const enteringBars = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      enteringBars.forEach((bar, indexInBatch) => {
        bar.style.transitionDelay = indexInBatch * 150 + "ms";
        bar.classList.add("is-visible");
        // 一度表示したバーは監視を止める（スクロールで往復しても再アニメーションしない）
        observerInstance.unobserve(bar);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
  );

  bars.forEach((bar) => observer.observe(bar));
}

// 1軸分のスコアバー（「◯％ ◯◯型」の見出し＋バー＋両端ラベル）のDOM要素を作成する
function createAxisBarElement(axis, scores, index) {
  const frontScore = scores[axis.frontLetter];
  const backScore = scores[axis.backLetter];
  const totalScore = frontScore + backScore;

  // スコアが数値として存在しない・合計が0以下の場合は描画しない（防御的チェック）
  if (typeof frontScore !== "number" || typeof backScore !== "number" || totalScore <= 0) {
    return null;
  }

  // バーの左端＝前半文字（0%）、右端＝後半文字（100%）としたときの、つまみの位置
  const knobPercent = (backScore / totalScore) * 100;

  // 優勢な方（スコアが高い方）の文字・ラベル・パーセンテージを見出しに表示する
  const isBackDominant = backScore >= frontScore;
  const dominantLabel = isBackDominant ? axis.backLabel : axis.frontLabel;
  const dominantPercent = Math.round(isBackDominant ? knobPercent : 100 - knobPercent);

  const container = document.createElement("div");
  container.className = "axis-bar axis-bar-" + (index + 1);

  const summary = document.createElement("p");
  summary.className = "axis-bar-summary";

  const percentText = document.createElement("span");
  percentText.className = "axis-bar-percent";
  percentText.textContent = dominantPercent + "%";

  const labelText = document.createElement("span");
  setPhraseText(labelText, " " + dominantLabel);

  summary.appendChild(percentText);
  summary.appendChild(labelText);

  const track = document.createElement("div");
  track.className = "axis-bar-track";

  const knob = document.createElement("div");
  knob.className = "axis-bar-knob";
  knob.style.left = knobPercent + "%";
  track.appendChild(knob);

  const labels = document.createElement("div");
  labels.className = "axis-bar-labels";

  const frontLabelText = document.createElement("span");
  setPhraseText(frontLabelText, axis.frontLabel);

  const backLabelText = document.createElement("span");
  setPhraseText(backLabelText, axis.backLabel);

  labels.appendChild(frontLabelText);
  labels.appendChild(backLabelText);

  container.appendChild(summary);
  container.appendChild(track);
  container.appendChild(labels);

  return container;
}

// エラーメッセージを表示し、結果表示エリアは非表示にする
function showError() {
  elements.errorContainer.hidden = false;
  elements.resultContainer.hidden = true;
}

// 結果表示エリアを表示する
function showResultContainer() {
  elements.errorContainer.hidden = true;
  elements.resultContainer.hidden = false;

  playResultHeroPopIn();
  setupSlideInObserver();
  setupFooterActionsPopInObserver();
}

// シェア欄＋もう一度診断するボタンが、スクロールして画面内に入ったタイミングでポップアップする
function setupFooterActionsPopInObserver() {
  const target = elements.resultFooterActions;

  if (!target) {
    return;
  }

  // Intersection Observer未対応環境や動きを抑えたい設定のユーザーには、最初から表示する
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    target.classList.add("is-visible");
    return;
  }

  const observer = new IntersectionObserver(
    (entries, observerInstance) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observerInstance.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
  );

  observer.observe(target);
}

// 性格・食事の傾向・好む食べ物が、スクロールして画面内に入ったタイミングで左右からスライドインする
function setupSlideInObserver() {
  const targets = elements.resultContainer.querySelectorAll(".reveal-slide");

  // Intersection Observer未対応環境や動きを抑えたい設定のユーザーには、最初から全部表示する
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    targets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, observerInstance) => {
      // 1回のコールバックでまとめて画面内に入った要素同士だけ、その中の順番で少しずつ遅らせる
      const enteringTargets = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      enteringTargets.forEach((target, indexInBatch) => {
        target.style.transitionDelay = indexInBatch * 150 + "ms";
        target.classList.add("is-visible");
        // 一度表示した要素は監視を止める（スクロールで往復しても再アニメーションしない）
        observerInstance.unobserve(target);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
  );

  targets.forEach((target) => observer.observe(target));
}

// タイプ名・画像・タイプ通称のまとまりをポップインさせる
function playResultHeroPopIn() {
  if (!elements.resultHero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (elements.resultHero) {
      elements.resultHero.classList.add("is-visible");
    }
    return;
  }

  // 非表示状態が確実に描画されてからクラスを付けないと、ブラウザによってはポップインせず
  // 最初から表示された状態になってしまうことがある
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      elements.resultHero.classList.add("is-visible");
    });
  });
}

// ------------------------------------------------------------
// トップ画面への導線
// ------------------------------------------------------------

// 「もう一度診断する」リンクをクリックしたときに、
// 古い診断結果が残らないようlocalStorageをクリアしておく
function setupRestartLink() {
  const restartLink = document.getElementById("restartLink");

  if (restartLink) {
    restartLink.addEventListener("click", () => {
      localStorage.removeItem(RESULT_STORAGE_KEY);
    });
  }
}
