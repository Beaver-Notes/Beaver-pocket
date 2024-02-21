import React, { useState } from "react";

type SearchComponentProps = {
  editorContent: string;
};

const SearchComponent: React.FC<SearchComponentProps> = ({ editorContent }) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<number[]>([]);
  
  const handleSearch = () => {
    const regex = new RegExp(searchTerm, "gi");
    const matches: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(editorContent)) !== null) {
      matches.push(match.index);
    }
    setSearchResults(matches);
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button onClick={handleSearch}>Search</button>
      <div>
        {searchResults.map((index) => (
          <span
            key={index}
            style={{ backgroundColor: "yellow" }}
          >
            {editorContent.substr(index, searchTerm.length)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default SearchComponent;
