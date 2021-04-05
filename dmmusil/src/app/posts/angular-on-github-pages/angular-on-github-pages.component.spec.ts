import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AngularOnGithubPagesComponent } from './angular-on-github-pages.component';

describe('AngularOnGithubPagesComponent', () => {
  let component: AngularOnGithubPagesComponent;
  let fixture: ComponentFixture<AngularOnGithubPagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AngularOnGithubPagesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AngularOnGithubPagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
