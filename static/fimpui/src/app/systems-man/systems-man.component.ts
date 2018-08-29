import { Component, OnInit } from '@angular/core';
import { FimpService} from 'app/fimp/fimp.service';
import { FimpMessage ,NewFimpMessageFromString } from '../fimp/Message'; 
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-systems-man',
  templateUrl: './systems-man.component.html',
  styleUrls: ['./systems-man.component.css']
})
export class SystemsManComponent implements OnInit {
  systemId : string;
  address : string ;
  securityKey : string;
  globalSub : Subscription;
  constructor(private fimp:FimpService) { }

  ngOnInit() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {
      console.log(msg.payload.toString());
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if(fimpMsg.mtype == "evt.system.connect_params_report" )
        { 
          console.log("updating variables");
          this.systemId = fimpMsg.val["id"];
          this.address = fimpMsg.val["address"];
        }
      //this.messages.push("topic:"+msg.topic," payload:"+msg.payload);
    });

  }

  public connect(service:string,systemId:string,securityKey:string,address:string) {
     let val = {"address":address,"security_key":securityKey,"id":systemId};
     let msg  = new FimpMessage(service,"cmd.system.connect","str_map",val,null,null);
     this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:"+service+"/ad:1",msg.toString());
  }

  public getConnParams(service:string) {
    let msg  = new FimpMessage(service,"cmd.system.get_connect_params","null",null,null,null);
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:"+service+"/ad:1",msg.toString());
 }

  public disconnect(service:string) {
    let msg  = new FimpMessage(service,"cmd.system.disconnect","null",null,null,null);
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:"+service+"/ad:1",msg.toString());
 }
 // Force system syncronization . 
 public sync(service:string) {
  let msg  = new FimpMessage(service,"cmd.system.sync","null",null,null,null);
  this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:"+service+"/ad:1",msg.toString());
}
}
