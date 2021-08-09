let errors = [];

let mutes = [];
chrome.storage.sync.get(["mutes"], function (items) {
    if (items["mutes"] != undefined) {
        mutes = items["mutes"];
    }
    mutes = mutes.filter(mute => mute != "");
    console.log(mutes);
});

function printStackTrace(e) {
    if (e.stack) {
        console.log(e.stack);
    } else {
        console.log(e.message, e);
    }
}

function getText(element) {
    let text = element.innerText;
    let emojis = element.querySelectorAll("img");
    if (emojis != null) {
        text += Array.from(emojis).map(emoji => emoji.alt);
    }
    return text;
}

function isRegexWord(word) {
    return word.startsWith("reg:");
}

function isMuted(content) {
    return mutes.some(mute => {
        if (isRegexWord(mute)) {
            return RegExp(mute.slice("reg:".length)).test(content);
        } else {
            return content.includes(mute);
        }
    });
}

function getMuteWords(content) {
    let words = [];
    mutes.forEach(mute => {
        if (isRegexWord(mute)) {
            if (RegExp(mute.slice("reg:".length)).test(content)) {
                words.push(mute.slice("reg:".length));
            }
        } else {
            if (content.includes(mute)) {
                words.push(mute);
            }
        }
    });
    return words;
}

function hideTrend(trend, hideButton) {
    if (hideButton != null) {
        hideButton.click();
        let ignoreButtonItem;

        function task() {
            if (ignoreButtonItem != undefined) {
                return;
            }
            let menuItems = Array.from(document.querySelectorAll("div[role=menu] > div > div > div > div[role=menuitem]"));
            ignoreButtonItem = menuItems.find(menuItem => {
                return menuItem.children[1].firstElementChild.firstElementChild.innerText == "興味がない";
            });
            if (ignoreButtonItem != undefined) {
                ignoreButtonItem.click();
            } else {
                setTimeout(task, 50)
            }
        }

        task();
    } else {
        trend.style.display = "none";
    }
}

// https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript
function arraysEqual(a, b, checkOrder = false) {
    if (a === b)  {
        return true;
    }
    if (a == null || b == null) {
        return false;
    }
    if (a.length !== b.length) {
        return false;
    }
  
    if (checkOrder) {
        a.sort();
        b.sort();
    }
  
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

setInterval(function () {
    if (location.pathname.startsWith("/settings")) {
        if (location.pathname == "/settings/muted_keywords") {
            try {
                let temp = [];
                let muteWords = document.querySelectorAll(
                    "main > div > div > div > section:nth-child(2) > div:nth-child(2) > div > div[tabindex='0']"
                );
                muteWords.forEach(muteWord => {
                    let muteTextField = muteWord.children[0].children[0];
                    let text = getText(muteTextField);
                    if (text != "") {
                        temp.push(text);
                    }
                });
                if (!arraysEqual(temp, mutes)) {
                    mutes.splice(0, mutes.length, ...temp);
                    chrome.storage.sync.set({
                        mutes: mutes
                    });
                    console.log("Updated mute words", mutes);
                }
            } catch (e) {
                if (!errors.includes(e)) {
                    errors.push(e);
                    console.log("Failed to get mute words");
                    printStackTrace(e);
                }
            }
        }
    } else {
        if (mutes.length == 0) {
            return;
        }
        if (location.pathname.startsWith("/explore/tabs/")) {
            let trends = Array.from(document.querySelectorAll(
                "main > div > div > div > div > div > div:nth-child(2) > div > div > section > div > div > div"
            ));
            if (location.pathname == "/explore/tabs/for-you") {
                trends = trends.slice(3, -8);
            } else if (location.pathname == "/explore/tabs/covid-19") {
                trends = trends.slice(6, 6 + 17);
            } else if (location.pathname == "/explore/tabs/trending") {
                trends = trends.slice(2, -1);
            } else if (["/explore/tabs/news_unified", "/explore/tabs/sports_unified", "/explore/tabs/entertainment_unified"].includes(location.pathname)) {
                trends = trends.slice(3, -1);
            } else {
                trends = [];
            }
            trends.forEach(trend => {
                try {
                    if (trend.getAttribute("muteChecked") == "true") {
                        return;
                    }
                    if (trend.firstElementChild.firstElementChild.tagName == "ARTICLE" || trend.style.display == "none") {
                        // 非表示
                        return;
                    }
                    let text;
                    let hideButton;
                    let hasMetadata = Array.from(trend.firstElementChild.firstElementChild.firstElementChild.children).find(child => child.getAttribute("data-testid") == "metadata") !== undefined
                    let count = hasMetadata ? 0 : -1
                    if (trend.firstElementChild.firstElementChild.firstElementChild.childElementCount == (2 + count)) {
                        // ニュース
                        text = trend.firstElementChild.firstElementChild.firstElementChild.children[0].children[1].innerText;
                        hideButton = null;
                    } else if (trend.firstElementChild.firstElementChild.firstElementChild.childElementCount == (5 + count) && trend.firstElementChild.firstElementChild.firstElementChild.lastElementChild.hasChildNodes()) {
                        // ツイート付き/ニューストレンド
                        text = trend.firstElementChild.firstElementChild.firstElementChild.children[1].innerText;
                        try {
                            if (trend.firstElementChild.firstElementChild.firstElementChild.children[2].children[1].firstElementChild
                                .children[1].childElementCount == 2) {
                                // 画像付き
                                text += trend.firstElementChild.firstElementChild.firstElementChild.children[2].children[1].firstElementChild
                                .children[1].children[1].firstElementChild.firstElementChild.innerText;
                            } else {
                                text += trend.firstElementChild.firstElementChild.firstElementChild.children[2].children[1].firstElementChild
                                    .children[1].firstElementChild.firstElementChild.firstElementChild.innerText;
                            }
                        } catch (e) {
                            text += trend.firstElementChild.firstElementChild.firstElementChild.children[2].firstElementChild
                                .firstElementChild.firstElementChild.firstElementChild.children[1].firstElementChild.innerText;
                        }
                        hideButton = trend.firstElementChild.firstElementChild.firstElementChild.lastElementChild.firstElementChild.firstElementChild;
                    } else if (trend.firstElementChild.firstElementChild.firstElementChild.childElementCount == (6 + count)) {
                        // ツイート付き/ニューストレンド (解説付き)
                        text = trend.firstElementChild.firstElementChild.firstElementChild.children[1].innerText;
                        text += trend.firstElementChild.firstElementChild.firstElementChild.children[2].innerText;
                        try {
                            if (trend.firstElementChild.firstElementChild.firstElementChild.children[3].children[1].firstElementChild
                                .children[1].childElementCount == 2) {
                                // 画像付き
                                text += trend.firstElementChild.firstElementChild.firstElementChild.children[3].children[1].firstElementChild
                                    .children[1].children[1].firstElementChild.firstElementChild.innerText;
                            } else {
                                text += trend.firstElementChild.firstElementChild.firstElementChild.children[3].children[1].firstElementChild
                                    .children[1].firstElementChild.firstElementChild.firstElementChild.innerText;
                            }
                        } catch (e) {
                            text += trend.firstElementChild.firstElementChild.firstElementChild.children[3].firstElementChild
                                .firstElementChild.firstElementChild.firstElementChild.children[1].firstElementChild.innerText;
                        }
                        hideButton = trend.firstElementChild.firstElementChild.firstElementChild.lastElementChild.firstElementChild.firstElementChild;
                    } else {
                        // トレンド
                        text = trend.firstElementChild.firstElementChild.firstElementChild.children[1].innerText;
                        try {
                            hideButton = trend.firstElementChild.firstElementChild.firstElementChild.lastElementChild.firstElementChild.firstElementChild;
                            if (hideButton == undefined || hideButton.getAttribute("data-testid") != "caret") {
                                hideButton = null;
                            }
                        } catch (e) {
                            hideButton = null;
                        }
                    }
                    if (isMuted(text)) {
                        hideTrend(trend, hideButton);
                        console.log(`Removed trend including words '${getMuteWords(text)}'`, trend);
                    }
                    trend.setAttribute("muteChecked", "true");
                } catch (e) {
                    if (!errors.includes(trend)) {
                        errors.push(trend);
                        console.log("Failed to remove trend", trend);
                        printStackTrace(e);
                    }
                }
            });
        } else if (!location.pathname.startsWith("/messages") && !location.pathname.startsWith("/i/moment_maker")) {
            let trends;
            if (location.pathname.startsWith("/search")) {
                trends = Array.from(document.querySelectorAll(
                    "main > div > div > div > div:nth-child(2) > div > div:nth-child(2) > div > div > div > "
                    + "div:nth-child(2) > div > div > section > div > div > div"
                ));
            } else {
                trends = Array.from(document.querySelectorAll(
                    "main > div > div > div > div:nth-child(2) > div > div:nth-child(2) > div > div > div > "
                    + "div:nth-child(3) > div > div > section > div:nth-child(2) > div > div"
                ));
            }
            trends.slice(2, -1).forEach(trend => {
                try {
                    if (trend.getAttribute("muteChecked") == "true") {
                        return;
                    }
                    if (trend.firstElementChild.firstElementChild.tagName == "ARTICLE" || trend.style.display == "none") {
                        // 非表示
                        return;
                    }
                    let text = trend.firstElementChild.firstElementChild.children[1].innerText;
                    if (text == "") {
                        text = trend.firstElementChild.firstElementChild.firstElementChild.children[1].innerText;
                    }
                    let hideButton;
                    try {
                        hideButton = trend.firstElementChild.firstElementChild.lastElementChild.firstElementChild.firstElementChild;
                        if (hideButton == undefined || hideButton.getAttribute("data-testid") != "caret") {
                            hideButton = null;
                        }
                    } catch (e) {
                        hideButton = null;
                    }
                    if (isMuted(text)) {
                        hideTrend(trend, hideButton);
                        console.log(`Removed trend including words '${getMuteWords(text)}'`, trend);
                    }
                    trend.setAttribute("muteChecked", "true");
                } catch (e) {
                    if (!errors.includes(trend)) {
                        errors.push(trend);
                        console.log("Failed to remove trend", trend);
                        printStackTrace(e);
                    }
                }
            });
    
            if (location.pathname.startsWith("/search")) {
                let tweets = document.querySelectorAll(
                    "main > div > div > div > div > div > div:nth-child(2) > div > div > section > div > div > div"
                );
                tweets.forEach(tweet => {
                    try {
                        if (tweet.getAttribute("muteChecked") == "true") {
                            return;
                        }
                        let tweetContainer = tweet.querySelector("div > div > article > div > div > div > div[data-testid=tweet]");
                        if (tweetContainer == null) {
                            return;
                        }
                        let fields = tweetContainer.children[1].children[1];
                        if (fields == undefined || (fields.childElementCount == 4 && fields.lastElementChild.getAttribute("role") != "group")) {
                            // プロモーション
                            return;
                        }
                        let textField;
                        if (fields.childElementCount == 4) {
                            // 返信
                            textField = fields.children[1];
                        } else {
                            // ツイート
                            textField = fields.children[0];
                        }
                        if (!textField.hasChildNodes()) {
                            return;
                        }
                        let text = getText(textField);
                        if (isMuted(text)) {
                            tweet.style.display = "none";
                            console.log(`Removed tweet including words '${getMuteWords(text)}'`, tweet);
                        }
                        tweet.setAttribute("muteChecked", "true");
                    } catch (e) {
                        if (!errors.includes(tweet)) {
                            errors.push(tweet);
                            console.log("Failed to remove tweet", tweet);
                            printStackTrace(e);
                        }
                    }
                });
            }
        }
    }
}, 100);