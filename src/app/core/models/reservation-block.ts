export type ReservationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ReservationType = 'BASIC' | 'MASTER' | 'SPECIALIST' | 'DOCTORAL';

export interface ReservationBlock {
  roomId: number;
  roomName: string;
  reservationId: number;
  employeeId: number;
  employeeName: string;
  reservationName: string;
  reservationType: ReservationType;
  status: ReservationStatus;
  startTime: string;
  endTime: string;
}
