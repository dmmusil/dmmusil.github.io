import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AzureSqlServerlessComponent } from './azure-sql-serverless.component';

describe('AzureSqlServerlessComponent', () => {
  let component: AzureSqlServerlessComponent;
  let fixture: ComponentFixture<AzureSqlServerlessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AzureSqlServerlessComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AzureSqlServerlessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
