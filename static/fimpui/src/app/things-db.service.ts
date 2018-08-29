import { Injectable } from '@angular/core';
import { FimpService} from 'app/fimp/fimp.service'
import { FimpMessage,NewFimpMessageFromString } from 'app/fimp/Message'; 
import { Thing} from './things-db/thing-model';

@Injectable()
export class ThingsDbService {
  private things:Thing[]=[];
  constructor(private fimp:FimpService) {
    this.fimp.getGlobalObservable().subscribe((msg) => {
      console.log("ThingsDBservice new message ")
      let fimpMsg  = NewFimpMessageFromString(msg.payload.toString());
      fimpMsg.topic = fimp.detachGlobalPrefix(msg.topic);
      if (fimpMsg.service == "zwave-ad" && fimpMsg.mtype == "evt.thing.inclusion_report"){
        this.onFimpMessage(fimpMsg);
      } 
      
    });
  }

  onFimpMessage(fimpMsg : FimpMessage){
      let thing = new Thing();
      thing.address = fimpMsg.val.address;
      this.things.push(thing);
  }
  getThings():Thing[]{
    return this.things;

  }

}
