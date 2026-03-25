import { useState, useCallback, useMemo } from "react";

export function useChatSearch(messages, scrollToMessage) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }

    const results = messages
      .map((message, index) => (message.content?.toLowerCase().includes(query.toLowerCase()) ? index : null))
      .filter((index) => index !== null);

    setSearchResults(results);

    if (results.length > 0) {
      const nextIndex = results.length - 1;
      setCurrentSearchIndex(nextIndex);
      scrollToMessage?.(messages[results[nextIndex]]._id);
    } else {
      setCurrentSearchIndex(-1);
    }
  }, [messages, scrollToMessage]);

  const navigateSearch = useCallback((direction) => {
    if (searchResults.length === 0) return;

    let nextIndex = currentSearchIndex + direction;
    if (nextIndex < 0) nextIndex = searchResults.length - 1;
    if (nextIndex >= searchResults.length) nextIndex = 0;

    setCurrentSearchIndex(nextIndex);
    scrollToMessage?.(messages[searchResults[nextIndex]]._id);
  }, [currentSearchIndex, searchResults, messages, scrollToMessage]);

  const resetSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setCurrentSearchIndex(-1);
  }, []);

  return useMemo(() => ({
    searchQuery,
    currentSearchIndex,
    searchResults,
    handleSearch,
    navigateSearch,
    resetSearch,
  }), [searchQuery, currentSearchIndex, searchResults, handleSearch, navigateSearch, resetSearch]);
}
