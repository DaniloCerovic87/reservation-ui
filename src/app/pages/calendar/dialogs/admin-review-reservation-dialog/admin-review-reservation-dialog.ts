import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize, filter, switchMap } from 'rxjs';

import { MAT_DIALOG_DATA, MatDialog, MatDialogModule,MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ReservationBlock } from '../../../../core/models/reservation-block';
import { ReservationApiService } from '../../../../core/services/reservation-api';
import { ApiErrorMapper } from '../../../../core/utils/api-error';
import { TPipe } from '../../../../core/i18n/t.pipe';
import { I18nService } from '../../../../core/i18n/I18n.service';
import { ConfirmDialog } from '../confirm-dialog/confirm-dialog';

export interface AdminReviewDialogRoom {
  roomId: number;
  roomName: string;
}

export interface AdminReviewDialogData {
  reservation: ReservationBlock;
  rooms: AdminReviewDialogRoom[];
}

export interface AdminReviewDialogResult {
  saved: boolean;
  approvedRoomIds?: number[];
  declinedRoomIds?: number[];
}

type Decision = 'PENDING' | 'APPROVE' | 'DECLINE';

type RoomDecisionForm = FormGroup<{
  roomId: FormControl<number>;
  roomName: FormControl<string>;
  decision: FormControl<Decision>;
  comment: FormControl<string>;
}>;

@Component({
  standalone: true,
  selector: 'app-admin-review-reservation-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatDividerModule,
    MatRadioModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    TPipe,
  ],
  templateUrl: './admin-review-reservation-dialog.html',
  styleUrls: ['./admin-review-reservation-dialog.scss'],
})
export class AdminReviewReservationDialog {
  saving = false;
  errorMsg: string | null = null;
  submitted = false;

  readonly form: FormGroup<{
    rooms: FormArray<RoomDecisionForm>;
  }>;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: AdminReviewDialogData,
    private readonly dialogRef: MatDialogRef<AdminReviewReservationDialog, AdminReviewDialogResult>,
    private readonly reservationApi: ReservationApiService,
    private readonly i18n: I18nService,
    private readonly fb: NonNullableFormBuilder,
    private readonly dialog: MatDialog
  ) {
    this.form = this.fb.group({
      rooms: this.fb.array(this.buildRoomControls()),
    });
  }

  get roomsFa(): FormArray<RoomDecisionForm> {
    return this.form.controls.rooms;
  }

  hhmm(iso: string) {
    return iso.substring(11, 16);
  }

  close() {
    this.dialogRef.close({ saved: false });
  }

  isDecline(i: number): boolean {
    return this.roomsFa.at(i).controls.decision.value === 'DECLINE';
  }

  // Helpers to avoid template "private member" issues
  commentCtrlAt(i: number) {
    return this.roomsFa.at(i).controls.comment;
  }
  markCommentTouched(i: number) {
    this.commentCtrlAt(i).markAsTouched();
  }
  showCommentError(i: number): boolean {
    const c = this.commentCtrlAt(i);
    return c.invalid && (c.touched || this.submitted);
  }
  commentHasError(i: number, err: string): boolean {
    return this.commentCtrlAt(i).hasError(err);
  }

  onDecisionChange(i: number) {
    const g = this.roomsFa.at(i);
    const decision = g.controls.decision.value;
    const c = g.controls.comment;

    if (decision === 'DECLINE') {
      c.setValidators([Validators.required, Validators.minLength(3), Validators.maxLength(500)]);
    } else {
      c.setValidators([Validators.maxLength(500)]);
      c.setValue('', { emitEvent: false });
    }

    c.updateValueAndValidity();
  }

  private buildRoomControls(): RoomDecisionForm[] {
    return (this.data.rooms ?? []).map((r) =>
      this.fb.group({
        roomId: this.fb.control(r.roomId),
        roomName: this.fb.control(r.roomName),
        decision: this.fb.control<Decision>('PENDING', { validators: [Validators.required] }),
        comment: this.fb.control('', { validators: [Validators.maxLength(500)] }),
      })
    );
  }

  submitReview() {
    if (this.saving) {
      return;
    }

    this.submitted = true;
    this.errorMsg = null;

    // ensure validators are applied for current decisions
    this.roomsFa.controls.forEach((_g, i) => this.onDecisionChange(i));

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;

    const reservationId = this.data.reservation.reservationId;

    // Build payload: send ONLY approve + decline; pending omitted
    const approveRoomIds = this.roomsFa.controls
      .filter(g => g.controls.decision.value === 'APPROVE')
      .map(g => g.controls.roomId.value);

    const declineRooms = this.roomsFa.controls
      .filter(g => g.controls.decision.value === 'DECLINE')
      .map(g => ({
        roomId: g.controls.roomId.value,
        comment: (g.controls.comment.value ?? '').trim(),
      }));

    // if admin left everything PENDING => nothing to send
    if (approveRoomIds.length === 0 && declineRooms.length === 0) {
      this.dialogRef.close({ saved: true, approvedRoomIds: [], declinedRoomIds: [] });
      return;
    }

    this.dialog
      .open(ConfirmDialog, {
        width: '420px',
        maxWidth: '92vw',
        autoFocus: false,
        disableClose: true,
        data: {
          titleKey: 'CONFIRM_TITLE',
          messageKey: 'RESERVATION_REVIEW_CONFIRM_SUBMIT',
          confirmKey: 'COMMON_CONFIRM',
          cancelKey: 'COMMON_CANCEL',
        },
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.saving = true;
          return this.reservationApi
            .reviewReservationRooms(reservationId, { approveRoomIds, declineRooms })
            .pipe(finalize(() => (this.saving = false)));
        })
      )
      .subscribe({
        next: () =>
          this.dialogRef.close({
            saved: true,
            approvedRoomIds: approveRoomIds,
            declinedRoomIds: declineRooms.map(d => d.roomId),
          }),
        error: (e) => {
          this.errorMsg = ApiErrorMapper.toMessage(e, (k) => this.i18n.t(k), 'errors.COMMON_ACTION_FAILED');
        },
      });
  }
}
