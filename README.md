
# what is chatgpt-web.js ?

it's a nodejs web scraping library for chatgpt.com website.

this library give you free programmable access to chatgpt.com for automate your tasks.

here, you can **name** your assistant, write a roles, and so on.

  

## installation

run `npm install chatgpt-web.js` for installing the library

  

## example

```
const chatgpt = new ChatGPT({
	assistantName:  "Abbas",
	puppeteer: {
		userDataDir: join(process.cwd(), ".webdata"),
		headless: false,
	},
});

// will be ready if the user logged in
chatgpt.on("ready", async () => {
	await chatgpt.selectTemporaryChat();
	await chatgpt.hide(); // set headless to true for hide the browser window
	const response = await chatgpt.generate("hello, who are you and what you want ?");
	console.log(response);
});

// will initialize the scraper and open the browser window
// you can hide or show the browser window anytime using 'chatgpt.hide()' and 'chatgpt.show()'
chatgpt.initialize();
```

## events
`ready` => emitted when the user authenticated
`disconnected` => emitted when user logout
`login_page` => emitted when the login page opened or occured
`browser_destroyed` => emitted when `chatgpt.destroy()` called
`hide` => emitted when call `chatgpt.hide()` for hiding the browser
`show` => emitted when call `chatgpt.show()` for show the browser
`initialized` => emitted when the chatgpt scrapper initialized
`options_changed` => emitted when change the options using `chatgpt.setOptions(...)` only
`location_change` => emitted on any navigation on the page


## methods
`on` => will register an event listener.
`emit` => will emit an event.
`initalize` => will initialize the chatgpt scrapper.
`getInitializedData` => will return object contains `page` and `browser` of puppeteer.
`waitForLoad` => will return a promise that's will be full filled. when the input textarea load.
`getCookies` => returns all puppeteer browser cookies.
`getAuthorizationString` => returns a string line 'Bearer xyz...' for authenticate the requests.
`deleteChat` => taking chatId and deleting it
`getChats` => taking `offset` and `limit` for get chats data chunk.
`clickOnSearchIcon` => will click on search icon button for toggle search state.
`selectTemporaryChat` => will navigate the page to temporary chat page.
`generate` => will take a message and options, and return chatgpt response.
`destroy` => destroy the scrapper and close the controlled browser.
`setOptions` => override the scrapper instance options.
`show` => show the controlled browser.
`hide` => will hide the controlled browser.