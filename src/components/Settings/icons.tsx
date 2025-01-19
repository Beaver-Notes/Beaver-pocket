import React, { useState } from "react";
import { AppIcon } from "@capacitor-community/app-icon";

// Cute names associated with each icon
const iconNames = [
  { name: "AppIcon 1", cuteName: "Gift Yellow" },
  { name: "AppIcon 2", cuteName: "Gift Green" },
  { name: "AppIcon 3", cuteName: "Inspiration Dark" },
  { name: "AppIcon 4", cuteName: "Inspiration Light" },
  { name: "AppIcon 6", cuteName: "Rainbow" },
  { name: "AppIcon 8", cuteName: "Rainbow Light" },
  { name: "AppIcon 5", cuteName: "Rainbow Dark" },
  { name: "AppIcon 7", cuteName: "Matte" },
  { name: "AppIcon 9", cuteName: "Dev" },
  { name: "AppIcon 10", cuteName: "Reindeer" },
  { name: "AppIcon 11", cuteName: "Christmas " },
];

const App: React.FC = () => {
  const [currentIcon, setCurrentIcon] = useState<string | null>(null);

  const changeIcon = async (iconName: string) => {
    try {
      await AppIcon.change({ name: iconName, suppressNotification: true });
      setCurrentIcon(iconName);
    } catch (error) {
      console.error("Error changing icon:", error);
    }
  };

  const resetIcon = async () => {
    try {
      await AppIcon.reset({
        suppressNotification: true,
        disable: iconNames.map((icon) => icon.name),
      });
      setCurrentIcon(null);
    } catch (error) {
      console.error("Error resetting icon:", error);
    }
  };

  return (
    <div className="p-6 space-y-6 font-sans mb-24">
      <h1 className="text-3xl font-bold text-center">App Icon</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Default Icon Button */}
        <button
          className={`w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center ${
            currentIcon === "AppIcon" ? "ring-2 ring-amber-400" : ""
          }`}
          aria-label="Default App Icon"
          onClick={() => resetIcon()}
        >
          <img
            src="./icons/AppIcon.png"
            alt="AppIcon"
            className="w-14 h-14 rounded-xl"
          />
          <p className="text-2xl pl-2 py-1 font-bold">Default</p>
        </button>

        {/* App Icon 1 to 11 Buttons */}
        {iconNames.map(({ name, cuteName }) => (
          <button
            key={name}
            className={`w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center ${
              currentIcon === name ? "ring-2 ring-amber-400" : ""
            }`}
            onClick={() => changeIcon(name)}
            aria-label={cuteName}
          >
            <img
              src={`./icons/${name}.png`}
              alt={cuteName}
              className="w-14 h-14 rounded-xl"
            />
            <p className="text-2xl pl-2 py-1 font-bold">{cuteName}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default App;
