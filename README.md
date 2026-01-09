<h1 align="center">Beaver Pocket</h1>

<div align="center">
<img src="https://raw.githubusercontent.com/Beaver-Notes/beaver-website/main/src/assets/logo.png" alt="Beaver Logo" width="100">

<h3><b>Fast. Private. Local-first.</b></h3>
<p>Notes stay on your device. No sign-ups, no tracking, no unnecessary complexity.</p>

[Website](https://beavernotes.com) | [Blog](https://blog.beavernotes.com) | [Docs](https://docs.beavernotes.com) | [Downloads](https://beavernotes.com/#/Download) | [Mastodon](https://mastodon.social/@Beavernotes) | [Reddit](https://www.reddit.com/r/BeaverNotes/) | [Bluesky](https://bsky.app/profile/beavernotes.com)

</div>

Beaver Pocket is a privacy-focused notes app built for Android and iOS. **Your notes** are stored **on device**, ensuring complete privacy and **control over your data**.

![Beaver Pocket demo](https://github.com/user-attachments/assets/0acaffb5-cbf1-4c13-ad97-9ab4eaae7a12)

> [!IMPORTANT]  
> Beaver Pocket is still in the release candidate stage. While bugs are far less common than in alpha or beta versions, it's still good practice to back up your data and report any issues. Thank you!  

## 🎯 Goals  

- **Privacy-Respecting:** All your data is stored on your device.  
- **User-Friendly:** A simple and intuitive interface makes note-taking a delightful experience.  
- **Tags:** Organize notes by using tags to group related content.  
- **Note Linking:** Create a web of interconnected ideas and notes.  
- **Locked Notes:** Keep your thoughts and ideas private, ensuring only you can access them.  
- **Sync Your Notes:** Sync your notes across devices using the sync provider you trust most.  
- **Community-Driven:** Made for the community, by the community.  
- **Discover more on** [**our website**](https://beavernotes.com/#/Pocket).  

## 💻 Looking for a desktop version?  

Beaver Pocket isn’t just for mobile; it also has a desktop version called [**Beaver Notes**](https://beavernotes.com)!  

## Setting up your machine to run Beaver Notes Pocket  

### Prerequisites:  

- Node.js 18 or higher  
- Yarn  
- Visual Studio Code (VSCode) with the Ionic plugin  
- Xcode (for iOS development) and/or Android Studio (for Android development)  

### Installation Steps:  

#### Clone the Repository:  
Start by cloning the Beaver Notes Pocket repository to your local machine. You can do this using Git by running the following command in your terminal:  
```
git clone https://github.com/your-repo-url.git
```
#### Install Dependencies:  
Navigate to the cloned repository directory using your terminal and install the project's dependencies using Yarn. Run the following commands:  
```
cd beaver-notes-pocket
yarn install
```
#### Open in VSCode:  
Open the project folder in Visual Studio Code (VSCode). Ensure you have the Ionic plugin installed to work with Ionic projects effectively.  

#### iOS and Android Setup (Optional):  
If you intend to develop for both iOS and Android, make sure you have Xcode (for iOS) and/or Android Studio (for Android) installed. Set up the necessary emulators or connect physical devices for testing.  

#### Run the App:  
To run Beaver Notes Pocket on your local development server, use the following command:  
```
ionic serve
```
This will launch the app in your default web browser for development.  

#### Platform-Specific Builds (Optional):  
If you want to build the app for iOS or Android specifically, you can use Ionic's commands for that purpose. For example, to build an iOS app, run:  
```
ionic build ios
```
And for Android:  
```
ionic build android
```
These commands will generate platform-specific build files in the respective platform directories.  
