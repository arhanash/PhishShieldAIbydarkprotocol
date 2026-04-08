const API_URL = "http://127.0.0.1:8000/analyze"; // Change this to the Render URL once deployed online

// Listen for messages from content.js (the auto-scanner)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    if (request.type === "CHECK_URL" || request.type === "CHECK_URL_SILENT") {
        
        fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: request.url,
                is_url: true
            })
        })
        .then(response => response.json())
        .then(data => {
            
            // If it's the main page scan and it's dangerous, save it to History
            if (request.type === "CHECK_URL" && (data.status === "Dangerous" || data.status === "Suspicious")) {
                saveToHistory(request.url, data.status, data.risk_score);
            }
            
            sendResponse(data);
        })
        .catch(err => {
            console.error("PhishShield Background AI Error:", err);
            sendResponse(null);
        });

        return true; // Keeps the message channel open for async fetch
    }
});

function saveToHistory(url, status, score) {
    chrome.storage.local.get({ threatHistory: [] }, (result) => {
        const history = result.threatHistory;
        
        // Prevent duplicate spam
        if (history.length > 0 && history[0].url === url) return;

        const record = {
            url: url,
            status: status,
            score: score,
            timestamp: new Date().toLocaleString()
        };

        // Add to front of array, keep only last 50
        history.unshift(record);
        if (history.length > 50) history.pop();

        chrome.storage.local.set({ threatHistory: history });
    });
}
