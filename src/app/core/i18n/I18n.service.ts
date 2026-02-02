import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

type Dict = Record<string, string>;

@Injectable({ providedIn: 'root' })
export class I18nService {
  private http = inject(HttpClient);

  readonly lang = signal<'sr' | 'en'>('sr');

  private readonly dict = signal<Dict>({});
  readonly revision = signal(0);

  private cache = new Map<string, Dict>();

  async init(defaultLang: 'sr' | 'en' = 'sr') {
    const saved = (localStorage.getItem('app_lang') as 'sr' | 'en' | null);
    const lang = saved ?? defaultLang;

    this.lang.set(lang);
    await this.loadLang(lang);
  }

  async setLang(lang: 'sr' | 'en') {
    if (this.lang() === lang) return;
    this.lang.set(lang);
    await this.loadLang(lang);
  }

  t(key: string): string {
    return this.dict()[key] ?? key;
  }

  private async loadLang(lang: string) {
    const cached = this.cache.get(lang);
    if (cached) {
      this.dict.set(cached);
      this.revision.update(v => v + 1);
      return;
    }

    const data = await firstValueFrom(
      this.http.get<Dict>(`assets/i18n/${lang}.json`)
    );

    this.cache.set(lang, data);
    this.dict.set(data);
    this.revision.update(v => v + 1);
  }
}
