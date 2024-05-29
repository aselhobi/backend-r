const express = require("express");
const puppeteer = require("puppeteer");
const bodyParser = require("body-parser");
const cors = require("cors"); 
const app = express();
const port = 3001;



const blockResourceType = [
  "beacon",
  "csp_report",
  "font",
  "imageset",
  "media",
  "object",
  "texttrack",
];
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
app.use(cors()); 
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
      "Cookie acceptance dialog did not appear for HM, continuing..."
    );
  }

  await page.waitForSelector(".CGae.mYRh.__5DXf.dYW2.ZoKU", { timeout: 3000 });

  await page.click(".CGae.mYRh.__5DXf.dYW2.ZoKU");
  const inputFields = await page.$$("input.psxM.XAI6");
  await inputFields[1].type(searchQuery);
  await page.keyboard.press("Enter");
  //await page.waitForSelector('input[value="ladies_all"]', {timeout: 5000});
  //await page.click('input[value="ladies_all"]');
  await page.waitForSelector(".cd8a58.d458b9");

  await page.evaluate(async () => {
    const distance = 300; // distance to scroll
    const delay = 200; // delay in milliseconds
    const numScrolls = 3; // number of times to scroll

    for (let i = 0; i < numScrolls; i++) {
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

async function scrapeZaraNew(searchQuery) {
  const browser = await createBrowser();
  const page = await browser.newPage();
  await configurePage(page);

  await page.goto("https://www.zara.com/hu/en/search", {
    waitUntil: "domcontentloaded",
  });

  async function acceptCookies() {
    try {
      await page.waitForSelector("#onetrust-accept-btn-handler", {
        timeout: 1500,
      });
      await page.click("#onetrust-accept-btn-handler");
    } catch (error) {
      // Cookie dialog did not appear
    }
  }

  // Initial attempt to accept cookies
  await acceptCookies();

  // Perform the search

  await page.waitForSelector("#search-products-form-combo-input",{timeout: 3000});
  await page.click("#search-products-form-combo-input");

  // Type search query while checking for cookie dialog
  for (let i = 0; i < searchQuery.length; i++) {
    await page.type("#search-products-form-combo-input", searchQuery[i]);
    await acceptCookies(); // Check and accept cookies while typing
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay to mimic natural typing
  }

  await page.keyboard.press("Enter");

  try {
    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 4000 });
  } catch (error) {
    console.log("Navigation did not occur, proceeding with scraping...");
  }

  // Check for cookie dialog again after typing
  await acceptCookies();

  //for women section only display
  //await page.waitForSelector(".search-products-sections-bar__section-button");
  //await page.click(".search-products-sections-bar__section-button");

  await page.waitForSelector(".media-image__image.media__wrapper--media");
  await page.waitForSelector(".search-products-view__search-results", {timeout: 3000});

  await page.evaluate(async () => {
    const distance = 400; // distance to scroll
    const delay = 200; // delay in milliseconds
    const numScrolls = 3; // number of times to scroll

    for (let i = 0; i < numScrolls; i++) {
        document.scrollingElement.scrollBy(0, distance);
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
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
      timeout: 2000,
    });
    await page.click("#onetrust-accept-btn-handler");
  } catch (error) {
    console.error("Cookie acceptance dialog did not appear for Zara, continuing...");
  }

  // Perform the search
  await page.waitForSelector("#search-products-form-combo-input");
  await page.click("#search-products-form-combo-input");
  await page.type("#search-products-form-combo-input", searchQuery);
  //await page.screenshot({ path: './screenshotZara.png', fullPage: true });
  await new Promise(resolve => setTimeout(resolve, 500)); // wait for half a second to ensure typing is complete
  await page.keyboard.press("Enter");
  await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 4000});
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
// async function scrapeStradivarius(searchQuery) {
//   const browser = await createBrowser();
//   const page = await browser.newPage();
//   await configurePage(page);

//   await page.goto("https://www.stradivarius.com/hu/en/", {
//     waitUntil: "domcontentloaded",
//   });

//   try {
//     await page.waitForSelector("#onetrust-accept-btn-handler", {
//       timeout: 1500,
//     });
//     await page.click("#onetrust-accept-btn-handler");
//     console.log(
//       "Cookie acceptance dialog didappear for Stradivarius, clicked..."
//     );
//   } catch (error) {
//     console.error(
//       "Cookie acceptance dialog did not appear for Stradivarius, continuing..."
//     );
//   }

//   try {
//     await page.waitForSelector("#searchContainerHome", { timeout: 3000 });
//     console.log("Button is visible on the page - Stra.");
//   } catch (error) {
//     console.log("Button is not visible on the page - Stra.");
//   }
//   await page.click("#searchContainerHome");
//   console.log("Clicked on search button - Stra");
//   //await page.waitForNavigation({ waitUntil: "domcontentloaded"});

//   try {
//     await page.waitForNavigation({ timeout: 3000 });
//   } catch (error) {
//     console.log("waiting for navigation");
//   }

//   await page.click("#searchContainerHome");

//   //await page.screenshot({ path: './screenshot.png', fullPage: true });

//   await page.waitForSelector("#colbenson-search-input", { timeout: 3000});
//   await page.type("#colbenson-search-input", searchQuery);
//   await page.keyboard.press("Enter");

//   await page.waitForSelector(
//     ".product-grid-item.item-generic-grid.item-position-grid-2",
//     { timeout: 5000 }
//   );
//   await page.waitForSelector(".img-min-responsive", { timeout: 2000 });
//   await page.waitForSelector(".STRPrice.current-price.STRPrice_black", {
//     timeout: 10000,
//   });
//   await page.waitForSelector(".item-colors")


//   await page.evaluate(async () => {
//     const distance = 100; // distance to scroll
//     const delay = 30; // delay in ms

//     while (
//       document.scrollingElement.scrollTop + window.innerHeight <
//       document.scrollingElement.scrollHeight
//     ) {
//       document.scrollingElement.scrollBy(0, distance);
//       await new Promise((resolve) => setTimeout(resolve, delay));
//     }
//   });
//   const products = await page.evaluate(() => {
//     return Array.from(
//       document.querySelectorAll(
//         ".product-grid-item.item-generic-grid.item-position-grid-2"
//       )
//     )
//       .slice(0, 10)
//       .map((element) => {
//         const linkElement = element.querySelector("#hrefRedirectProduct");
//         const imageElement = element.querySelector(".img-min-responsive");

//         let priceElement = element.querySelector(
//           ".STRPrice.current-price.STRPrice_black"
//         );
//         if (!priceElement) {
//           priceElement = element.querySelector(
//             ".STRPrice.current-price.STRPrice_red"
//           );
//           if (!priceElement) {
//             priceElement = element.querySelector(".STRPrice");
//           }
//         }

//         const imageUrl = imageElement
//           ? imageElement.dataset.src || imageElement.src
//           : null;

//           const colorOptions = Array.from(
//             element.querySelectorAll('.item-colors img')
//           ).map(imgElement => imgElement.getAttribute('alt'));

//         return {
//           url: linkElement ? linkElement.href : null,
//           imageUrl: imageUrl,
//           name: imageElement ? imageElement.alt : null,
//           price: priceElement ? priceElement.innerText : "could not load",
//           shop: "Stradivarius",
//           colorOptions: colorOptions ? colorOptions : null,
//         };
//       });
//   });

//   await browser.close();
//   return products;
// }

async function scrapeStradivarius(searchQuery) {
  const browser = await createBrowser();
  const page = await browser.newPage();
  await configurePage(page);

  await page.goto("https://www.stradivarius.com/hu/en/", {
    waitUntil: "domcontentloaded",
  });

  async function acceptCookies() {
    try {
      await page.waitForSelector("button#onetrust-accept-btn-handler", {
        timeout: 3000,
      });
      await page.click("button#onetrust-accept-btn-handler");
      console.log("Cookie acceptance dialog appeared for Stradivarius, clicked...");
    } catch (error) {
      console.log("Cookie acceptance dialog did not appear for Stradivarius, continuing...");
    }
  }

  function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time);
    });
  }

  // Initial attempt to accept cookies
  await acceptCookies();

  async function clickSearchButton() {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.waitForSelector("#searchContainerHome", { timeout: 3000 });
        await page.click("#searchContainerHome");
        console.log("Clicked on search button - Stradivarius");

        // Check if the search input appears after the click
        await page.waitForSelector("#colbenson-search-input", { timeout: 3000 });
        return true;
      } catch (error) {
        console.log(`Attempt ${attempt + 1} to click search button failed, retrying...`);
        await page.reload({ waitUntil: "domcontentloaded" });
        await acceptCookies();
      }
    }
    return false;
  }

  // Attempt to click the search button
  const searchButtonClicked = await clickSearchButton();
  if (!searchButtonClicked) {
    throw new Error("Failed to click search button after multiple attempts");
  }

  const searchInputSelector = "#colbenson-search-input";
  await page.focus(searchInputSelector);
  
  // Add a delay before typing
  await delay(1000);  // Delay for 1 second

  await page.type(searchInputSelector, searchQuery, { delay: 50 });


  // Add a delay after typing
  await delay(500);  // Delay for half a second

  await page.keyboard.press("Enter");

  // Wait for search results to load
  try {
    await page.waitForSelector(".product-grid-item.item-generic-grid.item-position-grid-2", { timeout: 10000 });
  } catch (error) {
    console.log("Search results did not load properly.");
  }

  // Scroll through the page to load more products if necessary
  await page.evaluate(async () => {
    const distance = 200; // distance to scroll
    const delay = 200; // delay in ms

    while (document.scrollingElement.scrollTop + window.innerHeight < document.scrollingElement.scrollHeight) {
      document.scrollingElement.scrollBy(0, distance);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  });

  const products = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll(".product-grid-item.item-generic-grid.item-position-grid-2")
    )
      .slice(0, 10)
      .map((element) => {
        const linkElement = element.querySelector("#hrefRedirectProduct");
        const imageElement = element.querySelector(".img-min-responsive");

        let priceElement = element.querySelector(".STRPrice.current-price.STRPrice_black");
        if (!priceElement) {
          priceElement = element.querySelector(".STRPrice.current-price.STRPrice_red");
          if (!priceElement) {
            priceElement = element.querySelector(".STRPrice");
          }
        }

        const imageUrl = imageElement ? imageElement.dataset.src || imageElement.src : null;

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


async function scrapeData(searchQuery) {
  try {
    const [zaraProducts, hmProducts, stradivariusProducts] =
      await Promise.all([

        scrapeZaraNew(searchQuery).catch((error) =>{
          console.error("Failed to scrape Zara:", error.message);
          return [];
        }
        ),
        scrapeHM(searchQuery).catch ((error) => {
          console.error("Failed to scrape HM:", error.message);
          return [];
        }),
        scrapeStradivarius(searchQuery).catch((error) => {
          console.error("Failed to scrape Stradivarius:", error.message);
          return [];
        }),

      ]);
    const products = [ ...zaraProducts,...hmProducts, ...stradivariusProducts];
    //const products = await scrapeNike(searchQuery);
    //console.log(products);

    console.log("successful scraping");
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
