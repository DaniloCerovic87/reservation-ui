import { CalendarEntryResponse } from '../responses/calendar-entry.response';
import { ReservationBlock, ReservationStatus, ReservationType } from '../models/reservation-block';
import {ReservationCreatedResponse} from '../responses/reservation-created.response';

const STATUSES: ReservationStatus[] = ['PENDING', 'APPROVED', 'DECLINED'];
const TYPES: ReservationType[] = ['BASIC', 'MASTER', 'SPECIALIST', 'DOCTORAL'];

function norm(s: string): string {
  return (s ?? '').trim().toUpperCase();
}

function asStatus(s: string): ReservationStatus {
  const v = norm(s);
  return (STATUSES as readonly string[]).includes(v) ? (v as ReservationStatus) : 'PENDING';
}

function asType(t: string): ReservationType {
  const v = norm(t);
  return (TYPES as readonly string[]).includes(v) ? (v as ReservationType) : 'BASIC';
}

export function toReservationBlock(e: CalendarEntryResponse): ReservationBlock {
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

/**
 * Create response returns ONE reservation with multiple roomIds
 * Split here because grid needs ONE block per room
 */
export function toReservationBlocksFromCreate(
  created: ReservationCreatedResponse,
  roomNameById: Map<number, string>
): ReservationBlock[] {
  return (created.roomIds ?? []).map((roomId: number) => ({
    roomId,
    roomName: roomNameById.get(roomId) ?? '',
    reservationId: created.id,
    reservationName: created.reservationName,
    reservationType: asType(created.reservationType),
    status: asStatus(created.reservationStatus),
    startTime: created.startTime,
    endTime: created.endTime,
    employeeId: created.employeeId,
    employeeName: created.employeeName,
  }));
}
