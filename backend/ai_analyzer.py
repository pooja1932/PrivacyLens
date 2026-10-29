import os
import json

# Standard JSON schema prompt for LLM
SYSTEM_PROMPT = """
You are a trustworthy privacy auditor. Analyze the provided privacy policy section and extract key facts.
You MUST return ONLY a valid JSON object with the following structure:
{
    "data_sold": "YES" | "NO" | "UNCLEAR",
    "key_data_types": ["list of data types collected"],
    "third_party_sharing": ["list of third parties or partner categories"],
    "retention_period": "human readable retention limit or 'Not Specified'",
    "key_risks": ["1-3 concise bullet points highlighting concerning terms"],
    "user_rights": ["1-3 key rights granted to users (e.g., Delete, Opt-out)"]
}
Do not include markdown code block formatting like ```json. Return pure JSON.
"""

def analyze_section_with_ai(segmented_data: dict, api_key: str = None) -> dict:
    """
    Sends structured sections to Gemini or OpenAI for last-mile JSON extraction.
    Includes mock fallback if no API key is provided during local dev.
    """
    # Check for API key in environment if not explicitly passed
    api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        # Fallback Mock Response for offline/local testing
        return {
            "mode": "mock_fallback (No API key provided)",
            "data_sold": "UNCLEAR",
            "key_data_types": ["Email", "IP Address", "Device Identifiers"],
            "third_party_sharing": ["Analytics providers", "Advertising networks"],
            "retention_period": "24 Months",
            "key_risks": [
                "Data may be shared with unnamed commercial partners",
                "Indefinite storage for aggregated telemetry"
            ],
            "user_rights": [
                "Right to request account deletion",
                "Right to opt-out of marketing communications"
            ]
        }
        
    try:
        # If Gemini API key present, call Google Generative AI
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"{SYSTEM_PROMPT}\n\nSECTIONS TO ANALYZE:\n"
        for section, content in segmented_data.items():
            if content.strip():
                prompt += f"=== {section.upper()} ===\n{content[:1500]}\n\n"
                
        response = model.generate_content(prompt)
        cleaned_text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(cleaned_text)
        
    except Exception as e:
        return {
            "error": f"AI Extraction Failed: {str(e)}",
            "fallback_status": "Rule-based metrics still valid"
        }
