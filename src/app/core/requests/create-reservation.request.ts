export interface CreateReservationRequest {
  roomIds: number[];
  employeeId: number;
  startTime: string; // LocalDateTime
  endTime: string;
  reservationName: string;
  reservationType: string;
}
