import { join } from "path";
import { ChatGPT } from "./index";

(async () => {
    const chatgpt = new ChatGPT({
        assistantName: "Abbas",
        puppeteer: {
            "userDataDir": join(process.cwd(), ".webdata"),
            headless: false,
        },
    });


    chatgpt.on("ready", async () => {
        console.log("scraper is ready => user logged in ");
        await chatgpt.selectTemporaryChat();
        const response = await chatgpt.generate("hello, who are you and what you want ?");
        console.log(response);
    });

    chatgpt.on("location_change", (d) => {
        console.log("there is navigation");
        console.log(d);
    });

    chatgpt.on("login_page", () => {
        console.log("navigated to login page");
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

    await chatgpt.initialize();
})();

