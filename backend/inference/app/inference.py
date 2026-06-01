import cv2
import numpy as np
from utils.preprocess import preprocess_for_braille, find_dots
from utils.dot_to_pattern import dots_to_pattern
from utils.braille_mapping import pattern_to_letter

def detect_braille_from_image(image_path: str) -> str:
    """
    Full pipeline: image file → Braille text
    """
    # Step 1: Load image
    img = cv2.imread(image_path)
    if img is None:
        return "Error: Could not load image"

    # Step 2: Preprocess
    binary = preprocess_for_braille(img)

    # Step 3: Find all dots
    dots = find_dots(binary)

    if not dots:
        return "No Braille dots detected"

    # Step 4: Get image dimensions as one big cell
    h, w = binary.shape
    pattern = dots_to_pattern(dots, 0, 0, w, h)

    # Step 5: Convert to letter
    letter = pattern_to_letter(pattern)

    return f"Detected pattern: {pattern} → Letter: {letter}"

def detect_braille_from_frame(frame: np.ndarray) -> str:
    """
    Full pipeline: webcam frame → Braille text
    """
    # Step 1: Preprocess
    binary = preprocess_for_braille(frame)

    # Step 2: Find dots
    dots = find_dots(binary)

    if not dots:
        return "No dots detected"

    # Step 3: Get pattern
    h, w = binary.shape
    pattern = dots_to_pattern(dots, 0, 0, w, h)

    # Step 4: Convert to letter
    letter = pattern_to_letter(pattern)

    return f"{pattern} → {letter}"