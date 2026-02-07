import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, filter, switchMap } from 'rxjs';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { RoomResponse } from '../../../../core/responses/room.response';
import { CreateReservationRequest } from '../../../../core/requests/create-reservation.request';
import { ReservationApiService } from '../../../../core/services/reservation-api';
import { ReservationCreatedResponse } from '../../../../core/responses/reservation-created.response';
import { ApiErrorMapper } from '../../../../core/utils/api-error';
import { TPipe } from '../../../../core/i18n/t.pipe';
import { AuthApi } from '../../../../core/auth/auth-api';
import { I18nService } from '../../../../core/i18n/I18n.service';
import {ConfirmDialog} from '../confirm-dialog/confirm-dialog';



export interface ReserveRoomsDialogData {
  startTime: string;
  endTime: string;
  initialRoomId?: number;
  roomsSnapshot: RoomResponse[];
  availableRooms?: RoomResponse[];
  availabilityFailed: boolean;
}

export interface ReserveRoomsDialogResult {
  saved: boolean;
  created?: ReservationCreatedResponse;
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
    TPipe,
  ],
  templateUrl: './reserve-rooms-dialog.html',
  styleUrls: ['./reserve-rooms-dialog.scss'],
})
export class ReserveRoomsDialogComponent implements OnInit {
  rooms: RoomResponse[] = [];
  selected = new Set<number>();

  loading = false;
  saving = false;
  errorMsg: string | null = null;

  submitted = false;
  availabilityFailed = false;

  readonly form: ReserveForm;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: ReserveRoomsDialogData,
    private readonly dialogRef: MatDialogRef<
      ReserveRoomsDialogComponent,
      ReserveRoomsDialogResult
    >,
    private readonly reservationApi: ReservationApiService,
    private readonly fb: NonNullableFormBuilder,
    private readonly auth: AuthApi,
    private readonly i18n: I18nService,
    private readonly dialog: MatDialog
  ) {
    this.form = this.fb.group({
      reservationName: this.fb.control('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      reservationType: this.fb.control('', [Validators.required]),
    });
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

  ngOnInit() {
    this.loading = false;
    this.errorMsg = null;

    this.availabilityFailed = this.data.availabilityFailed;
    this.rooms = this.data.availableRooms ?? [];

    if (this.availabilityFailed) {
      this.errorMsg = this.i18n.t('errors.RESERVATION_ERR_AVAILABILITY_LOAD');
      this.selected.clear();
      return;
    }

    // auto-select chosen room
    if (
      this.data.initialRoomId &&
      this.rooms.some((r) => r.id === this.data.initialRoomId)
    ) {
      this.selected.add(this.data.initialRoomId);
    }
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

    // Build request first (no API call yet)
    const employeeId = this.auth.currentUser()?.employeeId;
    if (!employeeId) {
      this.errorMsg = this.i18n.t('errors.COMMON_USER_NOT_LOADED');
      return;
    }

    const v = this.form.getRawValue();

    const req: CreateReservationRequest = {
      roomIds: Array.from(this.selected),
      employeeId,
      startTime: this.data.startTime,
      endTime: this.data.endTime,
      reservationName: v.reservationName,
      reservationType: v.reservationType,
    };

    // Confirm first, then submit
    this.dialog
      .open(ConfirmDialog, {
        width: '420px',
        maxWidth: '92vw',
        autoFocus: false,
        data: {
          titleKey: 'CONFIRM_TITLE',
          messageKey: 'RESERVATION_CREATE_CONFIRM_MESSAGE',
          confirmKey: 'COMMON_CONFIRM',
          cancelKey: 'COMMON_CANCEL',
        },
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.saving = true;
          this.errorMsg = null;

          return this.reservationApi
            .createReservation(req)
            .pipe(finalize(() => (this.saving = false)));
        })
      )
      .subscribe({
        next: (created) => this.dialogRef.close({ saved: true, created }),
        error: (e) => {
          this.errorMsg = ApiErrorMapper.toMessage(e, (k) => this.i18n.t(k));
        },
      });
  }

  private fmt(s: string): string {
    // "2026-01-19T08:30:00" -> "19.01.2026 08:30"
    const [d, t] = s.split('T');
    if (!d || !t) return s;

    const [y, m, day] = d.split('-');
    if (!y || !m || !day) return s;

    return `${day}.${m}.${y} ${t.slice(0, 5)}`;
  }

  roomTypeKey(rt: string | null | undefined): string {
    switch (rt ?? '') {
      case 'Amphitheater':
        return 'ROOM_TYPE_AMPHITHEATER';
      case 'Classroom':
        return 'ROOM_TYPE_CLASSROOM';
      case 'Computer Room':
        return 'ROOM_TYPE_COMPUTER_ROOM';
      default:
        return 'ROOM_TYPE_OTHER';
    }
  }
}
