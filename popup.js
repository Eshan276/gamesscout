// Constants
const CACHE_KEY = "cachedDeals";
const CACHE_TIMESTAMP_KEY = "cacheTimestamp";
const CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
let alink = "";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch(chrome.runtime.getURL("test.json"));
    const data = await response.json();
    alink = data.link;
    clearBadge();
    await fetchAndDisplayDeals();

    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute("href")).scrollIntoView({
          behavior: "smooth",
        });
      });
    });
  } catch (error) {
    console.error("Error fetching and parsing links:", error);
    showErrorMessage("Error fetching links. Please try again later.");
  }
});

function showErrorMessage(message) {
  const linksDiv = document.getElementById("links");
  linksDiv.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--primary-color);">
            <div style="font-size: 1.2em; margin-bottom: 10px;">⚠️</div>
            <div>${message}</div>
        </div>
    `;
}

async function fetchAndDisplayDeals() {
  let links = await getCachedDeals();

  if (!links) {
    const loadingMessage = "Fetching latest deals...";
    showLoadingMessage(loadingMessage);
    links = await fetchFreshDeals();
    cacheDeals(links);
  }

  displayDeals(links);
}

function showLoadingMessage(message) {
  const linksDiv = document.getElementById("links");
  linksDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="loading-spinner"></div>
            <div style="margin-top: 10px;">${message}</div>
        </div>
    `;
}

async function getCachedDeals() {
  const cachedDeals = localStorage.getItem(CACHE_KEY);
  const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

  if (cachedDeals && cacheTimestamp) {
    const currentTime = new Date().getTime();
    if (currentTime - parseInt(cacheTimestamp) < CACHE_DURATION) {
      return JSON.parse(cachedDeals);
    }
  }

  return null;
}

function cacheDeals(deals) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(deals));
  localStorage.setItem(CACHE_TIMESTAMP_KEY, new Date().getTime().toString());
}

async function fetchFreshDeals() {
  const response = await fetch(alink);
  const parser = new DOMParser();
  const doc = parser.parseFromString(await response.text(), "application/xml");

  return Array.from(doc.querySelectorAll("item"))
    .map((item) => {
      const title = item.querySelector("title").textContent;
      const description = item.querySelector("description").textContent;
      const link = item.querySelector("link").textContent;
      const imgMatch = description.match(/<img src="([^"]+)"/);
      const imageUrl = imgMatch ? imgMatch[1] : "";

      return {
        headline: title,
        url: link,
        imageUrl: imageUrl,
      };
    })
    .filter((link) => link.url && link.imageUrl);
}

function displayDeals(links) {
  const linksDiv = document.getElementById("links");
  linksDiv.innerHTML = "";

  if (links.length > 0) {
    links.forEach((link, index) => {
      const linkDiv = createLinkElement(link);
      // Add fade-in animation
      linkDiv.style.opacity = "0";
      linkDiv.style.transform = "translateY(20px)";
      linksDiv.appendChild(linkDiv);

      // Trigger animation with slight delay based on index
      setTimeout(() => {
        linkDiv.style.transition = "opacity 0.5s ease, transform 0.5s ease";
        linkDiv.style.opacity = "1";
        linkDiv.style.transform = "translateY(0)";
      }, index * 100);
    });
  } else {
    showErrorMessage("No deals found at the moment. Please try again later.");
  }
}

// Update only the createLinkElement function in your popup.js
function createLinkElement(link) {
  const linkDiv = document.createElement("div");
  linkDiv.classList.add("link-container");
  const imagecont = document.createElement("div");
  imagecont.classList.add("image-container");
  const image = document.createElement("img");
  image.src = link.imageUrl;
  image.alt = link.headline;
  image.loading = "lazy"; // Add lazy loading

  const linkInfoDiv = document.createElement("div");
  linkInfoDiv.classList.add("linkInfoDiv");

  const headline = document.createElement("div");
  headline.classList.add("link-headline");
  headline.textContent = link.headline;

  const actionsDiv = document.createElement("div");
  actionsDiv.style.display = "flex";
  actionsDiv.style.justifyContent = "center";
  actionsDiv.style.gap = "10px";
  actionsDiv.style.marginTop = "15px";

  const newsButton = document.createElement("a");
  newsButton.href = link.url;
  newsButton.textContent = "News";
  newsButton.target = "_blank";

  const dealButton = document.createElement("button");
  dealButton.textContent = "Go To Deal";
  dealButton.addEventListener("click", async (e) => {
    const button = e.target;
    button.classList.add("loading-button");
    button.textContent = "Loading...";
    button.disabled = true;

    try {
      await goToDeal(link.url);
    } finally {
      button.classList.remove("loading-button");
      button.textContent = "Go To Deal";
      button.disabled = false;
    }
  });

  actionsDiv.appendChild(newsButton);
  actionsDiv.appendChild(dealButton);
  linkInfoDiv.appendChild(headline);
  linkInfoDiv.appendChild(actionsDiv);
  // linkDiv.appendChild(image);
  imagecont.appendChild(image);
  linkDiv.appendChild(imagecont);
  linkDiv.appendChild(linkInfoDiv);

  return linkDiv;
}
document.getElementById("page-title").onclick = function () {
  window.open("https://github.com/Eshan276", "_blank");
};
async function goToDeal(url) {
  try {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");

    const dealLink = doc.evaluate(
      '//a[contains(text(), "Go To Deal")]',
      doc,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue;

    let dealUrl = dealLink ? dealLink.href : "";
    if (dealUrl && !dealUrl.startsWith("http")) {
      dealUrl = `https://gg.deals${"/us" + dealUrl.split("/us")[1]}`;
    }
    if (dealUrl) {
      window.open(dealUrl, "_blank");
    } else {
      window.open(url, "_blank");
    }
  } catch (error) {
    console.error("Error fetching deal URL:", error);
    showErrorMessage("Unable to fetch deal. Please try again.");
  }
}

function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}

// Set up periodic cache cleanup
setInterval(() => {
  const cacheTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (cacheTimestamp) {
    const currentTime = new Date().getTime();
    if (currentTime - parseInt(cacheTimestamp) >= CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    }
  }
}, CACHE_DURATION);
