import speech_recognition as sr
import subprocess
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
    if "connect to wifi" in command:
        print("Connecting to WiFi...")
        subprocess.run(["nmcli", "device", "wifi", "connect", "SSID", "password", "PASSWORD"])  # For Linux
        subprocess.run(["netsh", "wlan", "connect", "name=SSID", "password=PASSWORD"])  # For Windows
    elif "disconnect from wifi" in command:
        print("Disconnecting from WiFi...")
        subprocess.run(["nmcli", "device", "disconnect", "wlan0"])  # For Linux 
        subprocess.run(["netsh", "wlan", "disconnect"])  # For Windows
    elif "check internet speed" in command:
        print("Checking internet speed...")
        subprocess.run(["speedtest-cli"])  # Requires speedtest-cli package to be installed
    elif "connect to vpn" in command:
        print("Connecting to VPN...")
        subprocess.run(["surfshark", "connect"])  # Requires Surfshark CLI to be installed
    elif "check vpn status" in command:
        print("Checking VPN status...")
        subprocess.run(["surfshark", "status"])  # Requires Surfshark CLI to be installed   
    elif "change vpn location" in command:
        location = command.replace("change vpn location to", "").strip()
        print(f"Changing VPN location to {location}...")
        subprocess.run(["surfshark", "connect", location])  # Requires Surfshark CLI to be installed
    elif "disconnect from vpn" in command:
        print("Disconnecting from VPN...")
        subprocess.run(["surfshark", "disconnect"])  # Requires Surfshark CLI to be installed
    elif "connect to server" in command:
        server = command.replace("connect to server", "").strip()
        print(f"Connecting to server {server}...")
        subprocess.run(["ssh", "user@server"])  # For Linux
        subprocess.run(["ssh", "user@server"])  # For Windows
    elif "check server status" in command:
        server = command.replace("check server status of", "").strip()
        print(f"Checking server status of {server}...")
        subprocess.run(["ping", server])  # For Linux
        subprocess.run(["ping", server])  # For Windows
    elif "transfer files to server" in command:
        print("Transferring files to server...")
        subprocess.run(["scp", "file.txt", "user@server:/path"])  # For Linux
        subprocess.run(["scp", "file.txt", "user@server:/path"])  # For Windows
    elif "disconnect from server" in command:
        print("Disconnecting from server...")
        subprocess.run(["exit"])  # For Linux   
        subprocess.run(["exit"])  # For Windows
    elif "open firewall settings" in command:
        print("Opening firewall settings...")
        subprocess.run(["firewall-config"])  # For Linux
        subprocess.run(["firewall.cpl"])  # For Windows
    elif "enable firewall" in command:
        print("Enabling firewall...")
        subprocess.run(["ufw", "enable"])  # For Linux
        subprocess.run(["netsh", "advfirewall", "set", "allprofiles", "state", "on"])  # For Windows
    elif "check firewall status" in command:
        print("Checking firewall status...")
        subprocess.run(["ufw", "status"])  # For Linux
        subprocess.run(["netsh", "advfirewall", "show", "allprofiles"])  # For Windows
    elif "disable firewall" in command:
        print("Disabling firewall...")
        subprocess.run(["ufw", "disable"])  # For Linux 
        subprocess.run(["netsh", "advfirewall", "set", "allprofiles", "state", "off"])  # For Windows   
    elif "open network settings" in command:
        print("Opening network settings...")
        subprocess.run(["nm-connection-editor"])  # For Linux
        subprocess.run(["ncpa.cpl"])  # For Windows
    elif "close network settings" in command:
        print("Closing network settings...")
        subprocess.run(["exit"])  # For Linux
        subprocess.run(["exit"])  # For Windows
    elif "connect to virtual machine" in command:
        print("Connecting to virtual machine...")
        subprocess.run(["virt-viewer", "vm-name"]) # For Linux
        subprocess.run(["vmconnect", "vm-name"]) # For Windows
    elif "disconnect from virtual machine" in command:
        print("Disconnecting from virtual machine...")
        subprocess.run(["exit"])  # For Linux
        subprocess.run(["exit"])  # For Windows
    elif "stop virtual machine" in command:
        print("Stopping virtual machine...")
        subprocess.run(["virsh", "shutdown", "vm-name"]) # For Linux
        subprocess.run(["vmshutdown", "vm-name"]) # For Windows
    elif "start virtual machine" in command:
        print("Starting virtual machine...")
        subprocess.run(["virsh", "start", "vm-name"]) # For Linux
        subprocess.run(["vmstart", "vm-name"]) # For Windows
    elif "connect to cloud server" in command:
        print("Connecting to cloud server...")
        subprocess.run(["ssh", "user@server"])  # For Linux
        subprocess.run(["ssh", "user@server"])  # For Windows
    elif "disconnect from cloud server" in command:
        print("Disconnecting from cloud server...")
        subprocess.run(["exit"])  # For Linux
        subprocess.run(["exit"])  # For Windows
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
