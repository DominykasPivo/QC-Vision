import { type FormEvent, useState } from "react";

/**
 * Custom hook for managing test search state and submission
 */
export function useTestSearch() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  return {
    searchInput,
    searchQuery,
    setSearchInput,
    setSearchQuery,
    handleSearchSubmit,
    clearSearch,
  };
}
