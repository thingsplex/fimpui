/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { FimpService } from './fimp.service';

describe('FimpService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FimpService]
    });
  });

  it('should ...', inject([FimpService], (service: FimpService) => {
    expect(service).toBeTruthy();
  }));
});
