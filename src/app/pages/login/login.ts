import {Component} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Router} from '@angular/router';

import {LoginRequest} from '../../core/requests/login-request';

import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {AuthApi} from '../../core/auth/auth-api';
import {MatDialog} from '@angular/material/dialog';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrls: ['./login.scss'],
})
export class Login {
  form: FormGroup;

  submitted = false;
  loading = false;
  errorMsg: string | null = null;

  // hide / show password
  hidePass = true;

  constructor(
    private fb: FormBuilder,
    private auth: AuthApi,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.dialog.closeAll();
    this.form = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  submit(): void {
    this.submitted = true;
    if (this.loading || this.form.invalid) return;

    this.loading = true;
    this.errorMsg = null;

    const req: LoginRequest = {
      username: this.form.value.username?.trim() ?? '',
      password: this.form.value.password ?? '',
    };

    this.auth.login(req).subscribe({
      next: () => {
        this.loading = false;
        void this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading = false;

        if (err?.status === 401 || err?.status === 403) {
          this.errorMsg = 'Invalid username or password.';
        } else {
          this.errorMsg = 'Login failed. Please try again later.';
        }
      },
    });
  }
}
