import pyaudio
import numpy as np
import librosa
from scipy.signal import lfilter, butter

# --- CONFIGURATION ---
MIC_ID = 2
CABLE_ID = 6
RATE = 48000
CHANNELS = 2
CHUNK = 1024

# Voice Presets
PRESETS = {
    "deep": {"pitch": -5, "name": "Deep Man"},
    "chipmunk": {"pitch": 6, "name": "Chipmunk"},
    "robot": {"pitch": 0, "name": "Robot"}, # We add distortion later
    "original": {"pitch": 0, "name": "Clear"}
}
current_mode = "deep"

def noise_gate(audio_data, threshold=0.01):
    """Silences audio below a certain volume threshold."""
    audio_data[np.abs(audio_data) < threshold] = 0
    return audio_data

def callback(in_data, frame_count, time_info, status):
    audio_data = np.frombuffer(in_data, dtype=np.float32)
    
    # 1. Background Noise Fix (Noise Gate)
    clean_audio = noise_gate(audio_data, threshold=0.02)
    
    # 2. Process Voice based on Mode
    pitch = PRESETS[current_mode]["pitch"]
    
    if pitch != 0:
        modified_audio = librosa.effects.pitch_shift(clean_audio, sr=RATE, n_steps=pitch)
    else:
        modified_audio = clean_audio
        
    return (modified_audio.tobytes(), pyaudio.paContinue)

# --- STARTING THE ENGINE ---
p = pyaudio.PyAudio()
stream = p.open(format=pyaudio.paFloat32, channels=CHANNELS, rate=RATE,
                input=True, output=True, input_device_index=MIC_ID,
                output_device_index=CABLE_ID, stream_callback=callback)

print(f"Engine Live: {PRESETS[current_mode]['name']} mode active.")