import React from 'react';
import TrashInvoiceCard from './TrashInvoiceCard';

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

interface TrashListViewProps {
  invoices: DeletedInvoice[];
  selectedInvoices: string[];
  onSelectInvoice: (invoiceId: string) => void;
  onRestoreInvoice: (invoice: DeletedInvoice) => void;
  onPermanentDeleteInvoice: (invoice: DeletedInvoice) => void;
  isLoading?: boolean;
}

export const TrashListView: React.FC<TrashListViewProps> = ({
  invoices,
  selectedInvoices,
  onSelectInvoice,
  onRestoreInvoice,
  onPermanentDeleteInvoice,
  isLoading = false
}) => {

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="card bg-base-100 border border-base-300">
            <div className="card-body p-4">
              <div className="animate-pulse space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-base-300 rounded"></div>
                    <div className="w-24 h-4 bg-base-300 rounded"></div>
                  </div>
                  <div className="w-6 h-6 bg-base-300 rounded-full"></div>
                </div>
                <div className="space-y-2">
                  <div className="w-32 h-3 bg-base-300 rounded"></div>
                  <div className="w-48 h-3 bg-base-300 rounded"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="w-20 h-5 bg-base-300 rounded"></div>
                  <div className="flex gap-2">
                    <div className="w-12 h-8 bg-base-300 rounded"></div>
                    <div className="w-12 h-8 bg-base-300 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
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
    <div>
      {/* 发票列表 - 使用网格卡片视图 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invoices.map((invoice) => (
          <TrashInvoiceCard
            key={invoice.id}
            invoice={invoice}
            isSelected={selectedInvoices.includes(invoice.id)}
            onSelect={() => onSelectInvoice(invoice.id)}
            onRestore={() => onRestoreInvoice(invoice)}
            onPermanentDelete={() => onPermanentDeleteInvoice(invoice)}
          />
        ))}
      </div>
    </div>
  );
};

export default TrashListView;