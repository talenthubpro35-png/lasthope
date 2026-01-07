import { SearchBar } from "../SearchBar";

export default function SearchBarExample() {
  return (
    <SearchBar
      placeholder="Search jobs, skills, companies..."
      onSearch={(query) => console.log("Searching:", query)}
      onFilterClick={() => console.log("Opening filters")}
    />
  );
}
