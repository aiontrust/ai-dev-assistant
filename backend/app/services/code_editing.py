import speech_recognition as sr
import subprocess

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
    if "open notepad" in command:
        print("Opening Notepad...")
        subprocess.run(["notepad.exe"])
    elif "launch vs code" in command:
        print("Launching Visual Studio Code...")
        subprocess.run(["code"])
    elif "run python script" in command:
        print("Running Python script...")
        subprocess.run(["python", "script.py"])
    elif "run java program" in command:
        print("Running Java program...")
        subprocess.run(["java", "program.java"])
    elif "run c program" in command:
        print("Running C program...")
        subprocess.run(["gcc", "program.c", "-o", "program"])
        subprocess.run(["./program"])
    elif "open terminal" in command:
        print("Opening Terminal...")
        subprocess.run(["gnome-terminal"])  # For Linux
        subprocess.run(["cmd"])  # For Windows
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


    