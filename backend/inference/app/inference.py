import cv2
import numpy as np
from ultralytics import YOLO
import os

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, '..', '..', 'model', 'best.pt')
model      = YOLO(MODEL_PATH)

# Use model's own class names
CLASSES = model.names

def detect_braille_from_image(image_path: str) -> str:
    img = cv2.imread(image_path)
    if img is None:
        return "Error: Could not load image"

    results = model(img, conf=0.25, verbose=False)
    boxes   = results[0].boxes

    if len(boxes) == 0:
        return "No Braille dots detected"

    cells = []
    for i, box in enumerate(boxes.xyxy.cpu().numpy()):
        x1, y1, x2, y2 = map(int, box)
        class_id = int(boxes.cls[i].cpu().numpy())
        char     = CLASSES.get(class_id, '?')
        cells.append({'box': (x1, y1, x2, y2), 'char': char})

    cells.sort(key=lambda c: (c['box'][1] // 40, c['box'][0]))
    text = ' '.join(c['char'] for c in cells)
    return f"Detected pattern: {text} → Letter: {text}"

def detect_braille_from_frame(frame: np.ndarray) -> str:
    results = model(frame, conf=0.25, verbose=False)
    boxes   = results[0].boxes

    if len(boxes) == 0:
        return "No dots detected"

    cells = []
    for i, box in enumerate(boxes.xyxy.cpu().numpy()):
        x1, y1, x2, y2 = map(int, box)
        class_id = int(boxes.cls[i].cpu().numpy())
        char     = CLASSES.get(class_id, '?')
        cells.append({'box': (x1, y1, x2, y2), 'char': char})

    cells.sort(key=lambda c: (c['box'][1] // 40, c['box'][0]))
    text = ' '.join(c['char'] for c in cells)
    return f"{text} → {text}"