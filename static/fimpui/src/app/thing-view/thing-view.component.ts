import { Component, OnInit , OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FimpService} from 'app/fimp/fimp.service';
import { MapFimpInclusionReportToThing ,MapJsonToThingObject } from '../things-db/integrations';
import { Thing } from '../things-db/thing-model';
import { FimpMessage ,NewFimpMessageFromString } from '../fimp/Message';
import { Subscription } from 'rxjs';
import { BACKEND_ROOT } from "app/globals";
import {Location} from '@angular/common';
import {HttpClient, HttpHeaders} from "@angular/common/http";

@Component({
  selector: 'app-thing-view',
  templateUrl: './thing-view.component.html',
  styleUrls: ['./thing-view.component.css']
})
export class ThingViewComponent implements OnInit ,OnDestroy{
  globalSub : Subscription;
  thing : Thing;
  advancedViewMode:boolean;

  rows = [
  ];
  // columns = [
  //   { prop: 'name' , name:'Service name' },
  //   { prop: 'address',width:350 },
  //   { prop: 'groups' },
  // ];

  constructor(private fimp:FimpService,private route: ActivatedRoute,private http : HttpClient,private _location: Location) {
    this.thing = new Thing();
    this.advancedViewMode = true;
  }

  ngOnInit() {
    let techAdapterName  = this.route.snapshot.params['ad'];
    let address  = this.route.snapshot.params['id'];
    if (!techAdapterName){
      techAdapterName = address.split(":")[0];
      address = address.split(":")[1];
    }
    if (address.includes("rn:")) {
      //  /rn:conbee/ad:1/ad:s34
      let addressSplit = address.split("/ad:");
      address = addressSplit[2];
      techAdapterName = addressSplit[0].replace("/rn:","")
    }
    console.log("Address:"+address)
    console.log("Adapter:"+techAdapterName)
    address = address.split("_")[0];
    //this.getReport(techAdapterName,serviceName,id);
    // if(techAdapterName == "zw") {
      this.subscribeForFimpMsg(techAdapterName,address)
      this.getReport(techAdapterName,address);
    // }else
    //   this.loadThingFromRegistry(techAdapterName,address);
  }
  enableAdvancedView(flag:boolean) {
    this.advancedViewMode = flag;
  }

  ngOnDestroy() {
    if (this.globalSub!=undefined)
       this.globalSub.unsubscribe();
  }

  subscribeForFimpMsg(techAdapterName:string,address:string) {
    let serviceName = this.getServiceName(techAdapterName);
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      // adapter topic
      if (fimpMsg.service == serviceName )
        {
        if(fimpMsg.mtype == "evt.thing.inclusion_report" )
        {
          console.log("New thing")
          this.thing = MapFimpInclusionReportToThing(fimpMsg);
          this.rows = this.thing.services;
        }

      }else {
        // device topic
        console.log("Sensor report");
        if(this.thing.services) {
          for (let svc of this.thing.services){
            // console.log("Comparing "+msg.topic+" with "+ "pt:j1/mt:evt"+svc.address);
            var topic = this.fimp.detachGlobalPrefix(fimpMsg.topic);
            if (topic == "pt:j1/mt:evt"+svc.address) {
              // console.log("Matching service "+fimpMsg.service);
              if(svc.interfaces){
                for (let inf of svc.interfaces) {
                  if ( fimpMsg.mtype == inf.msgType ) {
                    // console.log("Value updated");
                    inf.lastValue = fimpMsg
                    return;
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  getServiceName(techAdapterName:string):string{
    if (techAdapterName == "zw"){
      techAdapterName = "zwave-ad";
    }
    return techAdapterName;
  }

  getReport(techAdapterName:string, nodeId:string){
    let serviceName = this.getServiceName(techAdapterName);
    let msg  = new FimpMessage(serviceName,"cmd.thing.get_inclusion_report","string",nodeId,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:ad/rn:"+techAdapterName+"/ad:1",msg);
  }

  saveThingToRegistry(alias:string){
    this.thing.alias = alias;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    let options = {headers:headers};
    console.log(this.thing.alias);
     this.http
      .put(BACKEND_ROOT+'/fimp/api/registry/thing',this.thing,  options )
      .subscribe ((result) => {
         console.log("Thing was saved");
      });
  }

  loadThingFromRegistry(techAdapterName:string,address:string) {
     this.http
      .get(BACKEND_ROOT+'/fimp/api/registry/thing/'+techAdapterName+"/"+address)
      .subscribe ((result) => {
          this.thing = MapJsonToThingObject(result);
          console.dir(this.thing)
          this.rows = this.thing.services;
          this.subscribeForFimpMsg(techAdapterName,address);
      },err=> {
        console.log("Registry failed , requesting from adapter instead.")
        this.subscribeForFimpMsg(techAdapterName,address);
        this.getReport(techAdapterName,address);
      } );
  }

  backClicked() {
    this._location.back();
  }

}
