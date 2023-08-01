import express, { Express, Request, Response } from "express";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import dotenv from "dotenv";
import cors from "cors";
import {
  storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "./config/firebase.config.js";

import prisma from "./lib/prisma.js";

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: "*",
  methods: "GET, POST",
  allowedHeaders: "Content-Type, Authorization",
};
app.use(cors(corsOptions));

// Routes starts here

app.post("/screenshot/order", async (req: Request, res: Response) => {
  try {
    const subDomain = req.body.subDomain;
    const orderId = req.body.id;
    const orderProducts = req.body.orderProducts;
    const puppeteer = require("puppeteer");

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.goto(
      `http://localhost:3000/screen__shot/${subDomain}/orderImageGeneration/${orderId}`
    );

    const totalproducts = orderProducts.length;

    let arr: any = [];
    const data = await Promise.all(
      orderProducts.map(async (item: any) => {
        const selector = `#variantId${item.storeVariantId}`;

        await page.waitForSelector(selector);

        const element = await page.$(selector);

        const screenshot = await element.screenshot();

        if (screenshot) {
          const buffer = Buffer.from(screenshot, "base64");

          const storageRef = ref(
            storage,
            `orderImages/orderId:${orderId}/variant${item.storeVariantId}`
          );

          const uploadTask = uploadBytesResumable(storageRef, buffer, {
            contentType: "image/png",
          });

          uploadTask.on(
            "state_changed",
            null,
            (error) => {
              console.log("error", error);
            },
            () => {
              getDownloadURL(uploadTask.snapshot.ref).then(async (URL) => {
                arr.push(URL);
                if (arr.length === totalproducts) {
                  const promiseData = orderProducts.map((el: any) => {
                    const imgurl = arr.find((url: string) =>
                      url.includes(`variant${el.storeVariantId}`)
                    );
                    if (imgurl) {
                      return prisma.orderProducts.update({
                        where: {
                          storeVariantId: el.storeVariantId,
                          id: el.id,
                        },
                        data: {
                          productImage: imgurl,
                        },
                      });
                    } else {
                      throw new Error("Error in generating image");
                    }
                  });
                  const val = await Promise.all(promiseData);
                }
              });
            }
          );
        }
      })
    );

    await browser.close();
    return res.status(201).json("success");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

function createUrl(storeId: string, storeProducts: { id: string }[]) {
  let url = `http://localhost:3000/screen__shot/storeProductImageGeneration?storeId=${storeId}`;

  storeProducts.forEach((product, index) => {
    if (product.id) {
      url += `&storeProductId=${product.id}`;
    }
  });

  return url;
}

app.post("/screenshot/storeProduct", async (req: Request, res: Response) => {
  const storeId = req.body.storeId;
  const storeProducts = req.body.storeProducts;
  const pageUrl = createUrl(storeId, storeProducts);

  const totalProduct = storeProducts.length;
  try {
    const puppeteer = require("puppeteer");

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.goto(pageUrl);

    let arr: any = [];

    await Promise.all(
      storeProducts.map(async (item: any) => {
        const selector = `#productId${item.id}`;

        await page.waitForSelector(selector);

        const element = await page.$(selector);

        const screenshot = await element.screenshot();

        if (screenshot) {
          const buffer = Buffer.from(screenshot, "base64");

          const storageRef = ref(
            storage,
            `storeProductImages/storeId:${storeId}/product${item.id}`
          );

          const uploadTask = uploadBytesResumable(storageRef, buffer, {
            contentType: "image/png",
          });

          uploadTask.on(
            "state_changed",
            null,
            (error) => {
              console.log("error", error);
            },
            () => {
              getDownloadURL(uploadTask.snapshot.ref).then(async (URL) => {
                arr.push(URL);
                if (arr.length === totalProduct) {
                  const promiseData = storeProducts.map((el: any) => {
                    const imgurl = arr.find((url: string) =>
                      url.includes(`product${el.id}`)
                    );
                    if (imgurl) {
                      return prisma.storeProduct.update({
                        where: {
                          storeId: storeId,
                          id: el.id,
                        },
                        data: {
                          generatedImage: imgurl,
                        },
                      });
                    } else {
                      throw new Error("Error in generating image");
                    }
                  });
                  const val = await Promise.all(promiseData);
                }
              });
            }
          );
        }
      })
    );

    await browser.close();
    return res.status(201).json("success");
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
