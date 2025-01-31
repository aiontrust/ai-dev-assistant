import speech_recognition as sr
import subprocess
import webbrowser
import time

# Function to recognize speech from microphone
def recognize_speech():
    recognizer = sr.Recognizer()
    
    with sr.Microphone() as source:
        print("Listening for commands...")
        recognizer.adjust_for_ambient_noise(source)  # Adjust for ambient noise
        audio = recognizer.listen(source)  # Capture audio

    try:
        # Convert speech to text using Google's Web Speech API
        command = recognizer.recognize_google(audio)
        print(f"Recognized command: {command}")
        return command.lower()
    except sr.UnknownValueError:
        print("Sorry, I could not understand the audio.")
        return ""
    except sr.RequestError:
        print("Sorry, the speech recognition service is down.")
        return ""

# Function to execute voice commands
def execute_command(command):
    if "open browser" in command:
        print("Opening browser...")
        subprocess.run(["start", "chrome"])  # For Windows; use 'xdg-open' for Linux or 'open' for macOS
    elif "search" in command:
        search_query = command.replace("search", "").strip()
        search_url = f"https://www.google.com/search?q={search_query}"
        webbrowser.open(search_url)
        print(f"Searching for: {search_query}")
    elif "play music" in command:
        print("Playing music...")
        subprocess.run(["start", "spotify"])  # Example for Spotify on Windows
    elif "mute" in command:
        print("Muting the system...")
        subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "mute"]) # For Linux
        subprocess.run(["nircmd.exe", "mutesysvolume", "1"]) # For Windows 
    elif "unmute" in command:
        print("Unmuting the system...")
        subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "unmute"]) # For Linux
        subprocess.run(["nircmd.exe", "mutesysvolume", "0"]) # For Windows
    elif "volume up" in command:
        print("Increasing the volume...")
        subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "5%+"]) # For Linux
        subprocess.run(["nircmd.exe", "changesysvolume", "5000"]) # For Windows
    elif "volume down" in command:
        print("Decreasing the volume...")
        subprocess.run(["amixer", "-D", "pulse", "sset", "Master", "5%-"]) # For Linux  
        subprocess.run(["nircmd.exe", "changesysvolume", "-5000"]) # For Windows
    elif "exit" in command or "quit" in command:
        print("Goodbye!")
        exit()  # Exit the program
    else:
        print("Command not recognized.")

# Main function to start listening and process voice commands
def main():
    while True:
        command = recognize_speech()  # Recognize speech
        if command:  # If command is not empty
            execute_command(command)  # Execute the command
        time.sleep(1)  # Add a slight delay before listening again

if __name__ == "__main__":
    main()
