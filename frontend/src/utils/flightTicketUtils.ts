/**
 * 飞机票信息提取工具函数
 * 从发票的 extracted_data 中提取真实的飞机票信息
 */

interface FlightTicketInfo {
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  departureTimeDetail: string; // 包含具体时间的字符串
  seatClass: string;
  seatNumber: string;
  passengerName: string;
  fare: number;
  airline: string;
}

interface Invoice {
  id: string;
  invoice_type?: string;
  expense_category?: string;
  primary_category_name?: string;
  secondary_category_name?: string;
  seller_name?: string;
  extracted_data?: {
    processed_fields?: {
      flight_number?: string;
      departure_airport?: string;
      arrival_airport?: string;
      departure_time?: string;
      seat_class?: string;
      seat_number?: string;
      passenger_name?: string;
      total_amount?: number;
      airline?: string;
      remarks?: string;
    };
    raw_ocr_data?: {
      subMsgs?: Array<{
        result?: {
          data?: {
            flightNumber?: string;
            departureAirport?: string;
            arrivalAirport?: string;
            departureTime?: string;
            seatClass?: string;
            seatNumber?: string;
            passengerName?: string;
            fare?: string;
            airline?: string;
            remarks?: string;
            // 阿里云OCR飞机票字段
            departure?: string;
            arrival?: string;
            flightDate?: string;
            flightTime?: string;
            cabinClass?: string;
            seat?: string;
            name?: string;
            ticketPrice?: string;
            carrier?: string;
          };
        };
      }>;
    };
  };
  [key: string]: any;
}

/**
 * 通过费用类别判断是否为飞机票
 */
export function isFlightTicketByCategory(invoice: Invoice): boolean {
  const expenseCategory = invoice.expense_category?.toLowerCase();
  const primaryCategory = invoice.primary_category_name?.toLowerCase();
  const secondaryCategory = invoice.secondary_category_name?.toLowerCase();
  
  // 飞机票相关的关键词
  const flightKeywords = [
    '飞机', '航空', '机票', '航班', 
    'flight', 'airline', 'aviation', 'air',
    '国航', '南航', '东航', '海航', '深航', '川航', '厦航',
    '中国国际航空', '中国南方航空', '中国东方航空', '海南航空'
  ];
  
  return flightKeywords.some(keyword => 
    expenseCategory?.includes(keyword) ||
    primaryCategory?.includes(keyword) ||
    secondaryCategory?.includes(keyword)
  );
}

/**
 * 从发票数据中提取飞机票信息
 */
export function extractFlightTicketInfo(invoice: Invoice): FlightTicketInfo | null {
  // 通过费用类别判断是否为飞机票
  const isFlightTicket = isFlightTicketByCategory(invoice);
  if (!isFlightTicket) {
    return null;
  }

  const processedFields = invoice.extracted_data?.processed_fields;
  const rawOcrData = invoice.extracted_data?.raw_ocr_data?.subMsgs?.[0]?.result?.data;

  if (!processedFields && !rawOcrData) {
    return null;
  }

  // 首先尝试从remarks字段解析飞机票信息
  const remarksInfo = extractFlightInfoFromRemarks(processedFields?.remarks || rawOcrData?.remarks || '');
  
  // 优先使用处理后的字段，如果没有则使用原始OCR数据
  const flightNumber = remarksInfo?.flightNumber || processedFields?.flight_number || rawOcrData?.flightNumber || rawOcrData?.flight_number || '';
  const departureAirport = remarksInfo?.departureAirport || processedFields?.departure_airport || rawOcrData?.departureAirport || rawOcrData?.departure || '';
  const arrivalAirport = remarksInfo?.arrivalAirport || processedFields?.arrival_airport || rawOcrData?.arrivalAirport || rawOcrData?.arrival || '';
  const departureTime = remarksInfo?.departureTime || processedFields?.departure_time || rawOcrData?.departureTime || rawOcrData?.flightDate || '';
  const departureTimeDetail = remarksInfo?.departureTimeDetail || extractFlightTimeDetail(rawOcrData?.flightTime || rawOcrData?.departureTime || '');
  const seatClass = processedFields?.seat_class || rawOcrData?.seatClass || rawOcrData?.cabinClass || '';
  const seatNumber = processedFields?.seat_number || rawOcrData?.seatNumber || rawOcrData?.seat || '';
  const passengerName = remarksInfo?.passengerName || processedFields?.passenger_name || rawOcrData?.passengerName || rawOcrData?.name || '';
  const fare = processedFields?.total_amount || parseFloat(rawOcrData?.fare || rawOcrData?.ticketPrice || '0');
  const airline = processedFields?.airline || rawOcrData?.airline || rawOcrData?.carrier || '';

  return {
    flightNumber,
    departureAirport,
    arrivalAirport,
    departureTime,
    departureTimeDetail,
    seatClass,
    seatNumber,
    passengerName,
    fare,
    airline
  };
}

/**
 * 从remarks字段解析飞机票信息
 * 解析格式如："行程信息:2025-06-0912:10厦门-成都;航班号:3U8924;乘客信息:徐明扬"
 */
function extractFlightInfoFromRemarks(remarks: string): {
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  departureTimeDetail: string;
  passengerName: string;
} | null {
  if (!remarks) return null;

  const result = {
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureTime: '',
    departureTimeDetail: '',
    passengerName: ''
  };

  // 解析航班号：航班号:3U8924
  const flightNumberMatch = remarks.match(/航班号[:：]([A-Z0-9]+)/);
  if (flightNumberMatch) {
    result.flightNumber = flightNumberMatch[1];
  }

  // 解析行程信息：2025-06-0912:10厦门-成都
  const routeMatch = remarks.match(/行程信息[:：](\d{4}-\d{2}-\d{2})(\d{2}:\d{2})([^-]+)-([^;]+)/);
  if (routeMatch) {
    const [, date, time, departure, arrival] = routeMatch;
    result.departureTime = `${date} ${time}`;
    result.departureTimeDetail = time;
    result.departureAirport = departure.trim();
    result.arrivalAirport = arrival.trim();
  }

  // 解析乘客信息：乘客信息:徐明扬
  const passengerMatch = remarks.match(/乘客信息[:：]([^;]+)/);
  if (passengerMatch) {
    result.passengerName = passengerMatch[1].trim();
  }

  // 如果至少解析到航班号或行程信息，则返回结果
  if (result.flightNumber || (result.departureAirport && result.arrivalAirport)) {
    return result;
  }

  return null;
}

/**
 * 从原始时间字符串中提取起飞时间详情
 * 例如："14:20" 或 "2025年03月24日14:20" -> "14:20"
 */
function extractFlightTimeDetail(flightTimeStr: string): string {
  if (!flightTimeStr) return '';
  
  // 匹配时间格式，如"14:20"
  const timeMatch = flightTimeStr.match(/(\d{2}:\d{2})/);
  if (timeMatch) {
    return timeMatch[1];
  }
  
  return '';
}

/**
 * 格式化机场名称显示
 * 将长机场名缩短为更简洁的显示格式
 */
export function formatAirportName(airportName: string): string {
  if (!airportName) return '';
  
  // 移除常见的机场后缀，但保持识别性
  return airportName
    .replace(/机场$/, '')
    .replace(/国际机场$/, '')
    .replace(/航空港$/, '');
}

/**
 * 生成飞机票航线显示字符串
 */
export function formatFlightRoute(departureAirport: string, arrivalAirport: string): string {
  const departure = formatAirportName(departureAirport);
  const arrival = formatAirportName(arrivalAirport);
  
  if (!departure || !arrival) return '';
  
  return `${departure} → ${arrival}`;
}

/**
 * 获取舱位类型的显示样式
 */
export function getSeatClassStyle(seatClass: string): { className: string; icon: string } {
  switch (seatClass) {
    case '头等舱':
    case 'F':
      return { className: 'badge-primary', icon: '👑' };
    case '商务舱':
    case 'C':
    case 'J':
      return { className: 'badge-secondary', icon: '💼' };
    case '经济舱':
    case 'Y':
    case 'M':
    case 'K':
      return { className: 'badge-accent', icon: '💺' };
    default:
      return { className: 'badge-neutral', icon: '✈️' };
  }
}

/**
 * 获取航空公司显示样式
 */
export function getAirlineStyle(airline: string): { className: string; icon: string } {
  // 根据航空公司名称返回不同的样式
  if (airline.includes('中国国际航空') || airline.includes('国航')) {
    return { className: 'badge-error', icon: '🔴' };
  } else if (airline.includes('中国南方航空') || airline.includes('南航')) {
    return { className: 'badge-info', icon: '🔵' };
  } else if (airline.includes('中国东方航空') || airline.includes('东航')) {
    return { className: 'badge-warning', icon: '🟡' };
  } else if (airline.includes('海南航空')) {
    return { className: 'badge-success', icon: '🟢' };
  } else {
    return { className: 'badge-neutral', icon: '✈️' };
  }
}

/**
 * 检查是否为有效的飞机票数据
 */
export function isValidFlightTicket(flightInfo: FlightTicketInfo | null): boolean {
  if (!flightInfo) return false;
  
  return !!(
    flightInfo.flightNumber && 
    flightInfo.departureAirport && 
    flightInfo.arrivalAirport
  );
}

/**
 * 生成飞机票摘要信息
 */
export function generateFlightTicketSummary(invoice: Invoice): string {
  const flightInfo = extractFlightTicketInfo(invoice);
  
  if (!flightInfo || !isValidFlightTicket(flightInfo)) {
    return '飞机票信息不完整';
  }
  
  const route = formatFlightRoute(flightInfo.departureAirport, flightInfo.arrivalAirport);
  const time = flightInfo.departureTimeDetail || '时间未知';
  
  return `${flightInfo.flightNumber} ${route} ${time}起飞`;
}