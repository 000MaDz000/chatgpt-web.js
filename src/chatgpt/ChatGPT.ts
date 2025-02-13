import { Browser, LaunchOptions, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import { ChatGPTOptions } from "../types/ChatGPT";
import EventEmitter from "events";
import { polling } from "../helpers/polling";

interface ChatGPTEventsTypeMap {
    "ready": () => void;
    "disconnected": () => void;
    "login_page": () => void;
    "browser_destroyed": () => void;
}

export default class ChatGPT extends EventEmitter {
    private browser: Browser | null;
    private page: Page | null;
    private url: string;
    private authPageRegex: string;
    public isReady: boolean;

    /**
     * ChatGPT scrapper events 'on' method
     */
    on<K extends keyof ChatGPTEventsTypeMap>(event: K, listener: ChatGPTEventsTypeMap[K]): this {
        return super.on(event as string, listener);
    }


    /**
     * ChatGPT scrapper events 'emit' method
     */
    emit<K extends keyof ChatGPTEventsTypeMap>(event: K, ...args: Parameters<ChatGPTEventsTypeMap[K]>): boolean {
        return super.emit(event as string, ...args);
    }

    /**
     * options.puppeteer are puppeteer launchOptions
     */
    constructor(private options?: ChatGPTOptions) {
        super();
        this.browser = null;
        this.page = null;
        this.url = "https://chatgpt.com";
        this.authPageRegex = "(auth.openai.com)|(login.live.com)|(accounts.google.com)|(appleid.apple.com)"; // this will match all login pages of the website
        this.isReady = false;
    }

    /**
     * initialize the browser and page, and will call registerPaginationHandler
     * @returns {undefined}
     */
    async initialize() {
        // adding the browser to 'this' if not defined
        if (!this.browser) {

            const options: LaunchOptions = {
                headless: process.env.NODE_ENV !== "development"
            };

            if (this.options?.puppeteer) {
                Object.assign(options, this.options.puppeteer);
            }

            this.browser = await puppeteer.launch(options);
        }

        // adding the page to 'this' if not defined
        if (!this.page) {
            this.page = await this.browser.newPage();
            this.page.goto(this.url);
        }

        // exposing a function for send data from the browser injected code to the application
        await this.page.exposeFunction("sendToNode", (event: keyof ChatGPTEventsTypeMap, ...args: any) => {
            switch (event) {
                case "ready":
                    this.isReady = true;
                    break;

                case "login_page":
                    if (this.isReady) {
                        this.isReady = false;
                        this.emit("disconnected");
                    }

                    break;
            }

            this.emit(event as any, ...args);
        });

        // register the navigation handlers
        this.registerPaginationHandler();
        this.loginStateChecker();
    }

    /**
     * this function will check if the this.initialize() are called
     * then will decide if shoud throw an error or return the page and browser
     * @returns {{
     *  browser: Browser,
     *  page: Page
     * }}
     */
    private getInitializedData() {
        if (!this.browser) throw new Error("the instance is not initialized, did you call 'chatgpt.initialize()' ?");
        if (!this.page) throw new Error("the instance is not initialized, did you call 'chatgpt.initialize()' ?");
        return {
            browser: this.browser,
            page: this.page,
        };
    }

    /**
     * Register Pagination Handler for emit events
     */
    async registerPaginationHandler() {
        const { page } = this.getInitializedData();

        // register page navigation handler
        page.evaluateOnNewDocument((authPageRegex) => {
            let w = window as any;

            const isLoginPage = location.href.match(
                new RegExp(authPageRegex)
            );


            // if this is login page, send the event login page
            if (Boolean(isLoginPage)) {
                w.sendToNode("login_page");
            }
            else if (location.pathname === "/") {
                // create a polling interval for checking if user are logged in or not
                // if logged in, will stop the polling
                // the polling is created because the img load maybe late

                let counter: number | undefined = 10;
                let interval: any = setInterval(() => {
                    if (!counter || counter <= 0) return clearInterval(interval);

                    // if the user logged in, the img will be found in the document
                    const isUserLoggedIn = Boolean(document.querySelector("img[alt='User']"));

                    // if logged in, will send ready event and stop the polling
                    if (isUserLoggedIn) {
                        w.sendToNode("ready");
                        clearInterval(interval);
                        counter = undefined;
                        return;
                    }

                    counter--;
                }, 1000);
            }


        }, this.authPageRegex);
    }

    /**
     * first time login checker
     */
    async loginStateChecker() {
        const { page } = this.getInitializedData();
        await this.waitForLoad();

        const loginState = await polling(async () => {


            // excuting the javascript checker function
            const isUserLoggedIn = await page.evaluate((authPageRegex: string) => {

                const isLoginPage = Boolean(
                    location.href.match(
                        new RegExp(authPageRegex)
                    )
                );

                if (isLoginPage) {
                    return "login_page";
                }

                const isUserLoggedIn = Boolean(document.querySelector("img[alt='User']"));
                return isUserLoggedIn;
            }, this.authPageRegex);

            // checking the result
            if (isUserLoggedIn === "login_page") {
                return false;
            }
            else if (isUserLoggedIn) {
                return isUserLoggedIn;
            }
            else {
                throw "login state checker failed to know if user logged in"
            }
        }, { retries: 7, delay: 1500, functionName: "login state checker" });

        if (loginState) {
            this.emit("ready");
            this.isReady = true;
        }
        else {
            if (this.isReady) {
                this.isReady = false;
                this.emit("disconnected");
            }
        }
    }

    /**
     * Wait for the prompt textarea for show
     */
    async waitForLoad() {
        const { page } = this.getInitializedData();
        await page.waitForSelector("#prompt-textarea");
    }

    /**
     * sending a message to ChatGPT
     * @param {string} message 
     */
    async sendMessage(message: string) {
        let { page } = this.getInitializedData();

        await this.waitForLoad();

        // focus the element
        await page.evaluate(() => {
            document.getElementById("prompt-textarea")?.click();
        });

        await page.keyboard.type(message, { delay: 100 });
        await page.evaluate(() => {
            const sendButton: HTMLButtonElement | null = document.querySelector("[data-testid=send-button]");
            sendButton?.click()
        });
    }

    /**
     * destroy the scraper
     */
    async destroy() {
        const { browser } = this.getInitializedData();
        await browser.close();
        this.emit("browser_destroyed");
    }
}