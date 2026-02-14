import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import {TPipe} from '../../../../core/i18n/t.pipe';

export interface ConfirmDialogData {
  titleKey: string;
  messageKey: string;
  confirmKey?: string;
  cancelKey?: string;
}

@Component({
  standalone: true,
  selector: 'app-confirm-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, TPipe],
  template: `
    <h2 mat-dialog-title>{{ data.titleKey | t }}</h2>

    <div mat-dialog-content>
      <p>{{ data.messageKey | t }}</p>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-button (click)="ref.close(false)">
        {{ (data.cancelKey ?? 'COMMON_CANCEL') | t }}
      </button>

      <button mat-flat-button color="primary" (click)="ref.close(true)">
        {{ (data.confirmKey ?? 'COMMON_CONFIRM') | t }}
      </button>
    </div>
  `,
})
export class ConfirmDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
    public ref: MatDialogRef<ConfirmDialog, boolean>
  ) {}
}
