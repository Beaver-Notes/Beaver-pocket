import React, { useState, useRef, useEffect } from 'react';
import ArchiveDrawerLineIcon from 'remixicon-react/ArchiveLineIcon';
import HomeLineIcon from 'remixicon-react/HomeLineIcon';
import AddFillIcon from 'remixicon-react/AddFillIcon';
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
  const [prevScrollPos, setPrevScrollPos] = useState(window.pageYOffset);
  const [isVisible, setIsVisible] = useState(true);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleToggleArchiveClick = () => {
    onToggleArchiveVisibility(true);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleScroll = () => {
    const currentScrollPos = window.pageYOffset;

    if (prevScrollPos > currentScrollPos) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }

    setPrevScrollPos(currentScrollPos);
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

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [prevScrollPos]);

  return (
    <div className={`spacingdiv ${isVisible ? 'visible' : 'hidden'}`}>
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
        </div>
      </nav>
    </div>
  );
};

export default BottomNavBar;
