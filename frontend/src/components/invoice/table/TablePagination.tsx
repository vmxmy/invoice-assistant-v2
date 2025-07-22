import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Table } from '@tanstack/react-table';

interface TablePaginationProps {
  table: Table<any>;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  table,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const canPreviousPage = currentPage > 1;
  const canNextPage = currentPage < totalPages;

  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      // 显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 显示部分页码
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="p-4 border-t border-base-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* 左侧：信息和每页条数选择 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <span className="text-sm text-base-content/60">
            共 {totalCount} 条记录
          </span>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-base-content/60">每页显示</span>
            <select
              className="select select-bordered select-sm"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1); // 重置到第一页
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-base-content/60">条</span>
          </div>
        </div>

        {/* 右侧：分页控件 */}
        <div className="flex items-center gap-2">
          {/* 移动端简化版 */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              className="btn btn-sm btn-outline"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canPreviousPage}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="text-sm px-2">
              {currentPage} / {totalPages}
            </span>
            
            <button
              className="btn btn-sm btn-outline"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canNextPage}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 桌面端完整版 */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onPageChange(1)}
              disabled={!canPreviousPage}
              title="第一页"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canPreviousPage}
              title="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex gap-1">
              {getPageNumbers().map((page, index) => {
                if (page === '...') {
                  return (
                    <span key={`ellipsis-${index}`} className="px-2 py-1">
                      ...
                    </span>
                  );
                }
                
                return (
                  <button
                    key={page}
                    className={`btn btn-sm ${
                      page === currentPage ? 'btn-primary' : 'btn-ghost'
                    }`}
                    onClick={() => onPageChange(page as number)}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canNextPage}
              title="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => onPageChange(totalPages)}
              disabled={!canNextPage}
              title="最后一页"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TablePagination;