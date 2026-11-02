"""
seed_data.py — Person 3 Domain
Seeds MongoDB (or the in-memory fallback) with realistic pre-analysed
results for 10 top student websites so the team can test the leaderboard
and Chrome Extension without running real Gemini API calls during local dev.

Usage:
    python seed_data.py
"""

from database import save_policy

SEED_POLICIES = [
    {
        "domain": "notion.so",
        "final_trust_score": 72,
        "grade": "B",
        "deterministic_metrics": {
            "transparency_score": 80,
            "vague_phrases_count": 4,
            "word_count": 4200,
        },
        "sections_found": ["data_collection", "data_sharing", "user_rights", "security"],
        "ai_structured_insights": {
            "data_sold": "NO",
            "key_data_types": ["Email", "Usage Data", "Device Info", "Cookies"],
            "third_party_sharing": ["Analytics providers", "Cloud infrastructure"],
            "retention_period": "Until account deletion",
            "key_risks": [
                "Shares usage analytics with unnamed third parties",
                "IP address logged for security purposes indefinitely",
            ],
            "user_rights": [
                "Right to delete account and data",
                "Right to export data",
                "Right to opt-out of marketing",
            ],
        },
    },
    {
        "domain": "chegg.com",
        "final_trust_score": 38,
        "grade": "F",
        "deterministic_metrics": {
            "transparency_score": 60,
            "vague_phrases_count": 8,
            "word_count": 6800,
        },
        "sections_found": ["data_collection", "data_sharing", "data_retention"],
        "ai_structured_insights": {
            "data_sold": "YES",
            "key_data_types": ["Name", "Email", "Academic History", "Payment Info", "Browsing Data"],
            "third_party_sharing": ["Advertising networks", "Data brokers", "Academic partners"],
            "retention_period": "Not Specified",
            "key_risks": [
                "Data explicitly sold to third-party advertisers",
                "Academic history shared with unspecified partners",
                "No clear data deletion process described",
            ],
            "user_rights": [
                "Right to opt-out of targeted advertising (CCPA)",
            ],
        },
    },
    {
        "domain": "quizlet.com",
        "final_trust_score": 61,
        "grade": "C",
        "deterministic_metrics": {
            "transparency_score": 75,
            "vague_phrases_count": 5,
            "word_count": 5100,
        },
        "sections_found": ["data_collection", "data_sharing", "user_rights", "data_retention"],
        "ai_structured_insights": {
            "data_sold": "UNCLEAR",
            "key_data_types": ["Email", "Study Content", "Device Info", "Location Data"],
            "third_party_sharing": ["Analytics providers", "Payment processors", "Advertising networks"],
            "retention_period": "90 days after account deletion",
            "key_risks": [
                "Vague language around ad-targeting partnerships",
                "Study content may be used to train internal AI models",
            ],
            "user_rights": [
                "Right to access personal data",
                "Right to delete account",
                "Opt-out of email marketing",
            ],
        },
    },
    {
        "domain": "instructure.com",
        "final_trust_score": 81,
        "grade": "A",
        "deterministic_metrics": {
            "transparency_score": 88,
            "vague_phrases_count": 3,
            "word_count": 7500,
        },
        "sections_found": ["data_collection", "data_sharing", "data_retention", "user_rights", "security"],
        "ai_structured_insights": {
            "data_sold": "NO",
            "key_data_types": ["Name", "Email", "Course Activity", "Grades"],
            "third_party_sharing": ["Institutional administrators", "Accessibility tool providers"],
            "retention_period": "Per institutional agreement (typically 5 years)",
            "key_risks": [
                "Data retention controlled by institution, not the student",
            ],
            "user_rights": [
                "FERPA rights apply through institution",
                "Right to request data correction",
                "Right to access own records",
            ],
        },
    },
    {
        "domain": "discord.com",
        "final_trust_score": 55,
        "grade": "D",
        "deterministic_metrics": {
            "transparency_score": 70,
            "vague_phrases_count": 6,
            "word_count": 8200,
        },
        "sections_found": ["data_collection", "data_sharing", "data_retention", "user_rights"],
        "ai_structured_insights": {
            "data_sold": "NO",
            "key_data_types": ["Username", "Email", "Voice/Video Data", "Message Content", "IP Address", "Device Info"],
            "third_party_sharing": ["Advertising partners", "Analytics providers", "Law enforcement"],
            "retention_period": "Message content retained indefinitely; account data 30 days after deletion",
            "key_risks": [
                "Message content stored indefinitely even after account deletion",
                "IP address and device fingerprint retained for fraud detection",
                "Shares data with advertising partners for targeted ads",
            ],
            "user_rights": [
                "Right to request data export",
                "Right to delete account",
                "Right to opt-out of targeted advertising",
            ],
        },
    },
    {
        "domain": "spotify.com",
        "final_trust_score": 49,
        "grade": "D",
        "deterministic_metrics": {
            "transparency_score": 65,
            "vague_phrases_count": 7,
            "word_count": 9300,
        },
        "sections_found": ["data_collection", "data_sharing", "data_retention", "user_rights", "security"],
        "ai_structured_insights": {
            "data_sold": "YES",
            "key_data_types": ["Listening History", "Location", "Payment Info", "Voice Commands", "Cookies"],
            "third_party_sharing": ["Record labels", "Advertising partners", "Data analytics companies"],
            "retention_period": "5 years after account closure",
            "key_risks": [
                "Listening history and inferred musical taste sold to record labels",
                "Location data collected even when app is in background",
                "Voice data from voice search retained for model training",
            ],
            "user_rights": [
                "Right to access data (via Privacy Settings)",
                "Right to delete account",
                "GDPR rights for EU users",
            ],
        },
    },
    {
        "domain": "github.com",
        "final_trust_score": 85,
        "grade": "A",
        "deterministic_metrics": {
            "transparency_score": 90,
            "vague_phrases_count": 2,
            "word_count": 5600,
        },
        "sections_found": ["data_collection", "data_sharing", "data_retention", "user_rights", "security"],
        "ai_structured_insights": {
            "data_sold": "NO",
            "key_data_types": ["Username", "Email", "Repository Activity", "IP Address"],
            "third_party_sharing": ["Microsoft services", "Analytics providers"],
            "retention_period": "Until account deletion; 90-day log retention",
            "key_risks": [
                "Public repository data is accessible globally and may be indexed",
                "Integration with Microsoft services means cross-platform profiling",
            ],
            "user_rights": [
                "Right to access and download all data",
                "Right to delete account and associated data",
                "Right to correct inaccurate data",
            ],
        },
    },
    {
        "domain": "coursera.org",
        "final_trust_score": 68,
        "grade": "C",
        "deterministic_metrics": {
            "transparency_score": 78,
            "vague_phrases_count": 5,
            "word_count": 6100,
        },
        "sections_found": ["data_collection", "data_sharing", "data_retention", "user_rights"],
        "ai_structured_insights": {
            "data_sold": "UNCLEAR",
            "key_data_types": ["Name", "Email", "Course Progress", "Assessment Scores", "Payment Info"],
            "third_party_sharing": ["University partners", "Employers (via certificates)", "Analytics providers"],
            "retention_period": "7 years after last activity",
            "key_risks": [
                "Assessment data shared with university partners",
                "Vague language around employer certificate data-sharing",
            ],
            "user_rights": [
                "Right to access course records",
                "Right to delete account",
                "GDPR rights for EU users",
            ],
        },
    },
    {
        "domain": "duolingo.com",
        "final_trust_score": 77,
        "grade": "B",
        "deterministic_metrics": {
            "transparency_score": 82,
            "vague_phrases_count": 4,
            "word_count": 4800,
        },
        "sections_found": ["data_collection", "data_sharing", "user_rights", "security"],
        "ai_structured_insights": {
            "data_sold": "NO",
            "key_data_types": ["Email", "Learning Progress", "Device Info", "In-App Purchases"],
            "third_party_sharing": ["Analytics providers", "App store platforms"],
            "retention_period": "Until account deletion",
            "key_risks": [
                "Learning behavior data used for internal AI model training",
                "Children's data collected under COPPA provisions",
            ],
            "user_rights": [
                "Right to delete account and data",
                "Parental consent mechanisms for under-13 users",
                "Right to opt-out of promotional emails",
            ],
        },
    },
    {
        "domain": "stackoverflow.com",
        "final_trust_score": 83,
        "grade": "A",
        "deterministic_metrics": {
            "transparency_score": 87,
            "vague_phrases_count": 3,
            "word_count": 4300,
        },
        "sections_found": ["data_collection", "data_sharing", "data_retention", "user_rights"],
        "ai_structured_insights": {
            "data_sold": "NO",
            "key_data_types": ["Username", "Email", "Post Activity", "IP Address", "Cookies"],
            "third_party_sharing": ["Advertising partners (Stack Overflow for Teams)", "Analytics providers"],
            "retention_period": "Account data retained 30 days after deletion; public posts remain",
            "key_risks": [
                "All public posts and answers remain permanently even after account deletion",
                "Email address used for targeted job board advertising",
            ],
            "user_rights": [
                "Right to export personal data",
                "Right to delete account",
                "Right to opt-out of targeted advertising",
            ],
        },
    },
]


def run_seed():
    import sys
    # Ensure UTF-8 output on Windows terminals
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("PrivacyLens - Seeding top 10 student websites...\n")
    for policy in SEED_POLICIES:
        domain = policy["domain"]
        try:
            save_policy(domain, policy)
            score = policy["final_trust_score"]
            grade = policy["grade"]
            print(f"  [OK]  {domain:<22} Trust Score: {score:>3}  Grade: {grade}")
        except Exception as exc:
            print(f"  [ERR] {domain:<22} ERROR: {exc}")
    print(f"\nDone! {len(SEED_POLICIES)} policies seeded.\n")


if __name__ == "__main__":
    run_seed()
