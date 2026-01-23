export interface ReservationCreatedResponse {
  id: number;
  reservationStatus: string;
  reservationName: string;
  reservationType: string;
  startTime: string;
  endTime: string;
  employeeId: number;
  employeeName: string;
  roomIds: number[];
}
