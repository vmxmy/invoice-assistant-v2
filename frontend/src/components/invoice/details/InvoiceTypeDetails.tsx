import React from 'react';
import type { Invoice } from '../../../types';
import TrainInvoiceDetailsComponent from './TrainInvoiceDetails';
import FlightInvoiceDetailsComponent from './FlightInvoiceDetails';
import TaxiInvoiceDetailsComponent from './TaxiInvoiceDetails';
import HotelInvoiceDetailsComponent from './HotelInvoiceDetails';

interface InvoiceTypeDetailsProps {
  invoice: any; // 使用 any 因为后端返回的数据结构可能不同
}

export const InvoiceTypeDetails: React.FC<InvoiceTypeDetailsProps> = ({ invoice }) => {
  // 从 extracted_data 中获取专有信息
  const extractedData = invoice.extracted_data || {};
  const structuredData = extractedData.structured_data || {};
  const typeSpecificData = structuredData.type_specific_data || extractedData.type_specific_data || {};
  
  // 根据发票类型渲染对应的详情组件
  const renderTypeSpecificDetails = () => {
    const invoiceType = invoice.invoice_type?.toLowerCase();
    
    // 火车票 - 检查卖方名称是否包含铁路或12306
    if (invoiceType?.includes('火车') || invoiceType?.includes('铁路') || invoiceType?.includes('train') ||
        invoice.seller_name?.includes('铁路') || invoice.seller_name?.includes('12306')) {
      // 处理发车日期和时间
      let departureDatetime = null;
      if (extractedData.departure_date && extractedData.departure_time) {
        // 提取日期部分（去掉时间部分）
        const dateOnly = extractedData.departure_date.split('T')[0];
        // 组合日期和时间
        departureDatetime = `${dateOnly}T${extractedData.departure_time}:00`;
      } else if (extractedData.departure_date) {
        departureDatetime = extractedData.departure_date;
      }
        
      const trainDetails = {
        departure_time: departureDatetime,
        departure_date: extractedData.departure_date, // 原始发车日期
        departure_time_only: extractedData.departure_time, // 仅时间部分
        arrival_time: extractedData.arrival_time, // 注意：当前数据中没有到达时间
        train_number: extractedData.train_number,
        seat_class: extractedData.seat_type || extractedData.seat_class, // 注意字段名是 seat_type
        seat_number: extractedData.seat_number,
        departure_station: extractedData.departure_station,
        arrival_station: extractedData.arrival_station,
        distance: extractedData.distance,
        passenger_name: extractedData.passenger_name, // 额外信息：乘客姓名
      };
      
      // 检查是否有有效的火车票数据
      if (trainDetails.train_number || trainDetails.departure_station) {
        return <TrainInvoiceDetailsComponent details={trainDetails} />;
      }
    }
    
    // 机票
    if (invoiceType?.includes('机票') || invoiceType?.includes('航空') || invoiceType?.includes('flight')) {
      const flightDetails = {
        flight_number: typeSpecificData.flight_number || extractedData.flight_number,
        departure_time: typeSpecificData.departure_time || extractedData.departure_time,
        arrival_time: typeSpecificData.arrival_time || extractedData.arrival_time,
        seat_number: typeSpecificData.seat_number || extractedData.seat_number,
        cabin_class: typeSpecificData.cabin_class || extractedData.cabin_class,
        departure_airport: typeSpecificData.departure_airport || extractedData.departure_airport,
        arrival_airport: typeSpecificData.arrival_airport || extractedData.arrival_airport,
        airline: typeSpecificData.airline || extractedData.airline || invoice.seller_name,
      };
      
      if (flightDetails.flight_number || flightDetails.departure_airport) {
        return <FlightInvoiceDetailsComponent details={flightDetails} />;
      }
    }
    
    // 出租车票
    if (invoiceType?.includes('出租') || invoiceType?.includes('taxi')) {
      const taxiDetails = {
        pickup_time: typeSpecificData.pickup_time || extractedData.pickup_time,
        dropoff_time: typeSpecificData.dropoff_time || extractedData.dropoff_time,
        distance: typeSpecificData.distance || extractedData.distance,
        unit_price: typeSpecificData.unit_price || extractedData.unit_price,
        waiting_fee: typeSpecificData.waiting_fee || extractedData.waiting_fee,
        license_plate: typeSpecificData.license_plate || extractedData.license_plate,
      };
      
      if (taxiDetails.distance || taxiDetails.pickup_time) {
        return <TaxiInvoiceDetailsComponent details={taxiDetails} />;
      }
    }
    
    // 酒店发票 - 检查卖方名称或服务类型
    if (invoiceType?.includes('酒店') || invoiceType?.includes('住宿') || invoiceType?.includes('hotel') ||
        invoice.seller_name?.includes('酒店') || extractedData.service_type?.includes('住宿')) {
      const hotelDetails = {
        checkin_date: extractedData.checkin_date,
        checkout_date: extractedData.checkout_date,
        room_type: extractedData.room_type || extractedData.project_name, // 使用 project_name 作为房型
        room_number: extractedData.room_number,
        nights: extractedData.nights,
        daily_rate: extractedData.daily_rate,
        service_type: extractedData.service_type, // 额外信息：服务类型
      };
      
      // 即使没有入住日期，只要是住宿服务也可以显示
      if (hotelDetails.service_type?.includes('住宿') || invoice.seller_name?.includes('酒店')) {
        return <HotelInvoiceDetailsComponent details={hotelDetails} />;
      }
    }
    
    return null;
  };

  const typeDetails = renderTypeSpecificDetails();

  // 如果没有专有信息，不渲染任何内容
  if (!typeDetails) {
    return null;
  }

  return (
    <>
      <div className="divider"></div>
      {typeDetails}
    </>
  );
};

// 获取发票类型的中文名称
export const getInvoiceTypeName = (type?: string): string => {
  if (!type) return '通用发票';
  
  const typeLower = type.toLowerCase();
  
  // 根据关键词匹配类型名称
  if (typeLower.includes('火车') || typeLower.includes('铁路') || typeLower.includes('train')) {
    return '火车票';
  }
  if (typeLower.includes('机票') || typeLower.includes('航空') || typeLower.includes('flight')) {
    return '机票';
  }
  if (typeLower.includes('出租') || typeLower.includes('taxi')) {
    return '出租车票';
  }
  if (typeLower.includes('酒店') || typeLower.includes('住宿') || typeLower.includes('hotel')) {
    return '酒店发票';
  }
  if (typeLower.includes('餐饮') || typeLower.includes('餐') || typeLower.includes('restaurant')) {
    return '餐饮发票';
  }
  if (typeLower.includes('增值税') || typeLower.includes('vat')) {
    return '增值税发票';
  }
  if (typeLower.includes('过路') || typeLower.includes('高速') || typeLower.includes('toll')) {
    return '过路费发票';
  }
  if (typeLower.includes('停车') || typeLower.includes('parking')) {
    return '停车费发票';
  }
  
  // 如果无法匹配，返回原始类型或通用发票
  return type || '通用发票';
};

// 获取发票类型的图标
export const getInvoiceTypeIcon = (type?: string): string => {
  if (!type) return '📄';
  
  const typeLower = type.toLowerCase();
  
  // 根据关键词匹配图标
  if (typeLower.includes('火车') || typeLower.includes('铁路') || typeLower.includes('train')) {
    return '🚆';
  }
  if (typeLower.includes('机票') || typeLower.includes('航空') || typeLower.includes('flight')) {
    return '✈️';
  }
  if (typeLower.includes('出租') || typeLower.includes('taxi')) {
    return '🚕';
  }
  if (typeLower.includes('酒店') || typeLower.includes('住宿') || typeLower.includes('hotel')) {
    return '🏨';
  }
  if (typeLower.includes('餐饮') || typeLower.includes('餐') || typeLower.includes('restaurant')) {
    return '🍽️';
  }
  if (typeLower.includes('增值税') || typeLower.includes('vat')) {
    return '🧾';
  }
  if (typeLower.includes('过路') || typeLower.includes('高速') || typeLower.includes('toll')) {
    return '🛣️';
  }
  if (typeLower.includes('停车') || typeLower.includes('parking')) {
    return '🅿️';
  }
  
  return '📄';
};

export default InvoiceTypeDetails;