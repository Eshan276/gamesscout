(async function () {
  try {
    const response = await fetch("https://gg.deals/news/freebies/");
    const text = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/html");
    console.log(doc);
    let links = [];
    doc.querySelectorAll("a.full-link").forEach((link) => {
      links.push({
        headline: link.textContent.trim(),
        url: link.href,
      });
    });

    // Store the links in chrome storage
    chrome.storage.local.set({ links });
  } catch (error) {
    console.error("Error fetching and parsing links:", error);
  }
})();
