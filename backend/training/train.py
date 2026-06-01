from ultralytics import YOLO
import os

# Paths
DATA_YAML = os.path.abspath("backend/dataset/breille/data.yaml")

print("Starting YOLOv8 training...")
print(f"Dataset: {DATA_YAML}")

# Load YOLOv8 nano model (fastest for CPU)
model = YOLO("yolov8n.pt")

# Train
results = model.train(
    data=DATA_YAML,
    epochs=30,
    imgsz=640,
    batch=8,
    name="braille_yolo",
    project="backend/training/results",
    patience=10,
    device="cpu",
    verbose=True
)

print("Training complete!")
print("Best model: backend/training/results/braille_yolo/weights/best.pt")