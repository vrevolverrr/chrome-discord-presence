function SiteIcons(originUrl) {
    /**
     * Returns the icon name for the website if present else return the default icon name
     * @param {string} originUrl - The origin URL (eg: https://www.youtube.com/watch?v=dwdwa => https://www.youtube.com)
     * 
     * @returns {string}
     */
    
    const icons = {
        "https://discord.com": "discord",
        "https://www.facebook.com": "facebook",
        "https://www.google.com": "google",
        "https://instagram.com": "instagram",
        "https://www.netflix.com": "netflix",
        "https://www.reddit.com": "reddit",
        "https://mail.google.com": "gmail",
        "https://stackoverflow.com": "stackoverflow",
        "https://www.twitch.tv": "twitch",
        "https://www.youtube.com": "youtube",
        "https://www.wikipedia.org": "wikipedia",
        "https://web.whatsapp.com": "whatsapp",
        "https://www4.f2movies.to": "f2movies",
        "https://github.com": "github"
    }
    
    const icon = icons[originUrl];
    return (icon != undefined) ? icon : "chrome";
}

async function SiteDetails(originUrl, tabId) {
    /**
     * Returns the extra details if any provided by defined parsers by executing scripts in the context of the specific tabs
     * @param {string} originUrl - The origin URL (eg: https://www.youtube.com/watch?v=dwdwa => https://www.youtube.com)
     * @param {number} tabId - The ID of the active tab
     * 
     * @returns {string}
     */

    // TODO Promise Rejection
    const netflix = function(tabId) {
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: () => {
                    const root =  document.querySelector(".video-title");
                    
                    // If video title not found => not playing
                    if (!root) return null;

                    const parent = root.querySelector("div") || root;
                    return parent.querySelector("h4").innerHTML;
                }
            }, result => {
                const activity = result[0].result;
                if (activity)
                    resolve("Watching " + activity);
                else
                    resolve("Browsing");
            });
        });
    }

    const f2movies = function(tabId) {
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                function: () => {
                    const root = document.querySelector(".prebreadcrumb");

                    // If video title not found => not playing
                    if (!root) return null;

                    return root.querySelectorAll("li")[2].innerText;
                }
            }, result => {
                const activity = result[0].result;
                if (activity)
                    resolve("Watching " + activity);
                else
                    resolve("Browsing");
            });
        });
    }

    const sites = {
        "https://www.netflix.com": netflix,
        "https://www4.f2movies.to": f2movies
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
    const getIcon = (originUrl) => SiteIcons(originUrl);
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
        const icon = getIcon(originUrl);
        const title = await getTitle(originUrl, fallbackTitle);
        const details = await getDetails(originUrl, tabId);

        activeUrl = url;

        // Generate the JSON payload containing the site details
        const payload = JSON.stringify({
            "title": title, "originUrl": originUrl,
            "url": url, "details": details, "icon": icon
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