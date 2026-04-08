from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import re
from sklearn.linear_model import LogisticRegression
import numpy as np

# ---------------------------------------------------------
# SECTION 1: API Initialization & Setup
# ---------------------------------------------------------
# Create the FastAPI app instance, which will act as our local backend server.
app = FastAPI(title="PhishShield AI API")

# We must allow Cross-Origin Resource Sharing (CORS). 
# Since our browser extension makes requests from different web pages to our local server,
# CORS needs to be enabled for it to connect properly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In a real prod environment, restrict this to specific domains.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# SECTION 2: Data Models
# ---------------------------------------------------------
# Pydantic is used to strictly define the shape of incoming requests.
# When the extension sends data, it must match this model.
class AnalyzeRequest(BaseModel):
    content: str        # The actual string to analyze (URL or email text)
    is_url: bool = True # A flag so the engine knows whether it's looking at a link or text

# ---------------------------------------------------------
# SECTION 3: Machine Learning Model Setup
# ---------------------------------------------------------
# We initialize a logistic regression model. This is standard for binary classification (Safe vs Phishing).
dummy_model = LogisticRegression()

# We train it on a highly simplified mock dataset for the MVP.
# Features extracted are: [length_of_text, number_of_dots, contains_special_characters]
X_train = np.array([
    [20, 1, 0],   # Short link, 1 dot, no special chars -> Safe
    [25, 2, 0],   # Normal link -> Safe
    [80, 4, 1],   # Long link, many subdomains, special chars -> Phishing
    [100, 5, 1],  # Very long link -> Phishing
    [50, 3, 1],   # Medium size but has special chars -> Phishing
    [30, 2, 0]    # Normal link -> Safe
])
# Labels: 0 = Safe, 1 = Phishing
y_train = np.array([0, 0, 1, 1, 1, 0])

# Fit (train) the model so it learns the patterns. 
# This runs once when the server starts up.
dummy_model.fit(X_train, y_train)

# ---------------------------------------------------------
# SECTION 4: Helpers & Rule Definitions
# ---------------------------------------------------------
# These are common words cybercriminals use to create urgency or deceive users.
SUSPICIOUS_KEYWORDS = ['login', 'verify', 'update', 'bank', 'password', 'secure', 'account']

# A helper function to turn the raw text into the 3 numerical features our ML model understands.
def extract_features(content: str):
    length = len(content)
    dots = content.count('.')
    # Find if there are any suspicious characters like @, !, #, etc.
    special_chars = 1 if re.search(r'[@\-!#$%^&*]', content) else 0
    
    # Return as a 2D numpy array which scikit-learn expects
    return np.array([[length, dots, special_chars]])

# ---------------------------------------------------------
# SECTION 5: Core Detection Engine (The Main API Endpoints)
# ---------------------------------------------------------
# A simple health check at the root so if you open the backend in a browser, it doesn't give a 404 error.
@app.get("/")
async def root():
    return {"message": "✅ PhishShield AI Backend is successfully running!", "status": "active"}

# This function triggers every time the extension clicks "Analyze"
@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    content = request.content.lower() # Normalize text to lowercase to make checking easier
    
    rule_score = 0
    reasons = [] # We'll populate this with human-readable explanations based on triggered risks
    
    # --- PHASE A: RULE-BASED ANALYSIS ---
    # We apply hard-coded rules for precise, known phishing patterns.
    if request.is_url:
        
        # Rule 1: Abnormally long URLs (often used to obscure the fake domain name)
        if len(content) > 75:
            rule_score += 30
            reasons.append("URL length exceeds normal limits (too long).")
            
        # Rule 2: Basic HTTP (Phishing sites occasionally avoid setting up SSL/HTTPS certs)
        if content.startswith("http://"):
            rule_score += 20
            reasons.append("Uses HTTP instead of secure HTTPS.")
            
        # Rule 3: The '@' Symbol (Browsers ignore everything before '@', tricking users)
        if "@" in content:
            rule_score += 40
            reasons.append("Contains '@' symbol, a common tactic to obscure the true domain.")
            
        # Rule 4: Typosquatting/Subdomain stuffing (e.g. www.secure-login.paypal.fake.com)
        if content.count('.') > 3:
            rule_score += 20
            reasons.append("Too many subdomains, often used to mimic legitimate sites.")
            
    # Check for social engineering manipulation keywords
    found_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in content]
    if found_keywords:
        rule_score += 15 * len(found_keywords) # Increase score for EVERY bad word found
        reasons.append(f"Contains suspicious keywords: {', '.join(found_keywords)}.")
        
    # Cap the rule score so it doesn't overflow
    rule_score = min(rule_score, 100)
    
    # --- PHASE B: MACHINE LEARNING ANALYSIS ---
    # We ask our regression model to evaluate the structure pattern.
    features = extract_features(content)
    # Get probability that it belongs to class '1' (Phishing)
    ml_prob = dummy_model.predict_proba(features)[0][1] 
    ml_score = int(ml_prob * 100)
    
    # --- PHASE C: HYBRID RISK SCORING ---
    # Combine the two methodologies. 
    # Rule engine (60% weight) ensures known threats are caught immediately.
    # ML engine (40% weight) handles structural nuances and zero-day structure changes.
    final_score = int((rule_score * 0.6) + (ml_score * 0.4))
    
    # Determine Status Classification based on final score brackets
    if final_score < 30:
        status = "Safe"
        if not reasons:
            reasons.append("No suspicious patterns or ML threats detected.")
    elif final_score < 70:
        status = "Suspicious"
    else:
        status = "Dangerous"
        
    # Send the response payload back to the browser extension
    return {
        "status": status,
        "risk_score": final_score,
        "reasons": reasons
    }
