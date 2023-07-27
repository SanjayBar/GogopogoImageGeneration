import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import {
  storage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "./config/firebase.config.js";

import mysql from "mysql2";
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
const connection = mysql.createConnection(process.env.DATABASE_URL as string);

// Routes starts here

app.get("/", async (req: Request, res: Response) => {
  try {
    const all = await prisma.store.findMany();
    console.log(all);
    return res.status(201).json({ hah: "jja" });
  } catch (error) {
    console.log(error);

    return res.status(201).json({ hah: "jja1" });
  }
});
// app.get("/", async (req: Request, res: Response) => {
//   let status = 200;
//   let retVal = {};

//   try {
//     const query = "SELECT * FROM Orders";
//     const rows = connection.query(query);
//     console.log(rows);
//   } catch (error) {
//     console.error(error);
//     status = 500;
//   } finally {
//     res.status(status).json("retVal");
//   }
// });

app.post("/screenshot", async (req: Request, res: Response) => {
  try {
    const orderId = req.body.id;
    const orderProducts = req.body.orderProducts;
    const puppeteer = require("puppeteer");

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    await page.goto(
      `http://awesome.localhost:3000/orderImageGeneration/${orderId}`
    );

    let arr: any = [];
    const data = await Promise.all(
      orderProducts.map(async (item: any) => {
        let downloadURL = "";
        const selector = `#variantId${item.storeVariantId}`;

        await page.waitForSelector(selector);

        const element = await page.$(selector);

        const screenshot = await element.screenshot();

        const buffer = Buffer.from(screenshot, "base64");

        const storageRef = ref(
          storage,
          `orderImages/variant${item.storeVariantId}`
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
            getDownloadURL(uploadTask.snapshot.ref).then((URL) => {
              arr.push(URL);
              console.log(arr);
            });
          }
        );
        return downloadURL;
      })
    );
    console.log(arr);

    await browser.close();
    return res.status(201).json(data);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// connection.connect((e: any) => {
//   if (e) {
//     console.log("error");
//   } else
//     app.listen(port, () => {
//       console.log(`[server]: Server is running at http://localhost:${port}`);
//     });
//   });
app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
