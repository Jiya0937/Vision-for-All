import cv2
import numpy as np

def load_image(path):
    """Load image from file path."""
    img = cv2.imread(path)
    return img

def preprocess_for_braille(img):
    """
    Clean and prepare image for dot detection.
    Steps: grayscale → blur → threshold
    """
    # Step 1: Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Step 2: Reduce noise with blur
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Step 3: Convert to black & white (threshold)
    _, binary = cv2.threshold(blurred, 127, 255, cv2.THRESH_BINARY)

    return binary

def find_dots(binary_img):
    """
    Find all raised dots in the preprocessed image.
    Returns list of dot center coordinates.
    """
    # Find contours (blobs = dots)
    contours, _ = cv2.findContours(
        binary_img, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    dots = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        # Filter by size — too small or too big = not a dot
        if 50 < area < 2000:
            M = cv2.moments(cnt)
            if M["m00"] != 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                dots.append((cx, cy))

    return dots