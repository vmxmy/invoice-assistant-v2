import React from 'react';
import InvoiceCard from './InvoiceCard';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  consumption_date?: string;
  seller_name: string;
  buyer_name: string;
  total_amount: number;
  status: string;
  processing_status: string;
  source: string;
  invoice_type?: string;
  created_at: string;
  tags: string[];
  secondary_category_name?: string;
  primary_category_name?: string;
  expense_category?: string;
  category_icon?: string;
  extracted_data?: {
    structured_data?: {
      total_amount?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

interface InvoiceListViewProps {
  invoices: Invoice[];
  selectedInvoices: string[];
  onSelectInvoice: (invoiceId: string) => void;
  onViewInvoice: (invoiceId: string) => void;
  onDownloadInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
  isLoading?: boolean;
}

export const InvoiceListView: React.FC<InvoiceListViewProps> = ({
  invoices,
  selectedInvoices,
  onSelectInvoice,
  onViewInvoice,
  onDownloadInvoice,
  onDeleteInvoice,
  isLoading = false
}) => {

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
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

  return (
    <div>
      {/* 发票列表 - 始终使用网格卡片视图 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {invoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            isSelected={selectedInvoices.includes(invoice.id)}
            onSelect={onSelectInvoice}
            onView={onViewInvoice}
            onEdit={onDownloadInvoice}
            onDelete={onDeleteInvoice}
          />
        ))}
      </div>
    </div>
  );
};

export default InvoiceListView;