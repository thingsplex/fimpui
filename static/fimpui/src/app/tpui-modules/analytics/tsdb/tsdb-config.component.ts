
import {Component, ElementRef, ViewChild,OnInit,Input,Output,EventEmitter} from '@angular/core';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import {FimpService} from "../../../fimp/fimp.service";
import {Subscription} from "rxjs";
import {FimpMessage, NewFimpMessageFromString} from "../../../fimp/Message";
import {AnalyticsSettingsService} from "../charts/settings.service";


@Component({
  selector: 'tsdb-config',
  templateUrl: './tsdb-config.component.html',
  styleUrls: ['./tsdb.component.css']
})
export class TsdbConfigComponent implements OnInit {
  selectedProcData :any; // selected procId
  procList :any;
  listOfMeasurements:string[];
  listOfRetensions:string[];
  private globalSub : Subscription;
  private lastRequestId : string ;
  colors = [];
  constructor(private fimp : FimpService,private settings:AnalyticsSettingsService) {
    let colors = settings.getAllColors();
    for (let key in colors) {
      this.colors.push({"label":key,"color":colors[key]});
    }
  }

  ngOnInit() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "ecollector"  ){
        if (fimpMsg.mtype == "evt.ecprocess.proc_list_report") {
          if (fimpMsg.val) {
             this.procList = fimpMsg.val
          }
        }else if (fimpMsg.mtype == "evt.tsdb.retention_policies") {
          if (fimpMsg.val) {
            this.listOfRetensions = fimpMsg.val;
          }
        }else if (fimpMsg.mtype == "evt.tsdb.measurements_report") {
          if (fimpMsg.val) {
            this.listOfMeasurements = fimpMsg.val
          }
        }else if (fimpMsg.mtype == "evt.ecprocess.ctrl_report") {
          this.loadData(1)
        }else if (fimpMsg.mtype == "evt.tsdb.delete_object_report") {
          this.loadDBObjects()
        }
      }
    });
    this.loadData(1)
    this.loadDBObjects()
  }

  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

  colorUpdate(label,$event) {
    let color = $event.target.value;
    console.log("color event "+label+ " "+color);
    console.debug($event);
    this.settings.setColor(label,color);
    this.settings.save();
  }

  hexToRGBA(hex, opacity) {
    return 'rgba(' + (hex = hex.replace('#', '')).match(new RegExp('(.{' + hex.length/3 + '})', 'g')).map(function(l) { return parseInt(hex.length%2 ? l+l : l, 16) }).concat(opacity||1).join(',') + ')';
  }


  loadData(procId:number) {
    let msg  = new FimpMessage("ecollector","cmd.ecprocess.get_list","null",null,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.lastRequestId = msg.uid;
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:ecollector/ad:1",msg);
  }

  loadDBObjects() {
    let msg  = new FimpMessage("ecollector","cmd.tsdb.get_retention_policies","str_map",{"proc_id":"1"},null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.lastRequestId = msg.uid;
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:ecollector/ad:1",msg);

    msg  = new FimpMessage("ecollector","cmd.tsdb.get_measurements","str_map",{"proc_id":"1"},null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.lastRequestId = msg.uid;
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:ecollector/ad:1",msg);
  }

  selectProc(procConfig:any) {
    this.selectedProcData = procConfig
  }

  addSelector() {
    this.selectedProcData.Selectors.push({"ID": -1,"Topic": "","InMemory": false})
  }

  resetConfigsToDefault(){

  }

  saveSelector(selector:any) {
    ///fimproc/tsdb/api/proc/:id/selectors

  }

  removeSelector(id:number) {

  }

  addFilter() {
    this.selectedProcData.Filters.push({
      "ID": -1,
      "Name": "",
      "Topic": "",
      "Domain": "",
      "Service": "",
      "MsgType": "",
      "Negation": false,
      "LinkedFilterBooleanOperation": "",
      "LinkedFilterID": 0,
      "IsAtomic": true,
      "Tags": null,
    })
  }

  removeFilter(id:number) {

  }

  saveMeasurement(measurement:any) {
    measurement.RetentionPolicyName = measurement.ID+"_"+measurement.RetentionPolicyDuration;
  }

  removeMeasurement(id:number) {

  }

  procCtrl(cmd:string,procId:number) {
    console.log("Executing process command "+cmd);
    let msg  = new FimpMessage("ecollector","cmd.ecprocess.ctrl","str_map",{"proc_id":procId,"operation":cmd},null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.lastRequestId = msg.uid;
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:ecollector/ad:1",msg);
  }

  addProc() {
    let msg  = new FimpMessage("ecollector","cmd.ecprocess.add","string","",null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.lastRequestId = msg.uid;
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:ecollector/ad:1",msg);
  }

  updateProcess() {
    //cmd.ecprocess.update_config
    let msg  = new FimpMessage("ecollector","cmd.ecprocess.update_config","object",this.selectedProcData,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.lastRequestId = msg.uid;
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:ecollector/ad:1",msg);
  }

  deleteDbObject(type:string,name:string) {
    let req = {"proc_id":this.selectedProcData.ID.toString(),"name":name,"object_type":type}
    let msg  = new FimpMessage("ecollector","cmd.tsdb.delete_object","str_map",req,null,null)
    msg.src = "tplex-ui"
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.lastRequestId = msg.uid;
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:ecollector/ad:1",msg);
  }
}
