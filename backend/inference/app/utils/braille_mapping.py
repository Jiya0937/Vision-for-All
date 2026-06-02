# Braille dot pattern to English letter mapping
# Each pattern is 6 bits: dot positions 1,2,3,4,5,6
# 1 = raised dot, 0 = flat
# Layout:
#  1 4
#  2 5
#  3 6

BRAILLE_MAP = {
    "100000": "A",
    "110000": "B",
    "100100": "C",
    "100110": "D",
    "100010": "E",
    "110100": "F",
    "110110": "G",
    "110010": "H",
    "010100": "I",
    "010110": "J",
    "101000": "K",
    "111000": "L",
    "101100": "M",
    "101110": "N",
    "101010": "O",
    "111100": "P",
    "111110": "Q",
    "111010": "R",
    "011100": "S",
    "011110": "T",
    "101001": "U",
    "111001": "V",
    "010111": "W",
    "101101": "X",
    "101111": "Y",
    "101011": "Z",
    "000000": " ",  # space
}

def pattern_to_letter(pattern: str) -> str:
    """Convert a 6-bit dot pattern string to a letter."""
    return BRAILLE_MAP.get(pattern, "?")

def decode_braille_sequence(patterns: list) -> str:
    """Convert a list of patterns into a full word/sentence."""
    result = ""
    for pattern in patterns:
        result += pattern_to_letter(pattern)
    return result