import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { RoomApiService } from '../../../core/services/room-api';
import { CalendarApiService } from '../../../core/services/calendar-api';
import { RoomDto } from '../../../core/models/room.dto';
import { CreateReservationRequest } from '../../../core/models/create-reservation.request';
import {ReservationApiService} from '../../../core/services/reservation-api';

export interface ReserveRoomsDialogData {
  startTime: string;
  endTime: string;
  initialRoomId?: number;
  roomsSnapshot: RoomDto[];
  availableRooms?: RoomDto[];
  availabilityFailed: boolean;
}

export interface ReserveRoomsDialogResult {
  saved: boolean;
}

type ReserveForm = FormGroup<{
  reservationName: FormControl<string>;
  reservationType: FormControl<string>;
}>;

@Component({
  standalone: true,
  selector: 'app-reserve-rooms-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './reserve-rooms-dialog.html',
  styleUrls: ['./reserve-rooms-dialog.scss'],
})
export class ReserveRoomsDialogComponent implements OnInit {
  rooms: RoomDto[] = [];
  selected = new Set<number>();

  loading = false;
  saving = false;
  errorMsg: string | null = null;

  submitted = false;
  availabilityFailed = false;

  readonly form: ReserveForm;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: ReserveRoomsDialogData,
    private readonly dialogRef: MatDialogRef<ReserveRoomsDialogComponent, ReserveRoomsDialogResult>,
    private readonly reservationApi: ReservationApiService,
    private readonly fb: NonNullableFormBuilder
  ) {
    this.form = this.fb.group({
      reservationName: this.fb.control('', [Validators.required, Validators.minLength(2)]),
      reservationType: this.fb.control('', [Validators.required]),
    });
  }

  ngOnInit() {
    this.loading = false;
    this.errorMsg = null;

    this.availabilityFailed = this.data.availabilityFailed;
    this.rooms = this.data.availableRooms ?? [];

    if (this.availabilityFailed) {
      this.errorMsg = 'Could not load availability.';
      this.selected.clear();
      return;
    }

    // auto-select chosen room
    if (this.data.initialRoomId && this.rooms.some(r => r.id === this.data.initialRoomId)) {
      this.selected.add(this.data.initialRoomId);
    }
  }

  get canSave(): boolean {
    return (
      this.form.valid &&
      this.selected.size > 0 &&
      !this.saving &&
      !this.availabilityFailed
    );
  }

  get rangeLabel(): string {
    return `${this.fmt(this.data.startTime)} → ${this.fmt(this.data.endTime)}`;
  }

  private fmt(s: string): string {
    // "2026-01-19T08:30:00" -> "19.01.2026 08:30"
    const [d, t] = s.split('T');
    if (!d || !t) return s;

    const [y, m, day] = d.split('-');
    if (!y || !m || !day) return s;

    return `${day}.${m}.${y} ${t.slice(0, 5)}`;
  }

  isInvalid(name: keyof ReserveForm['controls']): boolean {
    const c = this.form.controls[name];
    return c.invalid && (this.submitted || c.touched);
  }

  hasError(name: keyof ReserveForm['controls'], error: string): boolean {
    return this.form.controls[name].hasError(error);
  }

  toggle(roomId: number, checked: boolean) {
    if (checked) this.selected.add(roomId);
    else this.selected.delete(roomId);
  }

  close() {
    this.dialogRef.close({ saved: false });
  }

  save() {
    this.submitted = true;

    if (!this.canSave) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    this.errorMsg = null;

    const v = this.form.getRawValue();

    const req: CreateReservationRequest = {
      roomIds: Array.from(this.selected),
      startTime: this.data.startTime,
      endTime: this.data.endTime,
      reservationName: v.reservationName,
      reservationType: v.reservationType,
    };

    this.reservationApi
      .createReservation(req)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => this.dialogRef.close({ saved: true }),
        error: (e) => {
          this.errorMsg =
            e?.status === 409
              ? 'Some rooms became unavailable. Please try again.'
              : 'Save failed.';
        },
      });
  }
}
