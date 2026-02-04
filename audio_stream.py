import pyaudio
import numpy as np
import librosa
import warnings

warnings.filterwarnings("ignore")

# --- SETTINGS FROM YOUR LIST ---
MIC_ID = 2     # Microphone Array (MME)
CABLE_ID = 6   # CABLE Input (MME)
RATE = 48000   # Matches your Windows Advanced settings
CHANNELS = 2   # Matches your 'Microphone Array' properties
CHUNK = 1024   # Buffer size
PITCH_STEPS = -4 # Deep voice effect

p = pyaudio.PyAudio()

def callback(in_data, frame_count, time_info, status):
    # Convert buffer to float32 numpy array
    audio_data = np.frombuffer(in_data, dtype=np.float32)
    
    # Process the audio (Pitch Shifting)
    # librosa handles the 2-channel (stereo) data automatically
    modified_audio = librosa.effects.pitch_shift(
        audio_data, 
        sr=RATE, 
        n_steps=PITCH_STEPS
    )
    
    return (modified_audio.tobytes(), pyaudio.paContinue)

try:
    print(f"Starting Stream: Mic({MIC_ID}) -> Cable({CABLE_ID}) using MME API")
    stream = p.open(
        format=pyaudio.paFloat32,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        output=True,
        input_device_index=MIC_ID,
        output_device_index=CABLE_ID,
        frames_per_buffer=CHUNK,
        stream_callback=callback
    )

    stream.start_stream()
    print("SUCCESS! Voice changer is active.")
    print("Set your Discord/App input to 'CABLE Output'.")
    
    while stream.is_active():
        pass

except Exception as e:
    print(f"\nError: {e}")
finally:
    p.terminate()