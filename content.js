// This runs automatically on every webpage

const currentURL = window.location.href;

// Avoid scanning local development or extension pages
if (!currentURL.startsWith("chrome-extension://") && !currentURL.includes("localhost") && !currentURL.includes("127.0.0.1")) {
    
    // 1. Send the current URL to the background script to check via the AI API
    chrome.runtime.sendMessage({ type: "CHECK_URL", url: currentURL }, (response) => {
        if (!response) return;

        // If the AI finds the current page dangerous, lock it down
        if (response.status === "Dangerous") {
            injectWarningBanner(response.risk_score, response.reasons[0]);
        }
    });

    // 2. In-Page Link Disarming
    // Grab all links on the page and send them for background checking
    const links = document.querySelectorAll('a[href]');
    
    // We limit to the first 15 links to avoid overwhelming the local API during testing
    let count = 0;
    links.forEach(link => {
        if (count > 15) return;
        const href = link.href;
        if (href.startsWith("http")) {
            count++;
            chrome.runtime.sendMessage({ type: "CHECK_URL_SILENT", url: href }, (response) => {
                if (response && (response.status === "Dangerous" || response.status === "Suspicious")) {
                    // Highlight the link in red to disarm it
                    link.classList.add("phishshield-risky-link");
                    link.title = `Warning: ${response.status} (Score: ${response.risk_score})`;
                }
            });
        }
    });
}

// Function to inject the massive top warning banner
function injectWarningBanner(score, reason) {
    const banner = document.createElement('div');
    banner.classList.add('phishshield-danger-banner');
    
    // Use an alert icon
    banner.innerHTML = `
        <span style="font-size: 24px;">⛔</span>
        <div>
            <strong>PHISHSHIELD AI WARNING:</strong> This website has been flagged as highly dangerous (Score: ${score}/100). ${reason}
        </div>
    `;
    
    document.body.prepend(banner);
}
