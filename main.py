
import time
import sys
from device_manager import select_devices
from processor import EffectEngine
from audio_stream import AudioStream
from presets import PRESETS

def run_cli():
    print("=== VoicePulse Python DSP Engine ===")
    
    in_id, out_id = select_devices()
    engine = EffectEngine()
    stream = AudioStream(in_id, out_id, engine)
    
    try:
        stream.start()
        print("\nStream Active. Latency: < 20ms")
        print("Commands: [p] Pitch, [b] Bypass, [q] Quit")
        
        while True:
            cmd = input("> ").lower()
            if cmd == 'q':
                break
            elif cmd == 'b':
                engine.set_bypass(not engine.bypass)
                print(f"Bypass: {engine.bypass}")
            elif cmd == 'p':
                val = float(input("Semitones (-12 to 12): "))
                engine.update_pitch(val)
            elif cmd in PRESETS:
                p = PRESETS[cmd]
                engine.update_pitch(p['pitch'])
                engine.update_robot(p['distortion'])
                print(f"Applied preset: {cmd}")
                
    except KeyboardInterrupt:
        pass
    finally:
        stream.stop()
        print("Engine Shutdown.")

if __name__ == "__main__":
    run_cli()
