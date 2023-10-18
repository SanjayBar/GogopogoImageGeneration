var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import express from "express";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import dotenv from "dotenv";
import cors from "cors";
import { storage, ref, uploadBytesResumable, getDownloadURL, } from "./config/firebase.config.js";
import prisma from "./lib/prisma.js";
import { client } from "./lib/sanity.js";
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
app.post("/screenshot/order", async (req, res) => {
    try {
        const subDomain = req.body.subDomain;
        const orderId = req.body.id;
        const orderProducts = req.body.orderProducts;
        const puppeteer = require("puppeteer");
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.goto(`http://localhost:3000/screen__shot/${subDomain}/orderImageGeneration/${orderId}`);
        const totalproducts = orderProducts.length;
        let arr = [];
        const data = await Promise.all(orderProducts.map(async (item) => {
            const selector = `#variantId${item.storeVariantId}`;
            await page.waitForSelector(selector);
            const element = await page.$(selector);
            const screenshot = await element.screenshot();
            if (screenshot) {
                const buffer = Buffer.from(screenshot, "base64");
                const storageRef = ref(storage, `orderImages/orderId:${orderId}/variant${item.storeVariantId}`);
                const uploadTask = uploadBytesResumable(storageRef, buffer, {
                    contentType: "image/png",
                });
                uploadTask.on("state_changed", null, (error) => {
                    console.log("error", error);
                }, () => {
                    getDownloadURL(uploadTask.snapshot.ref).then(async (URL) => {
                        arr.push(URL);
                        if (arr.length === totalproducts) {
                            const promiseData = orderProducts.map((el) => {
                                const imgurl = arr.find((url) => url.includes(`variant${el.storeVariantId}`));
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
                                }
                                else {
                                    throw new Error("Error in generating image");
                                }
                            });
                            const val = await Promise.all(promiseData);
                        }
                    });
                });
            }
        }));
        await browser.close();
        return res.status(201).json("success");
    }
    catch (error) {
        res.status(500).send("Internal Server Error");
    }
});
function createUrl(storeId, storeProducts) {
    let url = `http://localhost:3000/screen__shot/storeProductImageGeneration?storeId=${storeId}`;
    storeProducts.forEach((product, index) => {
        if (product.id) {
            url += `&storeProductId=${product.id}`;
        }
    });
    return url;
}
app.post("/screenshot/storeProduct", async (req, res) => {
    const storeId = req.body.storeId;
    const storeProducts = req.body.storeProducts;
    const pageUrl = createUrl(storeId, storeProducts);
    const totalProduct = storeProducts.length;
    try {
        const puppeteer = require("puppeteer");
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.goto(pageUrl);
        let arr = [];
        await Promise.all(storeProducts.map(async (item) => {
            const selector = `#productId${item.id}`;
            await page.waitForSelector(selector);
            const element = await page.$(selector);
            const screenshot = await element.screenshot();
            if (screenshot) {
                const buffer = Buffer.from(screenshot, "base64");
                const storageRef = ref(storage, `storeProductImages/storeId:${storeId}/product${item.id}`);
                const uploadTask = uploadBytesResumable(storageRef, buffer, {
                    contentType: "image/png",
                });
                uploadTask.on("state_changed", null, (error) => {
                    console.log("error", error);
                }, () => {
                    getDownloadURL(uploadTask.snapshot.ref).then(async (URL) => {
                        arr.push(URL);
                        if (arr.length === totalProduct) {
                            const promiseData = storeProducts.map((el) => {
                                const imgurl = arr.find((url) => url.includes(`product${el.id}`));
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
                                }
                                else {
                                    throw new Error("Error in generating image");
                                }
                            });
                            const val = await Promise.all(promiseData);
                        }
                    });
                });
            }
        }));
        await browser.close();
        return res.status(201).json("success");
    }
    catch (error) {
        res.status(500).send("Internal Server Error");
    }
});
// Generate photo frames
function createUrlParams(obj) {
    const params = Object.entries(obj)
        .map(([key, value]) => `${key}=${value}`)
        .join("&");
    return `?${params}`;
}
app.post("/screenshot/photoframe", async (req, res) => {
    const _a = req.body, { name } = _a, rest = __rest(_a, ["name"]);
    const paramsUrl = createUrlParams(rest);
    const _id = req.body._id;
    console.log(rest);
    const pageUrl = "http://localhost:3001/generator" + `${paramsUrl}`;
    try {
        const puppeteer = require("puppeteer");
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.goto(pageUrl);
        const selector1 = "#FirstImage";
        await page.waitForSelector(selector1);
        const element1 = await page.$(selector1);
        const screenshot1 = element1.screenshot();
        const selector2 = "#SecondImage";
        await page.waitForSelector(selector2);
        const element2 = await page.$(selector2);
        const screenshot2 = element2.screenshot();
        const [ss1, ss2] = await Promise.all([screenshot1, screenshot2]);
        const imageAssetPromise1 = client.assets.upload("image", ss1, {
            filename: `${req.body.photo}-${req.body.frame_1}`,
        });
        const imageAssetPromise2 = client.assets.upload("image", ss2, {
            filename: `${req.body.photo}-${req.body.frame_2}`,
        });
        const [imageAsset1, imageAsset2] = await Promise.all([
            imageAssetPromise1,
            imageAssetPromise2,
        ]);
        await client
            .patch(_id)
            .set({
            images: [
                {
                    _type: "image",
                    alt: name,
                    asset: {
                        _type: "reference",
                        _ref: imageAsset1._id,
                    },
                },
                {
                    _type: "image",
                    alt: name,
                    asset: {
                        _type: "reference",
                        _ref: imageAsset2._id,
                    },
                },
            ],
        })
            .commit({ autoGenerateArrayKeys: true });
        await browser.close();
        return res.status(201).json("success");
    }
    catch (error) {
        res.status(500).send(error);
    }
});
app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
