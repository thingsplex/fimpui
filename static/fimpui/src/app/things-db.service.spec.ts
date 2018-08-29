/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ThingsDbService } from './things-db.service';

describe('ThingsDbService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThingsDbService]
    });
  });

  it('should ...', inject([ThingsDbService], (service: ThingsDbService) => {
    expect(service).toBeTruthy();
  }));
});
