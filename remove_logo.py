import subprocess
import os

def remove_gemini_logo(input_file, output_file):
    print(f"Processing {input_file} to remove logo...")
    # The video is 1920x1080. The logo is in the bottom right corner.
    # We apply a delogo filter to a 160x160 region at the bottom right.
    # x = 1920 - 160 = 1760, y = 1080 - 160 = 920
    x, y, w, h = 1750, 910, 160, 160
    
    command = [
        "ffmpeg",
        "-y", # Overwrite output
        "-i", input_file,
        "-vf", f"delogo=x={x}:y={y}:w={w}:h={h}",
        "-c:a", "copy", # Copy audio stream without re-encoding
        output_file
    ]
    
    try:
        subprocess.run(command, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        print(f"Successfully created {output_file} with logo removed!")
    except subprocess.CalledProcessError as e:
        print("Error processing video:")
        print(e.stderr.decode('utf-8'))

if __name__ == "__main__":
    input_video = "Pirate_ship_sailing_ocean_map_20260926111805.mp4"
    output_video = os.path.join("apps", "web", "public", "pirate-intro.mp4")
    
    if os.path.exists(input_video):
        remove_gemini_logo(input_video, output_video)
    else:
        print(f"Input file {input_video} not found!")
