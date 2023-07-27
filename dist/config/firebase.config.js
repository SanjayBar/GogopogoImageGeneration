import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, } from "firebase/storage";
const firebaseConfig = {
    apiKey: "AIzaSyCokp4FSkAk3kulf3H6Fb_WBN5_c4HcEX4",
    authDomain: "mynote-2231-practice.firebaseapp.com",
    projectId: "mynote-2231-practice",
    storageBucket: "mynote-2231-practice.appspot.com",
    messagingSenderId: "630567196662",
    appId: "1:630567196662:web:7cc851dcf261bb7a3c99d7",
};
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
export { storage, ref, uploadBytesResumable, getDownloadURL };
