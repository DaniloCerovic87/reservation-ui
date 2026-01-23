import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DayGrid } from './day-grid';

describe('DayGrid', () => {
  let component: DayGrid;
  let fixture: ComponentFixture<DayGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DayGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DayGrid);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
