import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';
 
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}
 
function getPageNumbers(current: number, total: number): (number | '...')[] {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
 
    const pages: (number | '...')[] = [1];
 
    if (current > 3) {
        pages.push('...');
    }
 
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
 
    for (let i = start; i <= end; i++) {
        pages.push(i);
    }
 
    if (current < total - 2) {
        pages.push('...');
    }
 
    pages.push(total);
 
    return pages;
}
 
export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) {
        return null;
    }
 
    const pages = getPageNumbers(currentPage, totalPages);
 
    return (
        <nav className="pagination" aria-label="Pagination">
            <Button
                variant="outline"
                size="sm"
                className="pagination-btn"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                aria-label="Previous page"
            >
                <ChevronLeft className="pagination-icon" />
            </Button>
 
            {pages.map((page, index) =>
                page === '...' ? (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                        ...
                    </span>
                ) : (
                    <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        className={`pagination-btn ${page === currentPage ? 'pagination-btn--active' : ''}`}
                        onClick={() => onPageChange(page)}
                        aria-label={`Page ${page}`}
                        aria-current={page === currentPage ? 'page' : undefined}
                    >
                        {page}
                    </Button>
                ),
            )}
 
            <Button
                variant="outline"
                size="sm"
                className="pagination-btn"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                aria-label="Next page"
            >
                <ChevronRight className="pagination-icon" />
            </Button>
        </nav>
    );
}