/**
 * 火车票信息提取工具函数
 * 从发票的 extracted_data 中提取真实的火车票信息
 */

interface TrainTicketInfo {
  trainNumber: string;
  departureStation: string;
  arrivalStation: string;
  departureTime: string;
  departureTimeDetail: string; // 包含具体时间的字符串
  seatType: string;
  seatNumber: string;
  passengerName: string;
  fare: number;
}

interface Invoice {
  id: string;
  invoice_type?: string;
  expense_category?: string;
  primary_category_name?: string;
  secondary_category_name?: string;
  extracted_data?: {
    processed_fields?: {
      train_number?: string;
      departure_station?: string;
      arrival_station?: string;
      departure_time?: string;
      seat_type?: string;
      seat_number?: string;
      passenger_name?: string;
      total_amount?: number;
    };
    raw_ocr_data?: {
      subMsgs?: Array<{
        result?: {
          data?: {
            trainNumber?: string;
            departureStation?: string;
            arrivalStation?: string;
            departureTime?: string;
            seatType?: string;
            seatNumber?: string;
            passengerName?: string;
            fare?: string;
          };
        };
      }>;
    };
  };
  [key: string]: any;
}

/**
 * 通过费用类别判断是否为火车票
 */
export function isTrainTicketByCategory(invoice: Invoice): boolean {
  const expenseCategory = invoice.expense_category?.toLowerCase();
  const primaryCategory = invoice.primary_category_name?.toLowerCase();
  const secondaryCategory = invoice.secondary_category_name?.toLowerCase();
  
  // 火车票相关的关键词
  const trainKeywords = [
    '火车', '高铁', '动车', '铁路', '列车',
    'train', 'railway', 'rail',
    '火车票', '高铁票', '动车票', '铁路客票'
  ];
  
  return trainKeywords.some(keyword => 
    expenseCategory?.includes(keyword) ||
    primaryCategory?.includes(keyword) ||
    secondaryCategory?.includes(keyword)
  );
}

/**
 * 从发票数据中提取火车票信息
 */
export function extractTrainTicketInfo(invoice: Invoice): TrainTicketInfo | null {
  // 通过费用类别判断是否为火车票
  const isTrainTicket = isTrainTicketByCategory(invoice);
  if (!isTrainTicket) {
    return null;
  }

  const processedFields = invoice.extracted_data?.processed_fields;
  const rawOcrData = invoice.extracted_data?.raw_ocr_data?.subMsgs?.[0]?.result?.data;

  if (!processedFields && !rawOcrData) {
    return null;
  }

  // 优先使用处理后的字段，如果没有则使用原始OCR数据
  const trainNumber = processedFields?.train_number || rawOcrData?.trainNumber || '';
  const departureStation = processedFields?.departure_station || rawOcrData?.departureStation || '';
  const arrivalStation = processedFields?.arrival_station || rawOcrData?.arrivalStation || '';
  const departureTime = processedFields?.departure_time || rawOcrData?.departureTime || '';
  const seatType = processedFields?.seat_type || rawOcrData?.seatType || '';
  const seatNumber = processedFields?.seat_number || rawOcrData?.seatNumber || '';
  const passengerName = processedFields?.passenger_name || rawOcrData?.passengerName || '';
  const fare = processedFields?.total_amount || parseFloat(rawOcrData?.fare || '0');

  // 提取详细的发车时间（包含时分）
  const departureTimeDetail = extractDepartureTimeDetail(rawOcrData?.departureTime || '');

  return {
    trainNumber,
    departureStation,
    arrivalStation,
    departureTime,
    departureTimeDetail,
    seatType,
    seatNumber,
    passengerName,
    fare
  };
}

/**
 * 从原始时间字符串中提取发车时间详情
 * 例如："2025年03月24日08:45开" -> "08:45"
 */
function extractDepartureTimeDetail(departureTimeStr: string): string {
  if (!departureTimeStr) return '';
  
  // 匹配时间格式，如"08:45开"
  const timeMatch = departureTimeStr.match(/(\d{2}:\d{2})/);
  if (timeMatch) {
    return timeMatch[1];
  }
  
  return '';
}

/**
 * 格式化站点名称显示
 * 将长站名缩短为更简洁的显示格式
 */
export function formatStationName(stationName: string): string {
  if (!stationName) return '';
  
  // 移除常见的站后缀，但保持识别性
  return stationName
    .replace(/站$/, '')
    .replace(/火车站$/, '')
    .replace(/高铁站$/, '');
}

/**
 * 生成火车票路线显示字符串
 */
export function formatTrainRoute(departureStation: string, arrivalStation: string): string {
  const departure = formatStationName(departureStation);
  const arrival = formatStationName(arrivalStation);
  
  if (!departure || !arrival) return '';
  
  return `${departure} → ${arrival}`;
}

/**
 * 获取座位类型的显示样式
 */
export function getSeatTypeStyle(seatType: string): { className: string; icon: string } {
  switch (seatType) {
    case '商务座':
      return { className: 'badge-primary', icon: '🥇' };
    case '一等座':
      return { className: 'badge-secondary', icon: '🥈' };
    case '二等座':
      return { className: 'badge-accent', icon: '🥉' };
    default:
      return { className: 'badge-neutral', icon: '🎫' };
  }
}

/**
 * 检查是否为有效的火车票数据
 */
export function isValidTrainTicket(trainInfo: TrainTicketInfo | null): boolean {
  if (!trainInfo) return false;
  
  return !!(
    trainInfo.trainNumber && 
    trainInfo.departureStation && 
    trainInfo.arrivalStation
  );
}

/**
 * 生成火车票摘要信息
 */
export function generateTrainTicketSummary(invoice: Invoice): string {
  const trainInfo = extractTrainTicketInfo(invoice);
  
  if (!trainInfo || !isValidTrainTicket(trainInfo)) {
    return '火车票信息不完整';
  }
  
  const route = formatTrainRoute(trainInfo.departureStation, trainInfo.arrivalStation);
  const time = trainInfo.departureTimeDetail || '时间未知';
  
  return `${trainInfo.trainNumber} ${route} ${time}发车`;
}