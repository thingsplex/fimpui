
import {Component, ElementRef, ViewChild,OnInit,Input,Output,EventEmitter} from '@angular/core';
import {DataSource} from '@angular/cdk/collections';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import {Headers, Http, RequestOptions, Response, URLSearchParams} from '@angular/http';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import { BACKEND_ROOT } from "app/globals";
import {MatSnackBar,MatTableDataSource,MatSort} from '@angular/material';


@Component({
  selector: 'tsdb-config',
  templateUrl: './tsdb-config.component.html',
  styleUrls: ['./tsdb.component.css']
})
export class TsdbConfigComponent implements OnInit {
 procData :any;
 procList :any;

  constructor(private http : Http) {
  }

  ngOnInit() {
    this.loadData()
  }

  loadData() {
    this.http.get(BACKEND_ROOT+'/fimproc/tsdb/api/proc/1',{})
    .map((res: Response)=>{
      let result = res.json();
      return result;
    }).subscribe(result=>{
     this.procData = result[0];
    });

    this.http.get(BACKEND_ROOT+'/fimproc/tsdb/api/proc/monitoring',{})
      .map((res: Response)=>{
        let result = res.json();
        return result;
      }).subscribe(result=>{
      this.procList = result;
    });

  }


  addSelector() {
    this.procData.Selectors.push({"ID": -1,"Topic": "","InMemory": false})
  }

  saveSelector(selector:any) {
    ///fimproc/tsdb/api/proc/:id/selectors
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({headers:headers});
    this.http
      .put(BACKEND_ROOT+'/fimproc/tsdb/api/proc/'+this.procData.ID+'/selectors',JSON.stringify(selector),  options )
      .subscribe ((result) => {
        console.log("Selector was saved");
        this.loadData();
      });

  }

  removeSelector(id:number) {
    this.http
      .delete(BACKEND_ROOT+'/fimproc/tsdb/api/proc/'+this.procData.ID+'/selectors/'+id)
      .subscribe ((result) => {
        console.log("Selector was removed");
        this.loadData();
      });
  }

  addFilter() {
    this.procData.Filters.push({
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
      "MeasurementID": "default",
      "InMemory": false
    })
  }

  saveFilter(filter:any) {
    ///fimproc/tsdb/api/proc/:id/selectors
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({headers:headers});
    this.http
      .put(BACKEND_ROOT+'/fimproc/tsdb/api/proc/'+this.procData.ID+'/filters',JSON.stringify(filter),  options )
      .subscribe ((result) => {
        console.log("Filter was saved");
        this.loadData();
      });

  }

  removeFilter(id:number) {
    this.http
      .delete(BACKEND_ROOT+'/fimproc/tsdb/api/proc/'+this.procData.ID+'/filters/'+id)
      .subscribe ((result) => {
        console.log("Filter was removed");
        this.loadData();
      });
  }

  addMeasurement() {
    this.procData.Measurements.push({
      "ID": "",
      "Name": "",
      "UseServiceAsMeasurementName": true,
      "RetentionPolicyName": "default_8w",
      "RetentionPolicyDuration": "8w",
      "IsNew":true
    })
  }

  saveMeasurement(measurement:any) {
    ///fimproc/tsdb/api/proc/:id/selectors
    measurement.RetentionPolicyName = measurement.ID+"_"+measurement.RetentionPolicyDuration;
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({headers:headers});
    this.http
      .put(BACKEND_ROOT+'/fimproc/tsdb/api/proc/'+this.procData.ID+'/measurements',JSON.stringify(measurement),  options )
      .subscribe ((result) => {
        console.log("Measurement was saved");
        this.loadData();
      });

  }

  removeMeasurement(id:number) {
    this.http
      .delete(BACKEND_ROOT+'/fimproc/tsdb/api/proc/'+this.procData.ID+'/measurements/'+id)
      .subscribe ((result) => {
        console.log("Measurement was removed");
        this.loadData();
      });
  }

  procCtrl(cmd:string,procId:number) {

    //endp.Echo.POST("/fimproc/tsdb/api/proc/:id", endp.updateProcessConfigEndpoint)
    // 	endp.Echo.POST("/fimproc/tsdb/api/proc/:id/ctl", endp.ctlProcessEndpoint)
    console.log("Executing process command "+cmd);
    let headers = new Headers({ 'Content-Type': 'application/json' });
    let options = new RequestOptions({headers:headers});
    switch (cmd) {
      case "save":

        this.http
          .post(BACKEND_ROOT+'/fimproc/tsdb/api/proc/'+procId,JSON.stringify(this.procData),  options )
          .subscribe ((result) => {
            console.log("Process was saved");
          });
        break;
      case "start":
      case "stop":
        let ctlReq = {"Action":cmd};
        this.http
          .post(BACKEND_ROOT+'/fimproc/tsdb/api/proc/'+procId+"/ctl",JSON.stringify(ctlReq),  options )
          .subscribe ((result) => {
            console.log("Process was "+cmd);
            this.loadData()
          });

    }


  }

}
