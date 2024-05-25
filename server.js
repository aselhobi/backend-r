const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const cors = require("cors"); // Import the cors middleware
const app = express();
const port = 3001;
//const MutationObserver = require('mutation-observer'); // Import from the library



const blockResourceType = [
  "beacon",
  "csp_report",
  "font",
  "imageset",
  "media",
  "object",
  "texttrack",
];
// we can also block by domains, like google-analytics etc.
const blockResourceName = [
  "adition",
  "adzerk",
  "analytics",
  "cdn.api.twitter",
  "clicksor",
  "clicktale",
  "doubleclick",
  "exelator",
  "facebook",
  "fontawesome",
  "google",
  "google-analytics",
  "googletagmanager",
  "mixpanel",
  "optimizely",
  "quantserve",
  "sharethrough",
  "tiqcdn",
  "zedo",
];

app.use(bodyParser.json()); // for parsing application/json
app.use(cors()); // Use cors middleware to allow all origins. Adjust this as needed for your specific requirements.

async function createBrowser() {
  return puppeteer.launch({
    headless: true, // Set to true for headless mode
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}
async function waitForDocumentLoaded(page) {
  while (page.evaluate(() => document.readyState !== 'interactive')) {
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}
async function configurePage(page) {
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36"
  );

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    const requestUrl = request.url().split("?")[0];
    if (
      blockResourceType.includes(request.resourceType()) ||
      blockResourceName.some((resource) => requestUrl.includes(resource))
    ) {
      request.abort();
    } else {
      request.continue();
    }
  });
}
async function scrapeHMSale() {
  const browser = await createBrowser();
  const page = await browser.newPage();
  await configurePage(page);
  await page.goto("https://www2.hm.com/en_gb/sale/ladies/view-all.html", {
    waitUntil: "domcontentloaded",
  });

  try {
    await page.waitForSelector("#onetrust-accept-btn-handler", {
      timeout: 3000,
    });
    await page.click("#onetrust-accept-btn-handler");
  } catch (error) {
    console.error(
      "Cookie acceptance dialog did not appear for Bershka, continuing..."
    );
  }

  // await page.waitForSelector(".CGae.mYRh.__5DXf.dYW2.ZoKU", { timeout: 3000 });

  // await page.click(".CGae.mYRh.__5DXf.dYW2.ZoKU");
  // // await page.type('input.psxM.XAI6', searchQuery);
  // const inputFields = await page.$$("input.psxM.XAI6");
  // await inputFields[1].type(searchQuery);

  // //await page.screenshot({ path: './screenshot.png', fullPage: true });
  // await page.keyboard.press("Enter");
  // await page.waitForSelector(".cd8a58.d458b9");

  await page.evaluate(async () => {
    const distance = 70; // distance to scroll
    const delay = 50; // delay in ms

    while (
      document.scrollingElement.scrollTop + window.innerHeight <
      document.scrollingElement.scrollHeight
    ) {
      document.scrollingElement.scrollBy(0, distance);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  });
  products = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".f0cf84"))
      .slice(0, 10)
      .map((element) => {
        const linkElement = element.querySelector(".db7c79");
        const imageElement = element.querySelector("img");
        return {
          url: linkElement ? linkElement.href : null,
          imageUrl: imageElement ? imageElement.src : null,
          name: imageElement ? imageElement.alt : null,
          price: element.querySelector(".aeecde.ac3d9e.b19650")
            ? element.querySelector(".aeecde.ac3d9e.b19650").innerText
            : null,
          shop: "H&M",
        };
      });
  });
  await browser.close();
  return products;
}
/////////////////////HM/////////////////////////////////////////////////////////////////////
async function scrapeHM(searchQuery) {
  const browser = await createBrowser();
  const page = await browser.newPage();
  await configurePage(page);
  await page.goto("https://www2.hm.com/en_gb/index.html", {
    waitUntil: "domcontentloaded",
  });

  try {
    await page.waitForSelector("#onetrust-accept-btn-handler", {
      timeout: 3000,
    });
    await page.click("#onetrust-accept-btn-handler");
  } catch (error) {
    console.error(
      "Cookie acceptance dialog did not appear for Bershka, continuing..."
    );
  }

  await page.waitForSelector(".CGae.mYRh.__5DXf.dYW2.ZoKU", { timeout: 3000 });

  await page.click(".CGae.mYRh.__5DXf.dYW2.ZoKU");
  // await page.type('input.psxM.XAI6', searchQuery);
  const inputFields = await page.$$("input.psxM.XAI6");
  await inputFields[1].type(searchQuery);

  //await page.screenshot({ path: './screenshot.png', fullPage: true });
  await page.keyboard.press("Enter");
  await page.waitForSelector('input[value="ladies_all"]');
  await page.click('input[value="ladies_all"]');
  await page.waitForSelector(".cd8a58.d458b9");

  await page.evaluate(async () => {
    const distance = 70; // distance to scroll
    const delay = 50; // delay in ms

    while (
      document.scrollingElement.scrollTop + window.innerHeight <
      document.scrollingElement.scrollHeight
    ) {
      document.scrollingElement.scrollBy(0, distance);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  });
  products = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".f0cf84"))
      .slice(0, 10)
      .map((element) => {
        const linkElement = element.querySelector(".db7c79");
        const imageElement = element.querySelector("img");
        const nameElement = element.querySelector('.d1cd7b.a09145.e07e0d.a04ae4')

        return {
          url: linkElement ? linkElement.href : null,
          imageUrl: imageElement ? imageElement.src : null,
          name: nameElement ? nameElement.innerText : null,
          
          price: element.querySelector(".aeecde.ac3d9e.b19650")
            ? element.querySelector(".aeecde.ac3d9e.b19650").innerText
            : null,
          shop: "H&M",
          colorOptions: imageElement ? imageElement.alt : null,
        };
      });
  });
  await browser.close();
  return products;
}

/////////////////////ZARA/////////////////////////////////////////////////////////////////////////
async function scrapeZara(searchQuery) {
  const browser = await createBrowser();
  const page = await browser.newPage();
  await configurePage(page);

  await page.goto("https://www.zara.com/hu/en/search", {
    waitUntil: "domcontentloaded",
  });

  try {
    await page.waitForSelector("#onetrust-accept-btn-handler", {
      timeout: 3000,
    });
    await page.click("#onetrust-accept-btn-handler");
  } catch (error) {
    console.error("Cookie acceptance dialog did not appear, continuing...");
  }

  // Perform the search
  await page.waitForSelector("#search-products-form-combo-input");
  await page.click("#search-products-form-combo-input");
  await page.type("#search-products-form-combo-input", searchQuery);
  await page.keyboard.press("Enter");
  await page.waitForNavigation({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".search-products-sections-bar__section-button");
  await page.click(".search-products-sections-bar__section-button");

  await page.waitForSelector(".media-image__image.media__wrapper--media");
  await page.waitForSelector(".search-products-view__search-results");

  await page.evaluate(() => {
    window.scrollBy(0, window.innerHeight);
  });

  // Scrape the product details
  const products = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".product-grid-product"))
      .slice(0, 10)
      .map((element) => {
        const linkElement = element.querySelector(".product-link");
        const imageElement = element.querySelector(
          ".media-image__image.media__wrapper--media"
        );
        const captionElement = element.querySelector("h2");
        return {
          url: linkElement ? linkElement.href : null,
          imageUrl: imageElement
            ? imageElement.src.replace(/w=\d+/, "w=660")
            : null,
          name: captionElement ? captionElement.innerText : null,
          price: element.querySelector(".price__amount")
            ? element.querySelector(".price__amount").innerText
            : null,
          shop: "Zara",
          colorOptions: imageElement ? imageElement.alt : null,

        };
      });
  });
  await browser.close();
  return products;
}

////////////////////STRADIVARIUS/////
async function scrapeStradivarius(searchQuery) {
  const browser = await createBrowser();
  const page = await browser.newPage();
  await configurePage(page);

  await page.goto("https://www.stradivarius.com/hu/en/", {
    waitUntil: "domcontentloaded",
  });

  try {
    await page.waitForSelector("#onetrust-accept-btn-handler", {
      timeout: 1000,
    });
    await page.click("#onetrust-accept-btn-handler");
    console.log(
      "Cookie acceptance dialog didappear for Stradivarius, clicked..."
    );
  } catch (error) {
    console.error(
      "Cookie acceptance dialog did not appear for Stradivarius, continuing..."
    );
  }

  try {
    await page.waitForSelector("#searchContainerHome", { timeout: 3000 });
    console.log("Button is visible on the page - Stra.");
  } catch (error) {
    console.log("Button is not visible on the page - Stra.");
  }
  await page.click("#searchContainerHome");
  console.log("Clicked on search button - Stra");
  //await page.waitForNavigation({ waitUntil: "domcontentloaded"});

  try {
    await page.waitForNavigation({ timeout: 3000 });
  } catch (error) {
    console.log("waiting for navigation");
  }

  await page.click("#searchContainerHome");

  await page.waitForSelector("#colbenson-search-input");
  await page.type("#colbenson-search-input", searchQuery);
  await page.keyboard.press("Enter");

  await page.waitForSelector(
    ".product-grid-item.item-generic-grid.item-position-grid-2",
    { timeout: 5000 }
  );
  await page.waitForSelector(".img-min-responsive", { timeout: 2000 });
  await page.waitForSelector(".STRPrice.current-price.STRPrice_black", {
    timeout: 10000,
  });
  await page.waitForSelector(".item-colors")


  await page.evaluate(async () => {
    const distance = 100; // distance to scroll
    const delay = 30; // delay in ms

    while (
      document.scrollingElement.scrollTop + window.innerHeight <
      document.scrollingElement.scrollHeight
    ) {
      document.scrollingElement.scrollBy(0, distance);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  });
  const products = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll(
        ".product-grid-item.item-generic-grid.item-position-grid-2"
      )
    )
      .slice(0, 10)
      .map((element) => {
        const linkElement = element.querySelector("#hrefRedirectProduct");
        const imageElement = element.querySelector(".img-min-responsive");

        let priceElement = element.querySelector(
          ".STRPrice.current-price.STRPrice_black"
        );
        if (!priceElement) {
          priceElement = element.querySelector(
            ".STRPrice.current-price.STRPrice_red"
          );
          if (!priceElement) {
            priceElement = element.querySelector(".STRPrice");
          }
        }

        const imageUrl = imageElement
          ? imageElement.dataset.src || imageElement.src
          : null;

          const colorOptions = Array.from(
            element.querySelectorAll('.item-colors img')
          ).map(imgElement => imgElement.getAttribute('alt'));

        return {
          url: linkElement ? linkElement.href : null,
          imageUrl: imageUrl,
          name: imageElement ? imageElement.alt : null,
          price: priceElement ? priceElement.innerText : "could not load",
          shop: "Stradivarius",
          colorOptions: colorOptions ? colorOptions : null,
        };
      });
  });

  await browser.close();
  return products;
}
///////////////////////////////////////////////////////////////////////////////////////
async function scrapeNike(searchQuery) {
  const browser = await createBrowser();
  const page = await browser.newPage();
  await configurePage(page);
   // Use MutationObserver to handle the cookie dialog dynamically
   await page.goto("https://www.nike.com/hu/en/", {
    waitUntil: "domcontentloaded",
  });
   try {
    // Explicitly wait for the cookie dialog
    await page.waitForSelector("button.nds-btn.dialog-actions-accept-btn.css-60b779.ex41m6f0.btn-primary-dark.btn-md");
    await page.click("button.nds-btn.dialog-actions-accept-btn.css-60b779.ex41m6f0.btn-primary-dark.btn-md");
  } catch (error) {
    // If the cookie dialog doesn't appear immediately, set up MutationObserver
    await page.evaluate(() => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              const acceptButton = node.querySelector("button.nds-btn.dialog-actions-accept-btn.css-60b779.ex41m6f0.btn-primary-dark.btn-md");
              if (acceptButton) {
                acceptButton.click();
                observer.disconnect();
              }
            }
          });
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    });
  }




  await page.waitForSelector("#nav-search-icon");
  await page.click("#nav-search-icon");
  await page.waitForSelector("#gn-search-input");

  await page.type("#gn-search-input", searchQuery);
  await page.keyboard.press("Enter");
  await page.waitForNavigation({ waitUntil: "domcontentloaded" });

  await page.waitForSelector(".product-grid__items.css-hvew4t");
  await page.waitForSelector(".product-card__hero-image.css-1fxh5tw");

  products = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll(".product-card.product-grid__card.css-1t0asop")
    )
      .slice(0, 10)
      .map((element) => {
        const linkElement = element.querySelector(
          ".product-card__img-link-overlay"
        );
        const imageElement = element.querySelector(
          ".product-card__hero-image.css-1fxh5tw"
        );

        let priceElement = element.querySelector(
          ".product-price.hu__styling.is--current-price.css-11s12ax"
        );
        if (!priceElement) {
          priceElement = element.querySelector(
            ".product-price.is--current-price.css-1ydfahe"
          );
        }
        return {
          url: linkElement ? linkElement.href : null,
          imageUrl: imageElement ? imageElement.src : null,
          name: imageElement ? imageElement.alt : null,
          //product-price is--current-price css-1ydfahe
          price: priceElement ? priceElement.innerText : null
        };
      });
  });

  await browser.close();
  return products;
}

async function scrapeData(searchQuery) {
  try {
    const [zaraProducts, hmProducts, stradivariusProducts, nikeProducts] =
      await Promise.all([
        scrapeZara(searchQuery),
        scrapeHM(searchQuery),
        scrapeStradivarius(searchQuery),
        //scrapeNike(searchQuery)
      ]);
    const products = [...zaraProducts, ...hmProducts, ...stradivariusProducts];
    //const products = await scrapeNike(searchQuery);
    console.log(products);

    return { success: true, data: products };
  } catch (error) {
    console.error("Scrape failed", error);
    await browser.close();
    throw error;
  }
}

////////////////////////server/////////////////////////////////////////////////////////////////////////

app.post("/scrape", async (req, res) => {
  const { query } = req.body;
  try {
    const result = await scrapeData(query);
    res.json(result);
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
