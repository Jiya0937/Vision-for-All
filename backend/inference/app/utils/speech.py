from gtts import gTTS
import os
import tempfile

def text_to_speech(text: str, lang: str = "en") -> str:
    """
    Convert text to speech and save as mp3.
    Returns the path to the audio file.
    """
    if not text or text.strip() == "":
        return None

    # Create a temporary file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
    tmp_path = tmp.name
    tmp.close()

    # Generate speech
    tts = gTTS(text=text, lang=lang, slow=False)
    tts.save(tmp_path)

    return tmp_path

def speak_offline(text: str):
    """
    Speak text offline using pyttsx3 (no internet needed).
    """
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)   # speed
        engine.setProperty('volume', 1.0) # volume
        engine.say(text)
        engine.runAndWait()
    except Exception as e:
        print(f"Offline speech error: {e}")