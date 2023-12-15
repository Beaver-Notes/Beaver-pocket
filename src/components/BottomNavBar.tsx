import React, { useState, useRef, useEffect } from 'react';
import ArchiveDrawerLineIcon from 'remixicon-react/ArchiveLineIcon';
import HomeLineIcon from 'remixicon-react/HomeLineIcon';
import AddFillIcon from 'remixicon-react/AddFillIcon';
import SettingsFillIcon from 'remixicon-react/SettingsFillIcon';
import MoreLineIcon from 'remixicon-react/MoreLineIcon';
import Download2LineIcon from 'remixicon-react/Download2LineIcon';
import Upload2LineIcon from 'remixicon-react/Upload2LineIcon';
import './css/BottomNavBar.css';

interface BottomNavBarProps {
  onCreateNewNote: () => void;
  onToggleArchiveVisibility: (isVisible: boolean) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({
  onCreateNewNote,
  onToggleArchiveVisibility,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleToggleArchiveClick = () => {
    onToggleArchiveVisibility(true);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleMoreButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleMenu();
  };

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };
  
    document.addEventListener('mousedown', handleDocumentClick);
  
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);  

  return (
    <div className="spacingdiv">
      <nav className={`BottomNavbar ${isMenuOpen ? 'open' : ''}`}>
        <div className="Navbardiv">
          <a href="#" className="navbarelement" onClick={onCreateNewNote}>
            <AddFillIcon className="icon" />
          </a>
          <a href="/" className="navbarelement">
            <HomeLineIcon className="icon" />
          </a>
          <a href="#" className="navbarelement" onClick={handleToggleArchiveClick}>
            <ArchiveDrawerLineIcon className="icon" />
          </a>
          <a href="#" className="navbarelement" onClick={handleMoreButtonClick}>
            <MoreLineIcon className="icon" />
          </a>
        </div>
        {isMenuOpen && (
          <div className="menu" ref={menuRef}>
            <a href="#" className="navbarelement">
              <Download2LineIcon className="moreicon" />
            </a>
            <a href="#" className="navbarelement">
              <Upload2LineIcon className="moreicon" />
            </a>
            <a href="#" className="navbarelement">
              <SettingsFillIcon className="moreicon" />
            </a>
          </div>
        )}
      </nav>
    </div>
  );
};

export default BottomNavBar;
