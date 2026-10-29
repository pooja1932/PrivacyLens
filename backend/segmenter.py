import re

# Common section header patterns in privacy policies
SECTION_PATTERNS = {
    "data_collection": r"(?i)(information\s+we\s+collect|data\s+we\s+collect|personal\s+data\s+collected|what\s+information)",
    "data_sharing": r"(?i)(how\s+we\s+share|sharing\s+your\s+information|third[\s-]party\s+disclosure|disclosure\s+of\s+data|who\s+we\s+share)",
    "data_retention": r"(?i)(data\s+retention|how\s+long\s+we\s+keep|retention\s+period|storing\s+your\s+data)",
    "user_rights": r"(?i)(your\s+rights|your\s+choices|managing\s+your\s+privacy|access\s+and\s+control|opt-out)",
    "security": r"(?i)(data\s+security|how\s+we\s+protect|security\s+measures)"
}

def segment_policy(text: str) -> dict:
    """
    Splits privacy policy text into structured target sections based on regex header matches.
    Returns a dictionary mapping section keys to extracted text excerpts.
    """
    lines = text.split('\n')
    current_section = "general"
    sections = {key: [] for key in SECTION_PATTERNS.keys()}
    sections["general"] = []

    for line in lines:
        clean_line = line.strip()
        if not clean_line:
            continue
            
        matched = False
        # Check if line looks like a header (short length or matched key pattern)
        if len(clean_line) < 100:
            for section_key, pattern in SECTION_PATTERNS.items():
                if re.search(pattern, clean_line):
                    current_section = section_key
                    matched = True
                    break
        
        sections[current_section].append(clean_line)

    # Join lines back into single text blocks
    return {k: "\n".join(v) for k, v in sections.items() if v}
