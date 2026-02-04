
from pedalboard import Pedalboard, PitchShift, Distortion, Chorus, Lowpass, Highpass, Compressor, NoiseGate, Gain, Reverb, Delay, Limiter
from threading import Lock
import numpy as np

class EffectEngine:
    """Professional modular engine synced with identity-based presets."""
    def __init__(self):
        self.lock = Lock()
        self.board = Pedalboard([
            NoiseGate(threshold_db=-50, release_ms=100),
            Highpass(cutoff_frequency_hz=80),
            Compressor(threshold_db=-18, ratio=4),
            Gain(gain_db=0),
            PitchShift(semitones=0),
            Distortion(drive_db=0),
            Chorus(rate_hz=1.0, depth=0.2),
            Delay(delay_seconds=0.2, feedback=0.3, mix=0.1),
            Reverb(room_size=0.4, wet_level=0.15, dry_level=0.85),
            Lowpass(cutoff_frequency_hz=14000),
            Limiter(threshold_db=-0.5)
        ])
        self.bypass = False
        self.master_gain_linear = 1.0

    def process(self, audio_data: np.ndarray, sample_rate: int) -> np.ndarray:
        with self.lock:
            if self.bypass:
                return audio_data
            audio_data = audio_data.astype(np.float32)
            processed = self.board(audio_data, sample_rate)
            return np.clip(processed * self.master_gain_linear, -1.0, 1.0)

    def update_identity(self, pitch_shift: float, clarity_gain: float = 0):
        """Update settings for Girl, Man, etc."""
        with self.lock:
            self.board[4].semitones = pitch_shift
            self.board[3].gain_db = clarity_gain

    def update_robot(self, drive_db: float):
        with self.lock:
            self.board[5].drive_db = drive_db
            self.board[6].rate_hz = 60.0 
            self.board[6].depth = 0.9

    def set_bypass(self, state: bool):
        with self.lock:
            self.bypass = state

    def set_gain(self, multiplier: float):
        with self.lock:
            self.master_gain_linear = multiplier
