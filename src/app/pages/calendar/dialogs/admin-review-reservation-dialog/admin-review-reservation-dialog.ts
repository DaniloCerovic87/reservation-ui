import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

import { ReservationBlock } from '../../../../core/models/reservation-block';

export type AdminReviewAction = 'APPROVE' | 'DECLINE';

export interface AdminReviewDialogData {
  reservation: ReservationBlock;
}

export interface AdminReviewDialogResult {
  action: AdminReviewAction;
}

@Component({
  standalone: true,
  selector: 'app-admin-review-reservation-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './admin-review-reservation-dialog.html',
  styleUrls: ['./admin-review-reservation-dialog.scss'],
})
export class AdminReviewReservationDialog {
  readonly submitting = signal(false);

  constructor(
    private dialogRef: MatDialogRef<AdminReviewReservationDialog, AdminReviewDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: AdminReviewDialogData
  ) {}

  hhmm(iso: string) {
    return iso.substring(11, 16);
  }

  close() {
    this.dialogRef.close();
  }

  approve() {
    this.dialogRef.close({ action: 'APPROVE' });
  }

  decline() {
    this.dialogRef.close({ action: 'DECLINE' });
  }
}
