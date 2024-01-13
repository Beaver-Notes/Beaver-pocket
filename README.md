# Beaver-notes-pocket

Hey there! 👋 

Welcome to the Beaver Notes Pocket repository. This app is your note-taking companion, much like Beaver Notes on your PC but for your phone. It should support exporting and importing data between the desktop and mobile client so that you can access your notes wherever you want.

> 🔩 Please be aware that this application is still under heavy development. Therefore, you might want to backup the notes you take with it and check this repository weekly for updates and new features. Not everything works, so just scroll below to see if the state of the app fits your needs or not.

![Pocket](https://github.com/Daniele-rolli/Beaver-notes-pocket/assets/67503004/a8f4b024-6893-4c3e-a588-c4fe8fd2c6ba)

## What Works 

- [x] Headinds
- [x] CodeBlock
- [x] Syntax highlighting
- [x] Paragraphs
- [x] Highlight
- [x] Bold
- [x] Underline
- [x] Strikethorugh
- [x] Inline Block
- [x] Toolbar
- [x] Search
- [x] Images
- [x] QuoteBlock
- [x] Lists
- [x] Archive
- [x] Bookmark
- [x] Links
- [x] Exporting data to Beavernotes 
      
## Kinda Works
- [ ] Tags (Needs tighter integration with Tiptap)
- [ ] Dark Mode (No toggle is available)

## Doesn't work / not implemented 

- [ ] Importing data from Beavernotes (Might not work due to the lack of certain features).
- [ ] Note Linking

## To set up your machine for running Beaver Notes Pocket, follow these steps:

### Prerequisites:

- Node.js 18 or higher
- Yarn
- Visual Studio Code (VSCode) with the Ionic plugin
- Xcode (for iOS development) and/or Android Studio (for Android development)

### Installation Steps:

##### Clone the Repository: 
Start by cloning the Beaver Notes Pocket repository to your local machine. You can do this using Git by running the following command in your terminal:
```
git clone https://github.com/your-repo-url.git
```
##### Install Dependencies: 
Navigate to the cloned repository directory using your terminal and install the project's dependencies using Yarn. Run the following command:
```
cd beaver-notes-pocket
```
```
yarn install
```
##### Open in VSCode: 
Open the project folder in Visual Studio Code (VSCode) if it's not already open. Ensure you have the Ionic plugin installed in VSCode to work with Ionic projects effectively.

##### iOS and Android Setup (Optional): 
If you intend to develop for both iOS and Android, make sure you have Xcode (for iOS) and/or Android Studio (for Android) installed. Set up the necessary emulators or connect physical devices for testing.
##### Run the App: 
To run Beaver Notes Pocket on your local development server, use the following command:
```
ionic serve
```
This will launch the app in your default web browser for development.
##### Platform-Specific Builds (Optional): 
If you want to build the app for iOS or Android specifically, you can use Ionic's commands for that purpose. For example, to build an iOS app, you can use:
```
ionic build ios
```
And for Android:
```
ionic build android
```
These commands will generate platform-specific build files in the respective platform directories.

![Alt](https://repobeats.axiom.co/api/embed/abb7d5b9c7ad81ba2e76f249b607361b00150616.svg "Repobeats analytics image")
