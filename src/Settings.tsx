import { useEffect, useState } from 'react';
import MoonFillIcon from 'remixicon-react/MoonFillIcon'
import MoonLineIcon from 'remixicon-react/MoonLineIcon'


function Settings() {
    // State to manage dark mode
    const [isDarkMode, setIsDarkMode] = useState(() => {
        // Check if the user has a preference for dark mode in localStorage
        const storedDarkMode = localStorage.getItem('darkMode');
        return storedDarkMode ? JSON.parse(storedDarkMode) : false;
    });

    // Effect to update the classList and localStorage when isDarkMode changes
    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDarkMode);
        localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    }, [isDarkMode]);

    // Function to toggle dark mode
    const toggleTheme = () => {
        setIsDarkMode((prevMode: any) => !prevMode);
    }

    return (
        <button onClick={toggleTheme} className="mb-2 p-2 bg-[#EBEBEA] dark:bg-[#2D2C2C] dark:text-white rounded-xl font-semibold text-gray-800 cursor-pointer flex md:flex">
            {isDarkMode ? <MoonFillIcon /> : <MoonLineIcon />}
        </button>
    );
}

export default Settings;