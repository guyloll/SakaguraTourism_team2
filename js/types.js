// types.js
// タイプ一覧ページ（types.html）の動作を制御するスクリプト。
// 役割：16タイプ分のカード一覧の描画 → 画像クリックでの詳細モーダル表示・閉じる処理。
// 16タイプのデータ（personalityTypes / sakeRecommendations）はdata.jsで定義されているものをそのまま利用する。

// 画面上のDOM要素をまとめて保持しておくオブジェクト（init内で取得する）
let typesElements = {};

document.addEventListener("DOMContentLoaded", initTypesPage);

function initTypesPage() {
  cacheTypesElements();
  renderTypesGrid();
  setupModalCloseHandlers();
  setupCardFadeInObserver();
}

// 操作・描画に必要なDOM要素をまとめて取得する
function cacheTypesElements() {
  typesElements = {
    grid: document.getElementById("typesGrid"),
    modal: document.getElementById("typeDetailModal"),
    closeModalButton: document.getElementById("closeModalButton"),
    modalTypeCode: document.getElementById("modalTypeCode"),
    modalTypeImage: document.getElementById("modalTypeImage"),
    modalTypeName: document.getElementById("modalTypeName"),
    modalDescription: document.getElementById("modalDescription"),
    modalDietDescription: document.getElementById("modalDietDescription"),
    modalFavoriteFoods: document.getElementById("modalFavoriteFoods"),
    modalSakeRecommendationsList: document.getElementById("modalSakeRecommendationsList")
  };
}

// ------------------------------------------------------------
// タイプ一覧の描画
// ------------------------------------------------------------

// 16タイプ分のカードを一覧に描画する
function renderTypesGrid() {
  const typeCodes = Object.keys(personalityTypes);

  typeCodes.forEach((typeCode, index) => {
    const card = createTypeCardElement(typeCode, index);
    typesElements.grid.appendChild(card);
  });
}

// 1タイプ分のカード（画像・通称・タイプ名）のDOM要素を作成する
// index（並び順）の偶数・奇数で、フェードインする方向（左列＝左から／右列＝右から）を分ける
function createTypeCardElement(typeCode, index) {
  const personality = personalityTypes[typeCode];

  const card = document.createElement("div");
  card.className = "type-card " + (index % 2 === 0 ? "fade-in-left" : "fade-in-right");

  const imageButton = document.createElement("button");
  imageButton.type = "button";
  imageButton.className = "type-card-image-button";
  imageButton.setAttribute("aria-label", personality.typeName + "の詳細を見る");
  imageButton.addEventListener("click", () => openTypeDetailModal(typeCode));

  const image = document.createElement("img");
  image.className = "type-card-image";
  image.src = "images/" + typeCode.toLowerCase() + ".png";
  image.alt = personality.typeName;

  imageButton.appendChild(image);

  const nickname = document.createElement("p");
  nickname.className = "type-card-nickname";
  setPhraseText(nickname, personality.typeName);

  const code = document.createElement("p");
  code.className = "type-card-code";
  code.textContent = typeCode;

  card.appendChild(imageButton);
  card.appendChild(nickname);
  card.appendChild(code);

  return card;
}

// カードが画面内に入ったタイミングで、左右からのフェードインを発火させる。
// タブに遷移した直後は最初の数枚がまとめて画面内に入るため、そのときは上から順に少しずつ
// 遅らせて連続表示にする（スクロールで後から画面内に入るカードも、同じ仕組みでフェードインする）
function setupCardFadeInObserver() {
  const cards = typesElements.grid.querySelectorAll(".type-card");

  // Intersection Observer未対応環境や動きを抑えたい設定のユーザーには、最初から全部表示する
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cards.forEach((card) => card.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, observerInstance) => {
      // 1回のコールバックでまとめて画面内に入ったカード同士だけ、その中の順番で少しずつ遅らせる
      // （スクロールに応じて後から画面内に入るカードまで大きな遅延を持ち越さないようにするため）
      const enteringCards = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      enteringCards.forEach((card, indexInBatch) => {
        card.style.transitionDelay = indexInBatch * 150 + "ms";
        card.classList.add("is-visible");
        // 一度表示したカードは監視を止める（スクロールで往復しても再アニメーションしない）
        observerInstance.unobserve(card);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
  );

  cards.forEach((card) => observer.observe(card));
}

// ------------------------------------------------------------
// 詳細モーダルの表示・非表示
// ------------------------------------------------------------

// 指定したタイプの詳細をモーダルに反映して表示する
function openTypeDetailModal(typeCode) {
  const personality = personalityTypes[typeCode];
  const sakeList = sakeRecommendations[typeCode];

  // タイプコード（例：EPFC）はアルファベットの略号なので、文節区切りの対象外とする
  typesElements.modalTypeCode.textContent = typeCode;
  typesElements.modalTypeImage.src = "images/" + typeCode.toLowerCase() + ".png";
  typesElements.modalTypeImage.alt = personality.typeName;

  setPhraseText(typesElements.modalTypeName, personality.typeName);
  setPhraseText(typesElements.modalDescription, personality.description);
  setPhraseText(typesElements.modalDietDescription, personality.dietDescription);

  renderModalFavoriteFoods(personality.favoriteFoods);
  renderSakeRecommendations(typesElements.modalSakeRecommendationsList, sakeList);

  typesElements.modal.hidden = false;
}

// モーダル内の「好む食べ物」リストを描画する
function renderModalFavoriteFoods(favoriteFoods) {
  typesElements.modalFavoriteFoods.innerHTML = "";

  favoriteFoods.forEach((food) => {
    const listItem = document.createElement("li");
    setPhraseText(listItem, food);
    typesElements.modalFavoriteFoods.appendChild(listItem);
  });
}

// モーダルを閉じる
function closeTypeDetailModal() {
  typesElements.modal.hidden = true;
}

// モーダルを閉じるための操作（閉じるボタン・外側クリック・Escキー）をまとめて設定する
function setupModalCloseHandlers() {
  typesElements.closeModalButton.addEventListener("click", closeTypeDetailModal);

  // モーダルの外側（暗いオーバーレイ部分）をクリックしたときも閉じる
  typesElements.modal.addEventListener("click", (event) => {
    if (event.target === typesElements.modal) {
      closeTypeDetailModal();
    }
  });

  // Escキーでも閉じられるようにする
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !typesElements.modal.hidden) {
      closeTypeDetailModal();
    }
  });
}
