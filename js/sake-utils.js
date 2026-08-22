// sake-utils.js
// 「おすすめの日本酒」カード（銘柄→酒蔵名→画像→ボタン）を描画する共通処理。
// result.html（結果画面）・types.html（タイプ詳細モーダル）の両方から利用する。
// データ（sakeRecommendations）はdata.jsで定義されているものをそのまま利用する。

// おすすめの日本酒（1件以上）を一覧として描画する
// result.js・types.jsの両方から共通で呼び出せるよう、描画先の要素を引数で受け取る
function renderSakeRecommendations(listContainer, sakeList) {
  listContainer.innerHTML = "";

  // 複数銘柄ある場合のみ、①②…と番号を振って区別しやすくする
  const showNumber = sakeList.length > 1;

  sakeList.forEach((sake, index) => {
    const item = createSakeRecommendationElement(sake, showNumber ? index + 1 : null);
    listContainer.appendChild(item);
  });

  setupSakeItemFadeInObserver(listContainer);
}

// 銘柄カードが、スクロールして画面内に入ったタイミングで下からフェードインする
function setupSakeItemFadeInObserver(listContainer) {
  const items = listContainer.querySelectorAll(".sake-recommendation-item");

  // Intersection Observer未対応環境や動きを抑えたい設定のユーザーには、最初から全部表示する
  if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, observerInstance) => {
      // 1回のコールバックでまとめて画面内に入ったカード同士だけ、その中の順番で少しずつ遅らせる
      const enteringItems = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target)
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

      enteringItems.forEach((item, indexInBatch) => {
        item.style.transitionDelay = indexInBatch * 150 + "ms";
        item.classList.add("is-visible");
        // 一度表示したカードは監視を止める（スクロールで往復しても再アニメーションしない）
        observerInstance.unobserve(item);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((item) => observer.observe(item));
}

// 1件分のおすすめ日本酒カード（銘柄→酒蔵名→画像→ボタン）のDOM要素を作成する
function createSakeRecommendationElement(sake, number) {
  const item = document.createElement("div");
  item.className = "sake-recommendation-item";

  const brandText = document.createElement("p");
  brandText.className = "sake-brand";
  const brandLabel = number === null ? sake.brandName : CIRCLED_NUMBERS[number] + sake.brandName;
  setPhraseText(brandText, brandLabel);

  const breweryText = document.createElement("p");
  breweryText.className = "sake-brewery";
  setPhraseText(breweryText, sake.breweryName + "（" + sake.prefecture + "）");

  const imageFrame = document.createElement("div");
  imageFrame.className = "sake-image-frame";

  const image = document.createElement("img");
  image.className = "sake-image";
  image.src = sake.imageUrl;
  image.alt = sake.brandName;
  imageFrame.appendChild(image);

  item.appendChild(brandText);
  item.appendChild(breweryText);
  item.appendChild(imageFrame);

  const buttons = createSakeLinkButtons(sake);
  if (buttons) {
    item.appendChild(buttons);
  }

  return item;
}

// 「ホームページ」「購入はこちらから」ボタンをまとめた要素を作成する
// URLが未定（null）のボタンは表示しない。どちらのURLも無ければnullを返す
function createSakeLinkButtons(sake) {
  if (!sake.homepageUrl && !sake.purchaseUrl) {
    return null;
  }

  const buttons = document.createElement("div");
  buttons.className = "sake-buttons";

  if (sake.homepageUrl) {
    buttons.appendChild(createSakeLinkButton(sake.homepageUrl, "ホームページ", "sake-link-button-homepage"));
  }

  if (sake.purchaseUrl) {
    buttons.appendChild(createSakeLinkButton(sake.purchaseUrl, "購入はこちらから", "sake-link-button-purchase"));
  }

  return buttons;
}

// 外部サイトへのリンクボタン（新しいタブで開く）を1つ作成する
function createSakeLinkButton(url, label, modifierClassName) {
  const link = document.createElement("a");
  link.className = "sake-link-button " + modifierClassName;
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  setPhraseText(link, label);
  link.appendChild(createExternalLinkIcon());
  return link;
}

// 「新しいタブで開く」ことを示す外部リンクアイコン（文字色に合わせて表示されるようcurrentColorを使う）
function createExternalLinkIcon() {
  const svgNs = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(svgNs, "svg");
  icon.setAttribute("class", "sake-link-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "2.5");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  icon.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(svgNs, "path");
  path.setAttribute("d", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6");
  icon.appendChild(path);

  const polyline = document.createElementNS(svgNs, "polyline");
  polyline.setAttribute("points", "15 3 21 3 21 9");
  icon.appendChild(polyline);

  const line = document.createElementNS(svgNs, "line");
  line.setAttribute("x1", "10");
  line.setAttribute("y1", "14");
  line.setAttribute("x2", "21");
  line.setAttribute("y2", "3");
  icon.appendChild(line);

  return icon;
}
