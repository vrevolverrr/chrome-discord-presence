async function SiteDetails(originUrl, tabId) {
    /**
     * Returns the extra details if any provided by defined parsers by executing scripts in the context of the specific tabs
     * @param {string} originUrl - The origin URL (eg: https://www.youtube.com/watch?v=dwdwa => https://www.youtube.com)
     * @param {number} tabId - The ID of the active tab
     * 
     * @returns {string}
     */

    const genericParser = function(tabId, parserFunction, callbackFunction) {
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: parserFunction
            }, result => {
                const activity = callbackFunction(result[0].result);
                resolve(activity);
            });
        });
    }

    const netflix = function(tabId) {
        const parser = function() {
            const root = document.querySelector(".video-title");

            // If not watching
            if (!root) return null;

            // Return video title
            const parent = root.querySelector("div") || root;
            return parent.querySelector("h4").innerHTML;
        }

        const callback = function(result) {
            if (result)
                return "Watching " + result;
            
            return null;
        }

        return genericParser(tabId, parser, callback);
    }

    const f2movies = function(tabId) {
        const parser = function() {
            const root = document.querySelector(".prebreadcrumb");

            // If not watching
            if (!root) return null;

            // Return video title
            return root.querySelectorAll(li)[2].innerText;
        }

        const callback = function(result) {
            if (result)
                return "Watching " + result;

            return null;
        }

        return genericParser(tabId, parser, callback);
    }

    const github = function(tabId) {
        const parser = function() {
            const root = document.querySelector('a[data-pjax="#js-repo-pjax-container"]');

            // If not looking at repo
            if (!root) return null;

            // Return repo name
            return root.innerHTML;
        }

        const callback = function(result) {
            if (result)
                return "Viewing " + result;
            
            return null;
        }

        return genericParser(tabId, parser, callback);
    }

    const reddit = function(tabId) {
        const parser = function() {
            const pathname = window.location.pathname;

            // Home page of Reddit
            if (pathname == "/") return null;

            const numPaths = pathname.split("").reduce((acc, value) => (value === "/" ? acc + 1 : acc), 0);

            // Home page of subreddit
            if (numPaths == 3) return pathname.substring(0, pathname.length -1);

            // Thread of subreddit
            return document.querySelectorAll('a[data-click-id="subreddit"]')[1].innerText;
        }

        const callback = function(result) {
            if (!result) return null;
            
            return "Viewing " + result;
        }

        return genericParser(tabId, parser, callback);
    }

    const twitch = function(tabId) {
        const parser = function() {
            const root = document.querySelector('h2[data-a-target="stream-title"]');
            
            // Not watching anything
            if (!root) return null;

            return root.innerHTML;
        }

        const callback = function(result) {
            if (!result) return null;

            return "Watching " + result;
        }

        return genericParser(tabId, parser, callback);
    }

    const wikipedia = function(tabId) {
        const parser = function() {
            const root = document.querySelector("#firstHeading");

            // Not viewing article
            if (!root) return null;

            return root.innerHTML.replace(/<[^>]*>/g, '');
        }

        const callback = function(result) {
            if (!result) return null;

            return "Reading " + result;
        }

        return genericParser(tabId, parser, callback);
    }

    const sites = {
        "https://www.netflix.com": netflix,
        "https://www4.f2movies.to": f2movies,
        "https://github.com": github,
        "https://www.reddit.com": reddit,
        "https://www.twitch.tv": twitch,
        "https://en.wikipedia.org": wikipedia
    }

    const parser = sites[originUrl];
    if (parser == undefined) return null;
    
    try {

        return parser(tabId);

    } catch (e) {

        console.error(`Error retrieving details for ${originUrl} @ Tab ${tabId}`);
        console.error(e);
        return null;
    }
}

function RPC() {
    
    // Stores the last updated tab URL to prevent unnecessary update calls
    var activeUrl;

    // Helper functions
    const getOrigin = (url) => new URL(url).origin;
    const getDetails = async (originUrl, tabId) => await SiteDetails(originUrl, tabId);
    const getTitle = async function(originUrl, fallbackTitle) {
        /**
         * Get the name of the active website by fetching the title of the origin page
         * @param {string} originUrl - The origin URL (eg: https://www.youtube.com/watch?v=dwdwa => https://www.youtube.com)
         * @param {string} fallbackTitle - The title to return when unable to fetch title of origin page
         * 
         * @returns {string}
         */
        if (originUrl.startsWith("chrome://")) return;
        try {
            
            const response = await fetch(originUrl);
            const responseText = await response.text();
            const title = new RegExp("<title>(.*?)</title>").exec(responseText);

            return (title != null) ? title[1] : fallbackTitle

        } catch (e) {
            
            console.error("Failed to fetch origin page");
            console.error(e);
            return fallbackTitle;
        }
    }

    const update = async function(tabId, url, fallbackTitle) {
        /**
         * Sends a HTTP PUT request to the RPC client server to update Discord Presence
         * @param {number} tabId - The ID of the active tab
         * @param {string} url - The URL of the page in the active tab
         * @param {string} fallbackTitle - The title of the page in active tab to be used 
         * when title of origin page can't be retrieved
         */
        
        if (url == activeUrl) return;
        
        // Retrieve active site details
        const originUrl = getOrigin(url);
        const title = await getTitle(originUrl, fallbackTitle);
        const details = await getDetails(originUrl, tabId);

        activeUrl = url;

        // Generate the JSON payload containing the site details
        const payload = JSON.stringify({
            "title": title || "New Tab", "originUrl": originUrl || "New Tab",
            "url": url, "details": details,
        });

        const payloadSize = payload.length.toString();

        try {

            // Send the payload to the RPC client
            fetch("http://localhost:1231/", {
                method: "PUT",
                mode: "cors",
                headers: { 'Content-Length': payloadSize },
                body: payload
            });

        } catch (e) {

            console.error(`Error updating RPC! Payload: ${payload}`);
            console.error(e);
        }
    }

    return update;
}

const RPCUpdater= RPC();

// Listen for active tab updates to update RPC correspondingly
chrome.tabs.onUpdated.addListener(
    
    (tabId, changeInfo, tab) => RPCUpdater(tabId, tab.url, tab.title)
);

chrome.tabs.onActivated.addListener(async activeInfo => {
    
    const openedTabs = await chrome.tabs.query({ windowId: activeInfo.windowId });
    const tab = openedTabs.find(tab => tab.id == activeInfo.tabId);
    RPCUpdater(tab.id, tab.url, tab.title);
});

// Update interval
setInterval(async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    RPCUpdater(tab.id, tab.url, tab.title);
    console.log("Updated");
}, 5000);