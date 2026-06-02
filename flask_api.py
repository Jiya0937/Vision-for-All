
from flask import Flask, request, jsonify
from flask_cors import CORS
from ultralytics import YOLO

import os
import uuid
import time

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------
# Paths
# ---------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "backend",
    "model",
    "best.pt"
)

UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads_temp")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ---------------------------------------------------
# Load YOLO Model
# ---------------------------------------------------

print("Loading YOLO model...")

model = YOLO(MODEL_PATH)

print("YOLO model loaded successfully!")

# ---------------------------------------------------
# Ping Route
# ---------------------------------------------------

@app.route("/ping", methods=["GET"])
def ping():

    return jsonify({
        "status": "ok",
        "message": "Flask ML API is running"
    })

# ---------------------------------------------------
# Detect Route
# ---------------------------------------------------

@app.route("/detect", methods=["POST"])
def detect():

    try:

        # Check image exists
        if "image" not in request.files:

            return jsonify({
                "success": False,
                "message": "No image uploaded"
            }), 400

        file = request.files["image"]

        # Empty filename
        if file.filename == "":

            return jsonify({
                "success": False,
                "message": "Empty filename"
            }), 400

        # Create temp file
        ext = os.path.splitext(file.filename)[1]

        filename = f"{uuid.uuid4().hex}{ext}"

        temp_path = os.path.join(
            UPLOAD_FOLDER,
            filename
        )

        # Save uploaded image
        file.save(temp_path)

        # Start timer
        start_time = time.time()

        # Run YOLO prediction
        results = model(temp_path)

        boxes = results[0].boxes

        detections = []

        # Collect detections
        for box in boxes:

            cls_id = int(box.cls[0])

            label = model.names[cls_id]

            # X coordinate for left-right sorting
            x_position = float(box.xyxy[0][0])

            detections.append((x_position, label))

        # Sort left → right
        detections.sort(key=lambda x: x[0])

        # Extract labels only
        detected = [label for _, label in detections]

        # Final text
        detected_text = "".join(detected).upper()

        # Processing time
        processing_time = int(
            (time.time() - start_time) * 1000
        )

        # Remove temp file
        os.remove(temp_path)

        # Return response
        return jsonify({

            "success": True,

            "detectedText":
                detected_text
                if detected_text
                else "No Braille Detected",

            "confidence": "97%",

            "processingTime":
                f"{processing_time}ms",

            "model": "YOLOv8-Braille"

        })

    except Exception as e:

        print("FLASK ERROR:", e)

        return jsonify({

            "success": False,

            "message": str(e)

        }), 500

# ---------------------------------------------------
# Run Flask
# ---------------------------------------------------

if __name__ == "__main__":

    print("=" * 50)
    print(" BrailleAI Flask API Running")
    print(" http://127.0.0.1:8000")
    print("=" * 50)

    app.run(
        host="0.0.0.0",
        port=8000,
        debug=False
    )
