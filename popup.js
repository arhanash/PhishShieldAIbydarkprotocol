document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const urlInputGroup = document.getElementById('url-input-group');
    const textInputGroup = document.getElementById('text-input-group');
    const urlInput = document.getElementById('url-input');
    const textInput = document.getElementById('text-input');
    const getCurrentUrlBtn = document.getElementById('getCurrentUrlBtn');
    
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

    let currentMode = 'url';

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentMode = e.target.getAttribute('data-tab');
            
            if (currentMode === 'url') {
                urlInputGroup.classList.remove('hidden');
                textInputGroup.classList.add('hidden');
            } else {
                textInputGroup.classList.remove('hidden');
                urlInputGroup.classList.add('hidden');
            }
            hideResults();
        });
    });

    // Get current URL
    getCurrentUrlBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if(tabs && tabs[0]) {
                urlInput.value = tabs[0].url;
            }
        });
    });

    // Analyze click
    analyzeBtn.addEventListener('click', async () => {
        hideError();
        
        const content = currentMode === 'url' ? urlInput.value.trim() : textInput.value.trim();
        
        if (!content) {
            showError(`Please enter a ${currentMode === 'url' ? 'URL' : 'text'} to analyze.`);
            return;
        }

        setLoading(true);
        hideResults();

        try {
            const response = await fetch('http://127.0.0.1:8000/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: content,
                    is_url: currentMode === 'url'
                })
            });

            if (!response.ok) {
                throw new Error('Backend server is not running or returned an error.');
            }

            const data = await response.json();
            displayResults(data);
            
        } catch (err) {
            showError(`API Error: Make sure your Python backend is running on http://127.0.0.1:8000! (${err.message})`);
        } finally {
            setLoading(false);
        }
    });

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

    function displayResults(data) {
        const { status, risk_score, reasons } = data;
        
        // Update Score
        scoreValue.textContent = risk_score;
        scoreValue.style.color = getScoreColor(status);
        
        // Update Status Badge
        statusBadge.textContent = status;
        statusBadge.className = 'status-badge'; // reset
        statusBadge.classList.add(`status-${status.toLowerCase()}`);
        
        // Update Bar
        scoreBar.className = 'score-bar'; // reset
        scoreBar.classList.add(`bg-${status.toLowerCase()}`);
        setTimeout(() => {
            scoreBar.style.width = `${risk_score}%`;
        }, 50); // delay for css transition effect
        
        // Explanation logic
        let expText = "";
        if (status === "Safe") {
            expText = "This passes all rule-based checks and the ML engine finds no structural anomalies. It appears safe.";
        } else if (status === "Suspicious") {
            expText = "Our hybrid detection flagged some risky behaviors in this target. Proceed with caution.";
        } else {
            expText = "Warning! Our detection engine classifies this as highly dangerous. DO NOT proceed or provide personal info.";
        }
        explanationBox.textContent = expText;
        explanationBox.style.borderLeftColor = getScoreColor(status);

        // Update Reasons Details
        reasonsUl.innerHTML = '';
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

        resultsCard.classList.remove('hidden');
    }

    function getScoreColor(status) {
        if (status === 'Safe') return '#10b981';
        if (status === 'Suspicious') return '#f59e0b';
        return '#ef4444';
    }
});
