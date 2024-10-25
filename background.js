// Function to fetch games from GG Deals
async function fetchGames() {
  try {
    const response = await fetch(
      "https://gg.deals/news/feed/?availability=1&type=6&utm_source=eshan"
    );
    const text = await response.text();
    console.log("Fetched HTML content:", text);

    // Find the first <item></item> tag
    const itemMatch = text.match(/<item>([\s\S]*?)<\/item>/);
    let title = "No title found";
    let date = "No date found";

    if (itemMatch) {
      const item = itemMatch[0];
      //console.log("First Item:", item);

      // Extract title and pubDate
      const titleMatch = item.match(/<title>(.*?)<\/title>/);
      const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);

      if (titleMatch) {
        title = titleMatch[1];
      }

      if (pubDateMatch) {
        date = pubDateMatch[1];
      }

      //console.log("First Item:");
      //console.log(`Title: ${title}`);
      //console.log(`Date: ${date}`);
    } else {
      //console.log("No <item></item> tags found.");
    }

    // const parser = new DOMParser();
    // const doc = parser.parseFromString(text, "text/html");

    let newGames = [{ title, date }];
    //console.log("New Games:", newGames);

    // doc.querySelectorAll("article").forEach((article) => {
    //   if (article.classList.contains("active")) {
    //     const link = article.querySelector("a.full-link");
    //     const image = article.querySelector("img");

    //     if (link && image) {
    //       newGames.push({
    //         headline: link.textContent.trim(),
    //         url: "https://gg.deals" + link.getAttribute("href"),
    //         imageUrl: image.src,
    //       });
    //     }
    //   }
    // });

    return newGames;
  } catch (error) {
    console.error("Error fetching games:", error);
    return [];
  }
}

// Function to set badge with red dot
function setBadge() {
  //console.log("setting badge2");
  chrome.action.setBadgeText({ text: "•" });
  chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
}

// Function to clear the badge
function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}

// Function to check for new games and update storage
async function checkForNewGames(flag) {
  //console.log("Checking for new games...");
  //console.log("flag", flag);
  // if (flag == 0) {
  //   await setBadge();
  //   return;
  // } else if (flag == 1) {
  //   console.log("setting badge");
  //   await setBadge();
  //   console.log("setting badge done");
  //   return;
  // }
  // console.log("flag", flag);

  // if (flag === 0 || flag === 1) {
  //   console.log("Setting badge due to flag:", flag);
  //   //clearBadge();
  //   setBadge();
  //   return;
  // }
  const newGames = await fetchGames();
  if (newGames.length === 0) return;

  const latestGame = newGames[0];
  //console.log("latestGame", latestGame);
  chrome.storage.local.get("lastGame", (result) => {
    const storedGame = result.lastGame;
    //console.log("storedGame", storedGame);
    //console.log("checking if game is present");
    if (!storedGame || storedGame.title !== latestGame.title) {
      //console.log("setting badge");
      setBadge();
      chrome.storage.local.set({ lastGame: latestGame });
    } else {
      //console.log("game already present");
    }
  });
}

// Setup alarm to check every 2 hours
chrome.alarms.create("checkForNewGames", { periodInMinutes: 120 });

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  //console.log("Alarm triggered:", alarm);
  if (alarm.name === "checkForNewGames") {
    checkForNewGames(1);
  }
});

// Initial check when extension is installed or reloaded
chrome.runtime.onInstalled.addListener(() => {
  checkForNewGames(1);
  //clearBadge(); // Clear badge when the extension is first installed/reloaded
});

// Check for new games on Chrome startup
chrome.runtime.onStartup.addListener(() => {
  checkForNewGames(0);
});

// Listener for action icon click to execute content script
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});
