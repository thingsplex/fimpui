import {Injectable} from '@angular/core';
import {BehaviorSubject} from "rxjs";


declare const document: any;

@Injectable()
export class CacheService {

  public whatever$: BehaviorSubject<{data: any}> = new BehaviorSubject<{data: any}>(null);

}
