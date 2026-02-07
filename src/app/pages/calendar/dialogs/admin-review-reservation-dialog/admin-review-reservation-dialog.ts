import {CommonModule} from '@angular/common';
import {Component, Inject} from '@angular/core';
import {finalize} from 'rxjs';

import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatButtonModule} from '@angular/material/button';
import {MatDividerModule} from '@angular/material/divider';

import {ReservationBlock} from '../../../../core/models/reservation-block';
import {ReservationApiService} from '../../../../core/services/reservation-api';
import {ApiErrorMapper} from '../../../../core/utils/api-error';
import {TPipe} from '../../../../core/i18n/t.pipe';
import {I18nService} from '../../../../core/i18n/I18n.service';

export interface AdminReviewDialogData {
  reservation: ReservationBlock,
  rooms: string[]
}

export interface AdminReviewDialogResult {
  action: 'APPROVE' | 'DECLINE';
}

@Component({
  standalone: true,
  selector: 'app-admin-review-reservation-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatDividerModule, TPipe],
  templateUrl: './admin-review-reservation-dialog.html',
  styleUrls: ['./admin-review-reservation-dialog.scss'],
})
export class AdminReviewReservationDialog {
  saving = false;
  errorMsg: string | null = null;

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: AdminReviewDialogData,
    private readonly dialogRef: MatDialogRef<AdminReviewReservationDialog, AdminReviewDialogResult>,
    private readonly reservationApi: ReservationApiService,
    private readonly i18n: I18nService
  ) {
  }

  hhmm(iso: string) {
    return iso.substring(11, 16);
  }

  close() {
    this.dialogRef.close();
  }

  approve() {
    this.submit('APPROVE');
  }

  decline() {
    this.submit('DECLINE');
  }

  private submit(action: 'APPROVE' | 'DECLINE') {
    if (this.saving) return;

    this.saving = true;
    this.errorMsg = null;

    const id = this.data.reservation.reservationId;

    const call$ =
      action === 'APPROVE'
        ? this.reservationApi.approveReservation(id)
        : this.reservationApi.declineReservation(id);

    call$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: () => this.dialogRef.close({action}),
        error: (e) => {
          this.errorMsg = ApiErrorMapper.toMessage(e, (k) => this.i18n.t(k), 'errors.COMMON_ACTION_FAILED');
        }
      });
  }
}
