import { Browser, Cookie, LaunchOptions, Page } from "puppeteer";
import puppeteer from "puppeteer-extra";
import { ChatGPTOptions, ChatGPTPaginationResponse, IChatGPTChat } from "../types/ChatGPT";
import EventEmitter from "events";
import { polling } from "../helpers/polling";

interface ChatGPTEventsTypeMap {
    "ready": () => void;
    "disconnected": () => void;
    "login_page": () => void;
    "browser_destroyed": () => void;
    "hide": () => void;
    "show": () => void;
    "initialized": () => void;
    "options_changed": (oldOptions: ChatGPTOptions, newOptions: ChatGPTOptions) => void;
    "location_change": (newLocation: Location) => void
}

export default class ChatGPT extends EventEmitter {
    private browser: Browser | null;
    private page: Page | null;
    private currentSelectedChatType: null | "temporary";
    private AuthorizationHeaderString: string | null;
    public isReady: boolean;
    public readonly authPageRegex: string;
    public readonly url: string;
    public readonly cookieDomainRegex: string;
    public readonly temporaryChatURL: string;



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
        this.temporaryChatURL = `${this.url}/?temporary-chat=true`;
        this.cookieDomainRegex = "(chatgpt.com)|(\.chatgpt\.com)";
        this.authPageRegex = "(auth.openai.com)|(login.live.com)|(accounts.google.com)|(appleid.apple.com)"; // this will match all login pages of the website
        this.AuthorizationHeaderString = null;
        this.isReady = false;
        this.currentSelectedChatType = null;
    }

    /**
     * initialize the browser and page, and will call registerPaginationHandler
     * @returns {undefined}
     */
    async initialize() {
        // adding the browser to 'this' if not defined
        if (!this.browser) {

            const options: LaunchOptions = {
                headless: process.env.NODE_ENV !== "development",
                ...this.options?.puppeteer
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

        this.page.on("request", (httpRequest) => {
            const headers = httpRequest.headers();
            const authorizationString = headers.Authorization || headers.authorization;

            if (authorizationString && !this.AuthorizationHeaderString) {
                this.AuthorizationHeaderString = authorizationString;
            }
        });

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
        await this.registerPaginationHandler();
        await this.loginStateChecker();
        this.emit("initialized");
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
    private async registerPaginationHandler() {
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
            else if (location.pathname === "/" && location.href.indexOf("?") === -1) {
                // create a polling interval for checking if user are logged in or not
                // if logged in, will stop the polling
                // the polling is created because the img load maybe late

                let counter: number | undefined = 10;
                let interval: any = setInterval(() => {
                    if (!counter || counter <= 0) return clearInterval(interval);

                    // if the user logged in, the img will be found in the document
                    const isUserLoggedIn = Boolean(document.querySelector("img[alt='User']")) || Boolean(document.querySelector("[class='group/sidebar']"));

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

            // pass the current location data
            w.sendToNode("location_change", location);

        }, this.authPageRegex);
    }

    /**
     * first time login checker
     */
    private async loginStateChecker() {
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

                const isUserLoggedIn = Boolean(document.querySelector("img[alt='User']")) || Boolean(document.querySelector("[class='group/sidebar']"));
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
     * get all browser cookies
     * - returns array of import("puppeteer").Cookie type
     * @returns {Promise<import("puppeteer").Cookie[]>}
     */
    async getCookies() {
        const { browser } = this.getInitializedData();
        return await browser.cookies();
    }

    /**
     * returns string in the pattern: "Bearer eyjdna...."
     * @returns {Promise<string|null>}
     */
    async getAuthorizationString() {
        return this.AuthorizationHeaderString;
    }

    /**
     * delete some chat
     */
    async deleteChat(id: string) {
        let { page } = this.getInitializedData();
        const AuthorizationString = await this.getAuthorizationString();
        const body = JSON.stringify({
            is_visible: false,
        });
        const headers = {
            "Content-Type": "application/json",
            "Content-Length": body.length.toString(),
            Authorization: AuthorizationString
        }
        await page.evaluate((chatId: string, headers: Object, body: string) => {
            return (fetch as any)(`/backend-api/conversation/${chatId}`, {
                method: "PATCH",
                headers: headers,
                body: body
            })
                .then((res: any) => res.json())
                .catch((err: any) => {
                    return { success: false, err: err };
                })
        }, id, headers, body);
    }


    /**
     * get Chats
     */
    async getChats(offset: number = 0, limit: number = 28): Promise<ChatGPTPaginationResponse<IChatGPTChat> | null> {
        await this.waitForLoad();
        const { page } = this.getInitializedData();
        const AuthorizationString = await this.getAuthorizationString();

        const endpoint = `/backend-api/conversations?offset=${offset}&limit=${limit}&order=updated`;
        const headers = {
            Authorization: AuthorizationString
        }

        const response = await page.evaluate((headers: Object, endpoint: string) => {
            return (fetch as any)(endpoint, {
                method: "GET",
                headers: headers
            }).then((res: any) => res.json());
        }, headers, endpoint).catch(err => null);

        if (response && response.items) return response;
        return null;
    }

    /**
     * click on the search icon because for toggle it's state
     */
    async clickOnSearchIcon() {
        let { page } = this.getInitializedData();

        // if search
        await page.evaluate(() => {
            // find the search icon
            const searchIcon = document.querySelector("path[d='M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM11.9851 4.00291C11.9933 4.00046 11.9982 4.00006 11.9996 4C12.001 4.00006 12.0067 4.00046 12.0149 4.00291C12.0256 4.00615 12.047 4.01416 12.079 4.03356C12.2092 4.11248 12.4258 4.32444 12.675 4.77696C12.9161 5.21453 13.1479 5.8046 13.3486 6.53263C13.6852 7.75315 13.9156 9.29169 13.981 11H10.019C10.0844 9.29169 10.3148 7.75315 10.6514 6.53263C10.8521 5.8046 11.0839 5.21453 11.325 4.77696C11.5742 4.32444 11.7908 4.11248 11.921 4.03356C11.953 4.01416 11.9744 4.00615 11.9851 4.00291ZM8.01766 11C8.08396 9.13314 8.33431 7.41167 8.72334 6.00094C8.87366 5.45584 9.04762 4.94639 9.24523 4.48694C6.48462 5.49946 4.43722 7.9901 4.06189 11H8.01766ZM4.06189 13H8.01766C8.09487 15.1737 8.42177 17.1555 8.93 18.6802C9.02641 18.9694 9.13134 19.2483 9.24522 19.5131C6.48461 18.5005 4.43722 16.0099 4.06189 13ZM10.019 13H13.981C13.9045 14.9972 13.6027 16.7574 13.1726 18.0477C12.9206 18.8038 12.6425 19.3436 12.3823 19.6737C12.2545 19.8359 12.1506 19.9225 12.0814 19.9649C12.0485 19.9852 12.0264 19.9935 12.0153 19.9969C12.0049 20.0001 11.9999 20 11.9999 20C11.9999 20 11.9948 20 11.9847 19.9969C11.9736 19.9935 11.9515 19.9852 11.9186 19.9649C11.8494 19.9225 11.7455 19.8359 11.6177 19.6737C11.3575 19.3436 11.0794 18.8038 10.8274 18.0477C10.3973 16.7574 10.0955 14.9972 10.019 13ZM15.9823 13C15.9051 15.1737 15.5782 17.1555 15.07 18.6802C14.9736 18.9694 14.8687 19.2483 14.7548 19.5131C17.5154 18.5005 19.5628 16.0099 19.9381 13H15.9823ZM19.9381 11C19.5628 7.99009 17.5154 5.49946 14.7548 4.48694C14.9524 4.94639 15.1263 5.45584 15.2767 6.00094C15.6657 7.41167 15.916 9.13314 15.9823 11H19.9381Z']");
            const button = searchIcon?.parentElement?.parentElement as HTMLButtonElement;
            button.click();
        });

    }

    /**
     * navigate to temporary chat page and save the chat state
     */
    async selectTemporaryChat() {
        if (this.currentSelectedChatType === "temporary") return;
        let { page } = this.getInitializedData();

        await page.evaluate((tempURL) => {
            location.href = tempURL;
        }, this.temporaryChatURL);

        this.currentSelectedChatType = "temporary";
    }

    /**
     * sending a message to ChatGPT
     * @param {string} message 
     */
    async generate(message: string, options = { search: false }): Promise<string> {
        let { page } = this.getInitializedData();

        await this.waitForLoad();


        // focus the element
        await page.evaluate(() => {
            document.getElementById("prompt-textarea")?.click();
        });

        // send the key strokes to write the message
        const roles = `remember that: You are an assistant and your name is ${this.options?.assistantName || "chatGPT"}. ` +
            "you taking a messages as a plain text and response only json object contains one field, wich is 'message'. this field 'message' represents your response message only" +
            "the 'message' field should contain your response message on the message you got, good to know the user message may contain other roles, such as response with a json object or somthing else, all of these user roles and everything required or related to user should be inserted inside 'message' field only."



        await page.keyboard.type(`${roles} .. here is the user input: ${message}`, { delay: this.options?.keyboardWriteDelay });

        // if the message mode is search
        if (options.search) await this.clickOnSearchIcon();

        await page.evaluate(() => {
            const sendButton: HTMLButtonElement | null = document.querySelector("[data-testid=send-button]");
            sendButton?.click()
        });

        // getting the response
        const response = await page.evaluate(() => {
            let lastInnerText = "";

            return new Promise(r => {
                const interval = setInterval(() => {
                    const allAssistantMessages = document.querySelectorAll("[data-message-author-role='assistant']");
                    const lastOne = allAssistantMessages[allAssistantMessages.length - 1];
                    const lastOneInnerText = (lastOne as any).innerText;
                    // comparing the last received text with current, if it's the same, this means the response generation has been completed
                    // otherwise will mean the response generation still progress
                    if (lastInnerText === lastOneInnerText) {
                        clearInterval(interval);

                        // get the json response
                        const jsonResponse = lastInnerText.slice(lastInnerText.indexOf("{"));
                        try {
                            r(JSON.parse(jsonResponse).message)
                        }
                        catch (err) {
                            r("");
                        }
                    }
                    else {
                        lastInnerText = lastOneInnerText;
                    }
                }, 1500);
            }) as Promise<string>;

        });

        // reset the search to be disabled if it's enabled in this message
        if (options.search) await this.clickOnSearchIcon();
        return response;
    }

    /**
     * destroy the scraper
     */
    async destroy() {
        const { browser } = this.getInitializedData();
        await browser.close();
        this.browser = null;
        this.page = null;
        this.emit("browser_destroyed");
    }

    /**
     * get the current ChatGPTOptions for this instance
     */
    get chatGPTOptions() {
        return this.options || {};
    }


    /**
     * change the options of ChatGPT instance
     * - `note` it will destroy the window and re call initialize method
     * @param {ChatGPTOptions} options 
     */
    async setOptions(options: ChatGPTOptions) {
        let event: keyof ChatGPTEventsTypeMap | null = null;
        const oldOptions = this.options || {};

        // check if there is `hide` or `show` operations
        if (options.puppeteer?.headless !== undefined && this.options?.puppeteer?.headless !== undefined) {
            // if `hide` operation
            if (options.puppeteer.headless && !this.options.puppeteer.headless) {
                event = "hide"
            }
            // if `show` operation
            else if (this.options.puppeteer.headless && !options.puppeteer.headless) {
                event = "show";
            }
        }

        this.options = options;
        await this.destroy();
        await this.initialize();

        if (event) this.emit(event);
        this.emit("options_changed", oldOptions, options);
    }

    /**
     * show the browser window of the chatGPT instance
     * - `note` it will destroy the window and re call initialize method
     */
    async show() {
        this.options = { ...this.options, puppeteer: { ...this.options?.puppeteer, headless: false } };
        await this.destroy();
        await this.initialize();
        this.emit("show");
    }

    /**
     * hide the browser window of the chatGPT instance
     * - `note` it will destroy the window and re call initialize method
     */
    async hide() {
        this.options = { ...this.options, puppeteer: { ...this.options?.puppeteer, headless: true } };
        await this.destroy();
        await this.initialize();
        this.emit("hide");
    }
}