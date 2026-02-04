
import sounddevice as sd
from processor import EffectEngine
import config

class AudioStream:
    def __init__(self, input_id, output_id, engine: EffectEngine):
        self.engine = engine
        self.input_id = input_id
        self.output_id = output_id
        self.stream = None

    def _callback(self, indata, outdata, frames, time, status):
        if status:
            print(f"Error: {status}")
        
        # Process the mono input
        processed = self.engine.process(indata, config.SAMPLERATE)
        outdata[:] = processed

    def start(self):
        self.stream = sd.Stream(
            device=(self.input_id, self.output_id),
            samplerate=config.SAMPLERATE,
            blocksize=config.BLOCKSIZE,
            channels=config.CHANNELS,
            callback=self._callback
        )
        self.stream.start()

    def stop(self):
        if self.stream:
            self.stream.stop()
            self.stream.close()
