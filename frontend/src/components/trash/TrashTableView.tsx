import React from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DeletedInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  seller_name: string;
  buyer_name?: string;
  total_amount: number;
  status: string;
  source: string;
  invoice_type?: string;
  created_at: string;
  deleted_at: string;
  days_remaining: number;
  days_since_deleted: number;
}

interface TrashTableViewProps {
  invoices: DeletedInvoice[];
  selectedInvoices: string[];
  onSelectInvoice: (invoiceId: string) => void;
  onSelectAll: () => void;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  onRestoreInvoice: (invoice: DeletedInvoice) => void;
  onPermanentDeleteInvoice: (invoice: DeletedInvoice) => void;
  isLoading?: boolean;
}

export const TrashTableView: React.FC<TrashTableViewProps> = ({
  invoices,
  selectedInvoices,
  onSelectInvoice,
  onSelectAll,
  isAllSelected,
  isIndeterminate,
  onRestoreInvoice,
  onPermanentDeleteInvoice,
  isLoading = false
}) => {

  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th className="w-12">
                <div className="w-4 h-4 bg-base-300 rounded animate-pulse"></div>
              </th>
              <th>发票信息</th>
              <th>金额</th>
              <th>删除时间</th>
              <th>剩余天数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td>
                  <div className="w-4 h-4 bg-base-300 rounded animate-pulse"></div>
                </td>
                <td>
                  <div className="space-y-1">
                    <div className="w-32 h-3 bg-base-300 rounded animate-pulse"></div>
                    <div className="w-24 h-3 bg-base-300 rounded animate-pulse"></div>
                  </div>
                </td>
                <td>
                  <div className="w-16 h-3 bg-base-300 rounded animate-pulse"></div>
                </td>
                <td>
                  <div className="w-20 h-3 bg-base-300 rounded animate-pulse"></div>
                </td>
                <td>
                  <div className="w-12 h-3 bg-base-300 rounded animate-pulse"></div>
                </td>
                <td>
                  <div className="flex gap-2">
                    <div className="w-12 h-6 bg-base-300 rounded animate-pulse"></div>
                    <div className="w-12 h-6 bg-base-300 rounded animate-pulse"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="text-6xl mb-4">🗑️</div>
        <h3 className="text-xl font-bold mb-2">回收站为空</h3>
        <p className="text-base-content/70">
          您没有已删除的发票
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra">
        <thead>
          <tr>
            <th className="w-12">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate
                }}
                onChange={onSelectAll}
              />
            </th>
            <th>发票信息</th>
            <th>金额</th>
            <th>删除时间</th>
            <th>剩余天数</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr 
              key={invoice.id}
              className={selectedInvoices.includes(invoice.id) ? 'bg-primary/5' : ''}
            >
              <td>
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={selectedInvoices.includes(invoice.id)}
                  onChange={() => onSelectInvoice(invoice.id)}
                />
              </td>
              <td>
                <div>
                  <div className="font-bold">
                    {invoice.seller_name || '未知销售方'}
                  </div>
                  <div className="text-sm opacity-50 font-mono">
                    {invoice.invoice_number || '未知'}
                  </div>
                  <div className="text-xs opacity-50">
                    {invoice.invoice_date || '未知日期'}
                  </div>
                </div>
              </td>
              <td>
                <span className="font-bold text-primary">
                  ¥{invoice.total_amount?.toFixed(2) || '0.00'}
                </span>
              </td>
              <td>
                <div className="text-sm">
                  {invoice.deleted_at 
                    ? format(new Date(invoice.deleted_at), 'PP', { locale: zhCN })
                    : '未知'
                  }
                </div>
              </td>
              <td>
                <div className={`badge ${
                  (invoice.days_remaining || 0) <= 7 ? 'badge-error' : 
                  (invoice.days_remaining || 0) <= 15 ? 'badge-warning' : 'badge-success'
                }`}>
                  {Math.ceil(invoice.days_remaining || 0)} 天
                </div>
                {(invoice.days_remaining || 0) <= 7 && (
                  <div className="text-xs text-error mt-1">
                    即将过期
                  </div>
                )}
              </td>
              <td>
                <div className="flex gap-2">
                  <button
                    className="btn btn-success btn-xs"
                    onClick={() => onRestoreInvoice(invoice)}
                  >
                    ↺ 恢复
                  </button>
                  <button
                    className="btn btn-error btn-xs"
                    onClick={() => onPermanentDeleteInvoice(invoice)}
                  >
                    🗑️ 删除
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrashTableView;