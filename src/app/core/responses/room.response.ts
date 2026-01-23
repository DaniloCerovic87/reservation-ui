export interface RoomResponse {
  id: number;
  name: string;
  roomType: 'AMPHITHEATER' | 'CLASSROOM' | 'COMPUTER_ROOM' | string;
  capacity: number;
  numberOfComputers?: number | null;
  numberOfProjectors?: number | null;
  hasSmartBoard?: boolean | null;
}
