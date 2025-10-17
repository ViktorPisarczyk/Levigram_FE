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

  useClickOutside(formRef, () => onClose());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query.trim());
    onClose();
  };

  useEffect(() => {
    const root = document.documentElement;
    const el = inputRef.current;
    if (!el) return;

    const onFocus = () => {
      root.classList.add("kb-open");
      root.classList.add("kb-open-any");
    };
    const onBlur = () => {
      root.classList.remove("kb-open");
      root.classList.remove("kb-open-any");
    };

    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);

    return () => {
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
      root.classList.remove("kb-open");
      root.classList.remove("kb-open-any");
    };
  }, []);

  return (
    <div ref={formRef} className="search-form">
      <form onSubmit={handleSubmit} className="form-content">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen..."
        />
        <button type="submit" className="search-button">
          <IoMdSearch size={20} />
        </button>
      </form>
    </div>
  );
};

export default SearchForm;
