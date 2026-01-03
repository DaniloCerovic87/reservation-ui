import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalendarGrid } from './calendar-grid';

describe('CalendarGrid', () => {
  let component: CalendarGrid;
  let fixture: ComponentFixture<CalendarGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalendarGrid);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
