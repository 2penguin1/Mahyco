import os
import cv2
import numpy as np
import tifffile
import pandas as pd
from sahi import AutoDetectionModel
from sahi.predict import get_sliced_prediction

# --- CONFIGURATION ---
ORTHO_PATH = r"F:\Cotton\Mahyco Demands\New_model_testing_by_shruti\DATASET\new_dataset_2026\new_ortho_12_flight.tif"
YOLO_WEIGHTS = os.path.join(os.path.dirname(__file__), "best.pt")
BASE_OUTPUT = r"F:\Cotton\Mahyco Demands\New_model_testing_by_shruti\plant_extracted_02\shruti_approach\2_stage_detection\Extracted_Crops_Phase"
ANNOTATED_ORTHO_PATH = os.path.join(BASE_OUTPUT, "orthomosaic_with_bboxes.tif")
ANNOTATED_PREVIEW_PATH = os.path.join(BASE_OUTPUT, "orthomosaic_with_bboxes_preview.jpg")

# --- 1. SETUP DIRECTORIES ---
whole_plant_dir = os.path.join(BASE_OUTPUT, "Whole_Plant_Crops")
top_focus_dir = os.path.join(BASE_OUTPUT, "Top_Focus_Crops")

os.makedirs(whole_plant_dir, exist_ok=True)
os.makedirs(top_focus_dir, exist_ok=True)

# --- 2. LOAD YOLO MODEL ---
print(f"Loading YOLOv11m model via SAHI from: {YOLO_WEIGHTS}")
detection_model = AutoDetectionModel.from_pretrained(
    model_type='yolov11',
    model_path=YOLO_WEIGHTS,
    confidence_threshold=0.25,
    device="cuda:0", 
)

# --- 3. LOAD ORTHOMOSAIC ---
print("Reading Massive Orthomosaic (TIF)...")
img = tifffile.imread(ORTHO_PATH)
# Ensure it's 3-channel RGB for OpenCV
img_rgb = np.ascontiguousarray(img[:, :, :3], dtype=np.uint8)
print(f"Image Loaded. Resolution: {img_rgb.shape}")

# --- 4. SLICED INFERENCE ---
print("Running Sliced Detection... This may take a few minutes.")
result = get_sliced_prediction(
    img_rgb,
    detection_model,
    slice_height=640,
    slice_width=640,
    overlap_height_ratio=0.2,
    overlap_width_ratio=0.2,
    postprocess_type="NMS"
)

# --- 5. CROP AND SAVE ---
print(f"Found {len(result.object_prediction_list)} total detections. Saving crops...")

# Save a copy of the orthomosaic with all predicted bounding boxes.
annotated_img = cv2.cvtColor(img_rgb.copy(), cv2.COLOR_RGB2BGR)
for pred in result.object_prediction_list:
    label = pred.category.name
    x1, y1, x2, y2 = map(int, pred.bbox.to_xyxy())

    x1 = max(0, x1)
    y1 = max(0, y1)
    x2 = min(annotated_img.shape[1], x2)
    y2 = min(annotated_img.shape[0], y2)

    if label == "Whole_Plant":
        color = (0, 255, 0)
    else:
        color = (0, 0, 255)

    cv2.rectangle(annotated_img, (x1, y1), (x2, y2), color, 4)
    cv2.putText(
        annotated_img,
        label,
        (x1, max(35, y1 - 10)),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        color,
        2,
        cv2.LINE_AA,
    )

tifffile.imwrite(ANNOTATED_ORTHO_PATH, annotated_img, bigtiff=True, compression="deflate")

preview_scale = 0.1
annotated_preview = cv2.resize(annotated_img, (0, 0), fx=preview_scale, fy=preview_scale)
cv2.imwrite(ANNOTATED_PREVIEW_PATH, annotated_preview)
print(f"Annotated orthomosaic saved at: {ANNOTATED_ORTHO_PATH}")
print(f"Annotated preview saved at: {ANNOTATED_PREVIEW_PATH}")

for i, pred in enumerate(result.object_prediction_list):
    label = pred.category.name  # 'Whole_Plant' or 'Top_Focus'
    bbox = pred.bbox.to_xyxy()  # [x1, y1, x2, y2]
    conf = pred.score.value
    
    x1, y1, x2, y2 = map(int, bbox)
    
    # Crop logic with boundary safety
    crop = img_rgb[max(0, y1):min(img_rgb.shape[0], y2), 
                   max(0, x1):min(img_rgb.shape[1], x2)]
    
    if crop.size == 0:
        continue

    # Define save path based on label
    if label == "Whole_Plant":
        save_path = os.path.join(whole_plant_dir, f"plant_{i}_conf_{conf:.2f}.jpg")
    else: # Top_Focus
        save_path = os.path.join(top_focus_dir, f"top_{i}_conf_{conf:.2f}.jpg")
    
    # Save (Convert RGB back to BGR for OpenCV imwrite)
    cv2.imwrite(save_path, cv2.cvtColor(crop, cv2.COLOR_RGB2BGR))

print(f"\nPhase 1 Complete!")
print(f"Whole Plant Crops: {len(os.listdir(whole_plant_dir))}")
print(f"Top Focus Crops: {len(os.listdir(top_focus_dir))}")
print(f"All images saved in: {BASE_OUTPUT}")
