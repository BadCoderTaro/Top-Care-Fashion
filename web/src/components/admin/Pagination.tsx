"use client";

import { useState, useEffect, KeyboardEvent } from "react";

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface PaginationProps {
  pagination: PaginationInfo;
  currentPage: number;
  onPageChange: (page: number) => void;
  className?: string;
  showInfo?: boolean;
}

/**
 * Pagination component with page number input and navigation buttons
 * Can be placed at both top and bottom of content
 */
export default function Pagination({
  pagination,
  currentPage,
  onPageChange,
  className = "",
  showInfo = true,
}: PaginationProps) {
  const [inputPage, setInputPage] = useState(currentPage.toString());

  // Sync input with current page when it changes
  useEffect(() => {
    setInputPage(currentPage.toString());
  }, [currentPage]);

  const handlePageInput = (value: string) => {
    // Allow only numbers
    const sanitized = value.replace(/[^0-9]/g, "");
    setInputPage(sanitized);
  };

  const handlePageSubmit = () => {
    const pageNum = parseInt(inputPage, 10);
    if (pageNum >= 1 && pageNum <= pagination.totalPages) {
      onPageChange(pageNum);
    } else {
      // Reset to current page if invalid
      setInputPage(currentPage.toString());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handlePageSubmit();
    } else if (e.key === "Escape") {
      setInputPage(currentPage.toString());
    }
  };

  const goToFirstPage = () => {
    onPageChange(1);
  };

  const goToLastPage = () => {
    onPageChange(pagination.totalPages);
  };

  const goToPrevious = () => {
    onPageChange(Math.max(1, currentPage - 1));
  };

  const goToNext = () => {
    onPageChange(Math.min(pagination.totalPages, currentPage + 1));
  };

  if (pagination.totalPages <= 1) {
    return null;
  }

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border rounded-lg p-4 ${className}`}>
      {showInfo && (
        <div className="text-sm text-gray-600">
          Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total items)
        </div>
      )}

      <div className="flex items-center gap-2">
        {/* First Page Button */}
        <button
          onClick={goToFirstPage}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="First page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>

        {/* Previous Button */}
        <button
          onClick={goToPrevious}
          disabled={currentPage === 1}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {/* Page Input */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Page</span>
          <input
            type="text"
            value={inputPage}
            onChange={(e) => handlePageInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handlePageSubmit}
            className="w-16 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">of {pagination.totalPages}</span>
        </div>

        {/* Next Button */}
        <button
          onClick={goToNext}
          disabled={currentPage === pagination.totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>

        {/* Last Page Button */}
        <button
          onClick={goToLastPage}
          disabled={currentPage === pagination.totalPages}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Last page"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
