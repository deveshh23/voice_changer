import pyaudio
import numpy as np
import librosa
from scipy.signal import butter, lfilter
from flask import Flask
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import threading
import warnings

warnings.filterwarnings("ignore")

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# --- AUDIO SETTINGS (from your working audio_stream.py) ---
MIC_ID = 2          # Microphone Array (MME)
CABLE_ID = 6        # CABLE Input (MME)
RATE = 48000        # Matches your Windows Advanced settings
CHANNELS = 2        # Stereo (matching Microphone Array properties)
CHUNK = 1024        # Buffer size

# Voice State - Can be controlled from frontend
current_mode = {
    "pitch": -4,      # Default: Deep voice (from your audio_stream.py)
    "gain": 1.5,      # Volume boost
    "noise_gate": 0.015,  # Noise threshold
    "filter_enabled": True
}

# PyAudio instance
p = None
stream = None
is_streaming = False

def apply_filters(data):
    """Apply noise gate and gain boost"""
    data_writable = data.copy()
    
    # 1. Noise Gate (remove background noise)
    if current_mode["filter_enabled"]:
        data_writable[np.abs(data_writable) < current_mode["noise_gate"]] = 0
    
    # 2. GAIN BOOST (make voice louder for WhatsApp/Discord)
    data_writable = data_writable * current_mode["gain"]
    
    # 3. Low-pass filter (optional - smooths harsh frequencies)
    if current_mode["filter_enabled"]:
        b, a = butter(4, 0.8, btype='low')
        data_writable = lfilter(b, a, data_writable)
    
    return data_writable

def audio_callback(in_data, frame_count, time_info, status):
    """
    Real-time audio processing callback
    This runs on every audio chunk (very fast!)
    """
    try:
        # Convert buffer to float32 numpy array
        audio_data = np.frombuffer(in_data, dtype=np.float32)
        
        # Apply filters (noise gate, gain boost)
        filtered_audio = apply_filters(audio_data)
        
        # Apply Pitch Shift (the main voice effect)
        if current_mode["pitch"] != 0:
            # librosa handles stereo (2-channel) automatically
            modified_audio = librosa.effects.pitch_shift(
                filtered_audio,
                sr=RATE,
                n_steps=current_mode["pitch"]
            )
        else:
            modified_audio = filtered_audio
        
        # Return processed audio
        return (modified_audio.astype(np.float32).tobytes(), pyaudio.paContinue)
    
    except Exception as e:
        print(f"⚠️ Audio callback error: {e}")
        return (in_data, pyaudio.paContinue)  # Pass through on error

def start_audio_stream():
    """
    Initialize and start the PyAudio stream
    Runs in a background thread
    """
    global p, stream, is_streaming
    
    try:
        p = pyaudio.PyAudio()
        
        print("=" * 60)
        print(f"🎙️  Starting Audio Stream...")
        print(f"📥 Input:  Device {MIC_ID} (Microphone Array)")
        print(f"📤 Output: Device {CABLE_ID} (CABLE Input)")
        print(f"⚙️  Rate: {RATE}Hz | Channels: {CHANNELS} | Chunk: {CHUNK}")
        print("=" * 60)
        
        stream = p.open(
            format=pyaudio.paFloat32,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            output=True,
            input_device_index=MIC_ID,
            output_device_index=CABLE_ID,
            frames_per_buffer=CHUNK,
            stream_callback=audio_callback
        )
        
        stream.start_stream()
        is_streaming = True
        
        print("✅ Audio Stream ACTIVE!")
        print("🎤 Speak into your microphone - voice is being processed")
        print("🔊 Set Discord/WhatsApp input to 'CABLE Output'")
        print("=" * 60)
        
        # Keep the audio thread alive
        while stream.is_active() and is_streaming:
            socketio.sleep(0.1)
            
    except Exception as e:
        print(f"❌ Audio Stream Error: {e}")
        print(f"💡 Make sure device IDs are correct!")
        is_streaming = False

def stop_audio_stream():
    """Stop the audio stream"""
    global stream, p, is_streaming
    
    is_streaming = False
    
    if stream:
        stream.stop_stream()
        stream.close()
    
    if p:
        p.terminate()
    
    print("🛑 Audio stream stopped")

# ============================================
# SOCKET.IO EVENTS (Frontend Communication)
# ============================================

@socketio.on('connect')
def handle_connect():
    """When frontend connects"""
    print("✅ Frontend connected!")
    emit('status', {
        'msg': 'Connected to backend',
        'pitch': current_mode['pitch'],
        'streaming': is_streaming
    })

@socketio.on('disconnect')
def handle_disconnect():
    """When frontend disconnects"""
    print("⚠️ Frontend disconnected")

@socketio.on('change_voice')
def handle_voice_change(data):
    """
    Handle voice change requests from frontend
    Data format: {'pitch': -5} or {'pitch': 6}
    """
    global current_mode
    
    pitch = data.get('pitch', 0)
    current_mode["pitch"] = pitch
    
    print(f"🎛️  Voice changed to pitch: {pitch}")
    
    emit('status', {
        'msg': f"Voice updated to pitch {pitch}",
        'pitch': pitch
    })

@socketio.on('change_gain')
def handle_gain_change(data):
    """Change volume boost"""
    global current_mode
    
    gain = data.get('gain', 1.5)
    current_mode["gain"] = gain
    
    print(f"🔊 Gain changed to: {gain}")
    emit('status', {'msg': f"Gain updated to {gain}"})

@socketio.on('change_noise_gate')
def handle_noise_gate_change(data):
    """Change noise gate threshold"""
    global current_mode
    
    threshold = data.get('threshold', 0.015)
    current_mode["noise_gate"] = threshold
    
    print(f"🚪 Noise gate changed to: {threshold}")
    emit('status', {'msg': f"Noise gate updated to {threshold}"})

@socketio.on('toggle_filter')
def handle_filter_toggle(data):
    """Enable/disable filters"""
    global current_mode
    
    enabled = data.get('enabled', True)
    current_mode["filter_enabled"] = enabled
    
    print(f"🎚️ Filters {'enabled' if enabled else 'disabled'}")
    emit('status', {'msg': f"Filters {'enabled' if enabled else 'disabled'}"})

@socketio.on('get_devices')
def handle_get_devices():
    """Return available audio devices"""
    try:
        if p is None:
            temp_p = pyaudio.PyAudio()
        else:
            temp_p = p
            
        devices = []
        for i in range(temp_p.get_device_count()):
            info = temp_p.get_device_info_by_index(i)
            if info['maxInputChannels'] > 0:
                devices.append({
                    'id': i,
                    'name': info['name']
                })
        
        if p is None:
            temp_p.terminate()
            
        emit('devices_list', {'devices': devices})
    except Exception as e:
        print(f"Error getting devices: {e}")
        emit('devices_list', {'devices': []})

@socketio.on('get_status')
def handle_get_status():
    """Return current settings"""
    emit('current_settings', {
        'pitch': current_mode['pitch'],
        'gain': current_mode['gain'],
        'noise_gate': current_mode['noise_gate'],
        'filter_enabled': current_mode['filter_enabled'],
        'streaming': is_streaming
    })

# ============================================
# MAIN ENTRY POINT
# ============================================

if __name__ == '__main__':
    print("\n" + "=" * 60)
    print("🎤 VoicePulse DSP - Real-time Voice Changer")
    print("=" * 60)
    
    # Start audio processing in background thread
    audio_thread = threading.Thread(target=start_audio_stream, daemon=True)
    audio_thread.start()
    
    # Give audio thread time to initialize
    import time
    time.sleep(2)
    
    # Start Flask-SocketIO server (this blocks)
    print("🌐 Backend Server running on http://127.0.0.1:5000")
    print("📱 Open frontend in browser to control voice effects")
    print("=" * 60 + "\n")
    
    try:
        socketio.run(
            app,
            host='127.0.0.1',
            port=5000,
            allow_unsafe_werkzeug=True,
            debug=False
        )
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
    finally:
        stop_audio_stream()
