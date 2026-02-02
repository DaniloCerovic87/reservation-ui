import {
  Pipe, PipeTransform, inject, ChangeDetectorRef, effect
} from '@angular/core';
import {I18nService} from './I18n.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false, // ostavi impure (ili može i pure:false ovde)
})
export class TPipe implements PipeTransform {
  private i18n = inject(I18nService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // ✅ Pipe se “zakači” na revision signal i kad se promeni – pokrene CD
    effect(() => {
      this.i18n.revision();     // samo čitanje da se uspostavi dependency
      this.cdr.markForCheck();  // idiomatski okidač za zoneless/onpush
    });
  }

  transform(key: string): string {
    return this.i18n.t(key);
  }
}
