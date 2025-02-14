import { join } from "path";
import ChatGPT from "./chatgpt/ChatGPT";
import "./initializer";


(async () => {
    const chatgpt = new ChatGPT({
        puppeteer: {
            "userDataDir": join(process.cwd(), ".webdata"),
        }
    });


    chatgpt.on("ready", () => {
        console.log("scraper is ready => user logged in ");
    });

    chatgpt.on("location_change", (d) => {
        console.log(d);
    });

    chatgpt.on("login_page", () => {
        console.log("user will login");
    });

    chatgpt.on("disconnected", () => {
        console.log("user logged out");
    });

    chatgpt.on("initialized", () => {
        console.log("chatgpt scraper initialized");
    });

    chatgpt.on("hide", () => {
        console.log("scraper browser window hidden");
    });

    chatgpt.on("show", () => {
        console.log("scraper browser window show");
    });

    chatgpt.on("initialized", () => {
        console.log("scraper is initialized successfully");
    });

    await chatgpt.initialize();
})();

