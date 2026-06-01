import streamlit as st
import cv2
import numpy as np
from PIL import Image
import tempfile
import os

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from inference import detect_braille_from_frame
from utils.speech import text_to_speech

# Page config
st.set_page_config(
    page_title="Vision For All",
    page_icon="👁️",
    layout="centered"
)

st.title("👁️ Vision For All")
st.markdown("### AI-Powered Braille Reader")
st.markdown("Upload a Braille image to detect letters and hear them spoken aloud.")
st.divider()

# Mode selection
mode = st.radio("Choose input mode:", ["📁 Upload Image", "📷 Use Webcam"])

result_text = ""

if mode == "📁 Upload Image":
    uploaded = st.file_uploader("Upload a Braille image", type=["png", "jpg", "jpeg"])

    if uploaded:
        # Show image
        image = Image.open(uploaded)
        st.image(image, caption="Uploaded Image", use_column_width=True)

        # Convert to OpenCV format
        img_array = np.array(image.convert("RGB"))
        frame = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        # Detect
        with st.spinner("Detecting Braille..."):
            result_text = detect_braille_from_frame(frame)

        st.success(f"Result: **{result_text}**")

elif mode == "📷 Use Webcam":
    photo = st.camera_input("Take a photo of Braille")

    if photo:
        image = Image.open(photo)
        img_array = np.array(image.convert("RGB"))
        frame = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        with st.spinner("Detecting Braille..."):
            result_text = detect_braille_from_frame(frame)

        st.success(f"Result: **{result_text}**")

# Speech output
if result_text:
    st.divider()
    if st.button("🔊 Speak Result"):
        with st.spinner("Generating speech..."):
            audio_path = text_to_speech(result_text)
            if audio_path:
                with open(audio_path, "rb") as f:
                    st.audio(f.read(), format="audio/mp3")
                os.unlink(audio_path)