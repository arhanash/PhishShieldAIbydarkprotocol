from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import re
from sklearn.linear_model import LogisticRegression
import numpy as np

app = FastAPI(title="PhishShield AI API")

# Allow CORS for the browser extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalyzeRequest(BaseModel):
    content: str
    is_url: bool = True

# Dummy ML Model Initialization
# Features: [URL length, Number of dots, Has Special Characters (1/0)]
dummy_model = LogisticRegression()
# X_train: [[length, dots, special_chars]]
X_train = np.array([
    [20, 1, 0],   # Safe
    [25, 2, 0],   # Safe
    [80, 4, 1],   # Phishing
    [100, 5, 1],  # Phishing
    [50, 3, 1],   # Phishing
    [30, 2, 0]    # Safe
])
# y_train: 0 (Safe), 1 (Phishing)
y_train = np.array([0, 0, 1, 1, 1, 0])
dummy_model.fit(X_train, y_train)

SUSPICIOUS_KEYWORDS = ['login', 'verify', 'update', 'bank', 'password', 'secure', 'account']

def extract_features(content: str):
    length = len(content)
    dots = content.count('.')
    special_chars = 1 if re.search(r'[@\-!#$%^&*]', content) else 0
    return np.array([[length, dots, special_chars]])

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    content = request.content.lower()
    
    rule_score = 0
    reasons = []
    
    # 1. Rule-Based Analysis
    if request.is_url:
        if len(content) > 75:
            rule_score += 30
            reasons.append("URL length exceeds normal limits (too long).")
            
        if "@" in content:
            rule_score += 40
            reasons.append("Contains '@' symbol, a common tactic to obscure the true domain.")
            
        if content.startswith("http://"):
            rule_score += 20
            reasons.append("Uses HTTP instead of secure HTTPS.")
            
        if content.count('.') > 3:
            rule_score += 20
            reasons.append("Too many subdomains, often used to mimic legitimate sites.")
            
    # Check keywords for both text and URL
    found_keywords = [kw for kw in SUSPICIOUS_KEYWORDS if kw in content]
    if found_keywords:
        rule_score += 15 * len(found_keywords)
        reasons.append(f"Contains suspicious keywords: {', '.join(found_keywords)}.")
        
    # Cap rule score
    rule_score = min(rule_score, 100)
    
    # 2. ML Model Analysis
    features = extract_features(content)
    ml_prob = dummy_model.predict_proba(features)[0][1] # Probability of being phishing (class 1)
    ml_score = int(ml_prob * 100)
    
    # 3. Combine Scores
    final_score = int((rule_score * 0.6) + (ml_score * 0.4))
    
    # Determine Status
    if final_score < 30:
        status = "Safe"
        if not reasons:
            reasons.append("No suspicious patterns or ML threats detected.")
    elif final_score < 70:
        status = "Suspicious"
    else:
        status = "Dangerous"
        
    return {
        "status": status,
        "risk_score": final_score,
        "reasons": reasons
    }
