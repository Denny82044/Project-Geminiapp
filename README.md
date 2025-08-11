# Project Geminiapp

A project working to bring full Google Gemini support to WhatsApp.

# Requirements
A phone number, Node.js (Windows, Linux, Termux, etc.), and a Google Gemini key. (obtained at https://aistudio.google.com/app/apikey)

# Instructions
1. Once you have your Google Gemini key, put it in the .env file.
2. Open a cmd prompt where index.js is located, and run "npm init -y" and then
"npm install @whiskeysockets/baileys qrcode-terminal openai dotenv"
3. Run the script (using "node index.js in the folder with the script located within it), and on WhatsApp find your linked devices page.

# Android
4. Open WhatsApp, click the 3 lines on the upper right hand side and "Linked devices" and then scan the qr code in the terminal.
5. Now use the wake word "Gemini" in any chat to talk to Gemini.
# iOS
4. Open WhatsApp, go to settings in the bottom right corner, and click linked devices, then scan the qr code present in the terminal.
5. Now use the wake word "Gemini" in any chat to talk to Gemini.
