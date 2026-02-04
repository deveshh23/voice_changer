
import sounddevice as sd
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DeviceManager")

def get_devices():
    """Returns a list of available audio devices."""
    return sd.query_devices()

def select_devices():
    """
    Auto-detects Microphone and VB-CABLE Input.
    Returns (input_id, output_id)
    """
    devices = get_devices()
    input_id = None
    output_id = None

    for i, dev in enumerate(devices):
        name = dev['name'].lower()
        if dev['max_input_channels'] > 0 and input_id is None:
            if "mic" in name or "input" in name:
                input_id = i
        
        if dev['max_output_channels'] > 0:
            if "cable input" in name or "vb-audio" in name:
                output_id = i

    # Fallback to defaults if specific hardware not found
    if input_id is None:
        input_id = sd.default.device[0]
    if output_id is None:
        output_id = sd.default.device[1]

    logger.info(f"Selected Input: {devices[input_id]['name']}")
    logger.info(f"Selected Output: {devices[output_id]['name']}")
    
    return input_id, output_id
