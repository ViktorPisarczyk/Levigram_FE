import React, { useEffect, useState, useRef } from "react";
import { IoMdSearch } from "react-icons/io";
import { useClickOutside } from "../../hooks/useClickOutside";
import "./SearchForm.scss";

interface SearchFormProps {
  onClose: () => void;
  onSearch: (query: string) => void;
}

const SearchForm: React.FC<SearchFormProps> = ({ onClose, onSearch }) => {
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useClickOutside(formRef, () => {
    onClose();
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
      onClose();
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("kb-open");
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      clearTimeout(t);
      root.classList.remove("kb-open");
    };
  }, []);

  return (
    <div ref={formRef} className="search-form" role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit} className="form-content">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen..."
          inputMode="search"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
        />
        <button type="submit" className="search-button" aria-label="Suchen">
          <IoMdSearch size={20} />
        </button>
      </form>
    </div>
  );
};

export default SearchForm;
