import { CalendarEntryDto } from '../models/calendar-entry.dto';
import { ReservationBlock, ReservationStatus, ReservationType } from '../models/reservation-block';

const STATUSES: ReservationStatus[] = ['PENDING','APPROVED','REJECTED','CANCELLED'];
const TYPES: ReservationType[] = ['BASIC','MASTER','SPECIALIST','DOCTORAL'];

function asStatus(s: string): ReservationStatus {
  return (STATUSES as readonly string[]).includes(s) ? (s as ReservationStatus) : 'PENDING';
}

function asType(t: string): ReservationType {
  return (TYPES as readonly string[]).includes(t) ? (t as ReservationType) : 'BASIC';
}

export function toReservationBlock(e: CalendarEntryDto): ReservationBlock {
  return {
    roomId: e.roomId,
    roomName: e.roomName,
    reservationId: e.reservationId,
    reservationName: e.reservationName,
    reservationType: asType(e.reservationType),
    status: asStatus(e.status),
    startTime: e.startTime,
    endTime: e.endTime,
    employeeId: e.employeeId,
    employeeName: e.employeeName,
  };
}
