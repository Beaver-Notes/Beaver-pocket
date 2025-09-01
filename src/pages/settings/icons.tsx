import React, { useState, useEffect } from "react";
import { AppIcon } from "@capacitor-community/app-icon";
import { Capacitor } from "@capacitor/core";

const isAndroid = Capacitor.getPlatform() === "android";

const iconNames = isAndroid
  ? [
      { name: "dev", cuteName: "Dev", img: "AppIcon 1" },
      { name: "dark", cuteName: "Matte", img: "AppIcon 2" },
      { name: "rainbow", cuteName: "Rainbow", img: "AppIcon 3" },
      { name: "full", cuteName: "Full", img: "AppIcon 4" },
      { name: "space", cuteName: "Space", img: "AppIcon 6" },
      { name: "darkoutline", cuteName: "Dark", img: "AppIcon 7" },
      { name: "felt", cuteName: "Felt", img: "AppIcon 8" },
    ]
  : [
      { name: "AppIcon 1", cuteName: "Dev", img: "AppIcon 1" },
      { name: "AppIcon 2", cuteName: "Matte", img: "AppIcon 2" },
      { name: "AppIcon 3", cuteName: "Rainbow", img: "AppIcon 3" },
      { name: "AppIcon 4", cuteName: "Full", img: "AppIcon 4" },
      { name: "AppIcon 5", cuteName: "Computer", img: "AppIcon 5" },
      { name: "AppIcon 6", cuteName: "Space", img: "AppIcon 6" },
      { name: "AppIcon 7", cuteName: "Dark", img: "AppIcon 7" },
      { name: "AppIcon 8", cuteName: "Felt", img: "AppIcon 8" },
    ];

const Icons: React.FC = () => {
  const [currentIcon, setCurrentIcon] = useState<string | null>(null);

  // On mount, get the current icon name from Capacitor and set state
  useEffect(() => {
    const fetchCurrentIcon = async () => {
      try {
        const { value } = await AppIcon.getName();
        if (!value) {
          setCurrentIcon(null);
          return;
        }
        // Remove cache busting suffix like _v2
        const iconName = value.replace(/_.*$/, "");
        setCurrentIcon(iconName);
      } catch (error) {
        console.error("Error fetching current icon:", error);
      }
    };

    fetchCurrentIcon();
  }, []);

  const changeIcon = async (iconName: string) => {
    try {
      if (iconName === "beaverpocket") {
        // Reset to default icon
        return resetIcon();
      }

      const allIconNames = iconNames.map((icon) => icon.name);

      // Disable all icons except the one selected
      const toDisable = allIconNames.filter((name) => name !== iconName);

      await AppIcon.change({
        name: iconName,
        suppressNotification: true,
        disable: toDisable,
      });

      setCurrentIcon(iconName);
    } catch (error) {
      console.error("Error changing icon:", error);
    }
  };

  const resetIcon = async () => {
    try {
      const allIconNames = iconNames.map((icon) => icon.name);

      // Disable all icons except default "beaverpocket"
      const toDisable = allIconNames.filter((name) => name !== "beaverpocket");

      await AppIcon.reset({
        suppressNotification: true,
        disable: toDisable,
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
        <button
          className={`w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center ${
            currentIcon === null || currentIcon === "beaverpocket"
              ? "ring-2 ring-primary"
              : ""
          }`}
          aria-label="Default App Icon"
          onClick={resetIcon}
        >
          <img
            src="./icons/AppIcon.png"
            alt="AppIcon"
            className="w-14 h-14 rounded-xl"
          />
          <p className="text-2xl pl-2 py-1 font-bold">Default</p>
        </button>

        {iconNames
          .filter((icon) => icon.name !== "beaverpocket") // exclude default here
          .map(({ name, cuteName, img }) => (
            <button
              key={name}
              className={`w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center ${
                currentIcon === name ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => changeIcon(name)}
              aria-label={cuteName}
            >
              <img
                src={`./icons/${img}.png`}
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

export default Icons;
