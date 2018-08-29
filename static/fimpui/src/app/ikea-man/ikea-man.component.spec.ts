/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { IkeaManComponent } from './ikea-man.component';

describe('IkeaManComponent', () => {
  let component: IkeaManComponent;
  let fixture: ComponentFixture<IkeaManComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ IkeaManComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(IkeaManComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
