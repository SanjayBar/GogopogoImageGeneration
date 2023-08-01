import { Router } from "express";
const app = Router();
import { storage, ref, uploadBytesResumable, getDownloadURL, } from "../config/firebase.config.js";
import prisma from "../lib/prisma.js";
app.post("/", async (req, res) => {
    try {
        const subDomain = req.body.subDomain;
        const orderId = req.body.id;
        const orderProducts = req.body.orderProducts;
        const puppeteer = require("puppeteer");
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.goto(`http://${subDomain}.localhost:3000/orderImageGeneration/${orderId}`);
        const totalproducts = orderProducts.length;
        let arr = [];
        const data = await Promise.all(orderProducts.map(async (item) => {
            let downloadURL = "";
            const selector = `#variantId${item.storeVariantId}`;
            await page.waitForSelector(selector);
            const element = await page.$(selector);
            const screenshot = await element.screenshot();
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
            return downloadURL;
        }));
        await browser.close();
        return res.status(201).json("success");
    }
    catch (error) {
        res.status(500).send("Internal Server Error");
    }
});
export default app;
