VAGUE_TERMS = [
    "from time to time",
    "as we deem appropriate",
    "various third parties",
    "where necessary",
    "may include",
    "subject to change",
    "in our sole discretion",
    "appropriate measures",
    "reasonably necessary",
    "as described herein",
    "some information",
    "such as",
    "including but not limited to",
    "other similar technologies"
]

def calculate_transparency_score(text):
    text_lower = text.lower()
    count = sum(1 for term in VAGUE_TERMS if term in text_lower)
    # Simple logic: 100 - (count * 5). Min score 0.
    # More counts = less transparent = lower score.
    score = max(0, 100 - (count * 5))
    return score, count
