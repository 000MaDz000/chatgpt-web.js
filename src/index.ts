import { join } from "path";
import ChatGPT from "./chatgpt/ChatGPT";
import "./initializer";


(async () => {
    const chatgpt = new ChatGPT({
        puppeteer: {
            "userDataDir": join(process.cwd(), ".webdata"),
        }
    });

    await chatgpt.initialize();

    chatgpt.on("ready", () => console.log("user logged in"));
    chatgpt.on("login_page", () => {
        console.log("user will login");
    });

    chatgpt.on("disconnected", () => {
        console.log("user logged out");
    })
    // chatgpt.sendMessage("مرحبا gpt, كيف يمكنك مساعدتي ؟");
})();

