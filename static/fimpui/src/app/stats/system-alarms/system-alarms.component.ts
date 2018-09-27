
import {Component, ElementRef, ViewChild,OnInit,Input,Output,EventEmitter} from '@angular/core';
import {DataSource} from '@angular/cdk/collections';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import { Http, Response,URLSearchParams }  from '@angular/http';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import { BACKEND_ROOT } from "app/globals";
import {MatSnackBar,MatTableDataSource,MatSort} from '@angular/material';
import {FimpService} from "../../fimp/fimp.service";
import {FimpMessage, NewFimpMessageFromString} from "../../fimp/Message";
import {Subscription} from "rxjs/Subscription";


@Component({
  selector: 'app-system-alarms',
  templateUrl: './system-alarms.component.html',
  styleUrls: ['./system-alarms.component.css']
})
export class SystemAlarmsComponent implements OnInit {
  displayedColumns = ['name','service','address','event','status','power-source','last-contact','is-smoke-sensor','trans-nr'];
  globalSub : Subscription;
  dataSource = new MatTableDataSource();
  mode :string;

  @ViewChild(MatSort) sort: MatSort;
  constructor(private http : Http,private fimp:FimpService) {
  }

  ngOnInit() {
    // this.loadData()
    this.mode = "faults"
    this.loadDataFromMq(this.mode);
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());
      if (fimpMsg.service == "angry_dog" ){
        if (fimpMsg.mtype == "evt.angry_dog_api.dev_fault_report") {
          console.log("Message from angry dog evt.angry_dog_api.dev_fault_report");
          if (fimpMsg.val)
            this.dataSource.data = fimpMsg.val;
          else
            this.dataSource.data = [];
        }else if (fimpMsg.mtype == "evt.angry_dog_api.dev_report") {
          console.log("Message from angry dog evt.angry_dog_api.dev_report");
          if (fimpMsg.val)
            this.dataSource.data = fimpMsg.val;
          else
            this.dataSource.data = [];
        }

      }

    });
  }
  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }
  round(value:number):number {
    return Math.round(value*10000)/10000
  }


  loadDataFromMq(mode){
    let msgType = "cmd.angry_dog_api.get_dev_fault_report";
    if (mode=="all") {
      msgType = "cmd.angry_dog_api.get_dev_report"
    }
    let msg  = new FimpMessage("angry_dog",msgType,"null",null,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:angry_dog/ad:1",msg.toString());
  }

  onModeChange(event:any) {
    this.loadDataFromMq(this.mode);
  }

}
