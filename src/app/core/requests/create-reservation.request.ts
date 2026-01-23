export interface CreateReservationRequest {
  roomIds: number[];
  startTime: string; // LocalDateTime
  endTime: string;
  reservationName: string;
  reservationType: string;
}
