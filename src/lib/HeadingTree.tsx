// HeadingTree.tsx
import React, { useState } from 'react';
import Search2LineIcon from 'remixicon-react/Search2LineIcon';

type HeadingTreeProps = {
  editorContent: any; // Replace 'any' with the actual type of editor content
  onHeadingClick: (heading: string) => void;
};

const HeadingTree: React.FC<HeadingTreeProps> = ({ editorContent, onHeadingClick }) => {
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const extractHeadings = (content: any) => {
    const headings: { level: any; text: any; }[] = [];
    if (content?.content) {
      content.content.forEach((node: any) => {
        if (node.type === 'heading') {
          headings.push({
            level: node.attrs.level,
            text: node.content.map((textNode: any) => textNode.text).join(' '),
          });
        }
        // Recursively extract headings from nested content
        headings.push(...extractHeadings(node));
      });
    }
    return headings;
  };

  const filteredHeadings = extractHeadings(editorContent).filter((heading: any) =>
    heading.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed bottom-6 overflow-auto h-auto w-full bg-transparent sticky top-0 z-50 no-scrollbar">
      <div className="relative inline-block text-left">
        <div>
          <button
            onClick={() => setDropdownOpen(!isDropdownOpen)}
            type="button"
            className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
            id="options-menu"
            aria-haspopup="true"
            aria-expanded="true"
          >
            <Search2LineIcon />
          </button>
        </div>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div
          className='z-10 hidden w-56 p-3 bg-white rounded-lg shadow dark:bg-gray-700'
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            <div className="px-4 py-2">
              {/* Search bar */}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search headings"
                className="w-full border rounded px-2 py-1 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="py-1" role="none">
              {filteredHeadings.map((heading: any, index: number) => (
                <button
                  key={index}
                  onClick={() => {
                    onHeadingClick(heading.text);
                    setDropdownOpen(false);
                  }}
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  role="menuitem"
                >
                  {heading.text}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeadingTree;
