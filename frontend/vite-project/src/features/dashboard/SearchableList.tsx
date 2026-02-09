import type { SearchableListProps } from "../../types/Metrics";
import { Input } from "../../components";

const SearchableList = ({
    title,
    visibleCount,
    totalCount,
    searchValue,
    onSearchChange,
    placeholder,
    listRef,
    hasScrollbar,
    onScroll,
    children,
    isEmpty
}: SearchableListProps) => (
    <div className="list-section">
        <h2>{title} ({visibleCount}/{totalCount})</h2>
        <div className="search-bar">
            <Input
                placeholder={placeholder}
                type="text"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
            />
        </div>
        <div className="list-container">    
            <div 
                className="services-list" 
                ref={listRef}
                style={{ paddingRight: hasScrollbar ? '0.8em' : '0.4em' }}
                onScroll={(e) => onScroll(e.currentTarget)}
            >
                {isEmpty ? (
                    <p className="not-found">Not found</p>
                ) : (
                    children
                )}
            </div>  
        </div>
    </div>
);

export default SearchableList;