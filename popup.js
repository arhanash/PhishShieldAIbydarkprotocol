// This event fires when the popup HTML is completely loaded.
document.addEventListener('DOMContentLoaded', () => {
    
    // ---------------------------------------------------------
    // SECTION 1: UI Element Binding
    // ---------------------------------------------------------
    // We grab all the HTML elements by their ID so we can modify them via code
    const tabBtns = document.querySelectorAll('.tab-btn');
    const urlInputGroup = document.getElementById('url-input-group');
    const textInputGroup = document.getElementById('text-input-group');
    const historyGroup = document.getElementById('history-group');
    const urlInput = document.getElementById('url-input');
    const textInput = document.getElementById('text-input');
    const getCurrentUrlBtn = document.getElementById('getCurrentUrlBtn');
    
    // History elements
    const historyList = document.getElementById('historyList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const emptyHistory = document.getElementById('emptyHistory');
    
    const analyzeBtn = document.getElementById('analyzeBtn');
    const btnText = document.getElementById('btnText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMsg = document.getElementById('errorMsg');
    
    const resultsCard = document.getElementById('resultsCard');
    const statusBadge = document.getElementById('statusBadge');
    const scoreValue = document.getElementById('scoreValue');
    const scoreBar = document.getElementById('scoreBar');
    const explanationBox = document.getElementById('explanationBox');
    const reasonsUl = document.getElementById('reasonsUl');

    // State variable to track whether user is scanning a URL or Text
    let currentMode = 'url';

    // ---------------------------------------------------------
    // SECTION 2: Tab Switching Logic
    // ---------------------------------------------------------
    // Add click listeners to the tabs so the UI toggles between URL and Text boxes
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Remove 'active' class from all, then add to the clicked one
            tabBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Switch current mode
            currentMode = e.target.getAttribute('data-tab');
            
            // Hide/unhide the proper input box
            urlInputGroup.classList.add('hidden');
            textInputGroup.classList.add('hidden');
            historyGroup.classList.add('hidden');
            document.querySelector('.input-section').classList.add('hidden');
            
            if (currentMode === 'url') {
                document.querySelector('.input-section').classList.remove('hidden');
                urlInputGroup.classList.remove('hidden');
            } else if (currentMode === 'text') {
                document.querySelector('.input-section').classList.remove('hidden');
                textInputGroup.classList.remove('hidden');
            } else if (currentMode === 'history') {
                historyGroup.classList.remove('hidden');
                loadHistory(); // Load data from storage
            }
            hideResults(); // clear old results on tab switch
        });
    });

    // ---------------------------------------------------------
    // SECTION 3: Chrome Extension API Interaction
    // ---------------------------------------------------------
    // This allows the extension to read the URL of the tab the user is currently looking at
    getCurrentUrlBtn.addEventListener('click', () => {
        // Queries chrome for the active tab in the current window
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            // If successfully found, paste it into the URL input box automatically
            if(tabs && tabs[0]) {
                urlInput.value = tabs[0].url;
            }
        });
    });

    // ---------------------------------------------------------
    // SECTION 4: Analysis & API Communication
    // ---------------------------------------------------------
    // Runs when the user clicks the big "Analyze Target" button
    analyzeBtn.addEventListener('click', async () => {
        hideError();
        
        // Grab the text depending on which tab is open
        const content = currentMode === 'url' ? urlInput.value.trim() : textInput.value.trim();
        
        // Input validation
        if (!content) {
            showError(`Please enter a ${currentMode === 'url' ? 'URL' : 'text'} to analyze.`);
            return;
        }

        setLoading(true); // show the spinner
        hideResults();

        try {
            // We use JS Fetch API to contact our local Python server asynchronously
            const response = await fetch('https://phishshield-ai-1hjg.onrender.com/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // We stringify the payload exactly as the Python Pydantic Model expects
                body: JSON.stringify({
                    content: content,
                    is_url: currentMode === 'url'
                })
            });

            if (!response.ok) {
                throw new Error('Backend server is not running or returned an error.');
            }

            // Parse the JSON data sent from Python
            const data = await response.json();
            
            // Render the data on the screen
            displayResults(data);
            
        } catch (err) {
            showError(`API Error: Make sure your Python backend is running! (${err.message})`);
        } finally {
            setLoading(false); // hide the spinner regardless of success/fail
        }
    });

    // ---------------------------------------------------------
    // SECTION 5: UI Helper Functions
    // ---------------------------------------------------------
    
    // Toggles the spinning animation and disables button so they don't spam click
    function setLoading(isLoading) {
        if (isLoading) {
            btnText.classList.add('hidden');
            loadingSpinner.classList.remove('hidden');
            analyzeBtn.disabled = true;
        } else {
            btnText.classList.remove('hidden');
            loadingSpinner.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    }

    function showError(msg) {
        errorMsg.textContent = msg;
        errorMsg.classList.remove('hidden');
    }

    function hideError() {
        errorMsg.classList.add('hidden');
    }

    function hideResults() {
        resultsCard.classList.add('hidden');
    }

    // ---------------------------------------------------------
    // SECTION 6: DOM Manipulation (Explainability feature)
    // ---------------------------------------------------------
    // Responsible for taking backend data and painting the visual result components
    function displayResults(data) {
        // Destructure the API response
        const { status, risk_score, reasons } = data;
        
        // 1. Update the physical Score Number (e.g. 75/100)
        scoreValue.textContent = risk_score;
        scoreValue.style.color = getScoreColor(status);
        
        // 2. Update Status Text Badge (Safe/Suspicious/Dangerous)
        statusBadge.textContent = status;
        statusBadge.className = 'status-badge'; // reset styles
        statusBadge.classList.add(`status-${status.toLowerCase()}`); // apply appropriate CSS color class
        
        // 3. Animate the colored Risk Bar width
        scoreBar.className = 'score-bar'; // reset
        scoreBar.classList.add(`bg-${status.toLowerCase()}`);
        setTimeout(() => {
            scoreBar.style.width = `${risk_score}%`; // dynamically set width based on integer score
        }, 50); // slight delay forces the CSS transition animation to trigger
        
        // 4. Generate the short Human-Readable Explainer
        let expText = "";
        if (status === "Safe") {
            if (reasons.length > 0 && risk_score > 0) {
                expText = "This target triggered minor warnings, but overall structure and ML analysis indicate it is likely safe.";
            } else {
                expText = "This passes all rule-based checks and the ML engine finds no structural anomalies. It appears completely safe.";
            }
        } else if (status === "Suspicious") {
            expText = "Our hybrid detection flagged risky behaviors or typosquatting. Proceed with caution.";
        } else {
            expText = "Warning! Our detection engine classifies this as highly dangerous. DO NOT proceed or provide personal info.";
        }
        explanationBox.textContent = expText;
        // Make the side border of the explainer box match the threat level color
        explanationBox.style.borderLeftColor = getScoreColor(status);

        // 5. Append all the specific detailed reasons from Python into a bulleted list
        reasonsUl.innerHTML = ''; // clear old list
        if (reasons && reasons.length > 0) {
            reasons.forEach(r => {
                const li = document.createElement('li');
                li.textContent = r;
                reasonsUl.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.textContent = "No specific triggers found.";
            reasonsUl.appendChild(li);
        }

        // Make the whole result card visible
        resultsCard.classList.remove('hidden');
    }

    // Determines CSS hex codes for themes based on threat level
    function getScoreColor(status) {
        if (status === 'Safe') return '#10b981'; // Green
        if (status === 'Suspicious') return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    }

    // ---------------------------------------------------------
    // SECTION 7: Threat History Dashboard
    // ---------------------------------------------------------
    function loadHistory() {
        chrome.storage.local.get({ threatHistory: [] }, (result) => {
            const history = result.threatHistory;
            historyList.innerHTML = '';
            
            if (history.length === 0) {
                historyList.appendChild(emptyHistory);
                emptyHistory.style.display = 'block';
                return;
            }
            
            history.forEach(item => {
                const div = document.createElement('div');
                div.className = 'history-item';
                
                const color = getScoreColor(item.status);
                
                div.innerHTML = `
                    <div class="history-url">${item.url}</div>
                    <div class="history-meta">
                        <span style="color: ${color}; font-weight: bold;">${item.status} (Score: ${item.score})</span>
                        <span class="history-time">${item.timestamp}</span>
                    </div>
                `;
                historyList.appendChild(div);
            });
        });
    }

    clearHistoryBtn.addEventListener('click', () => {
        chrome.storage.local.set({ threatHistory: [] }, () => {
            loadHistory();
        });
    });
});
