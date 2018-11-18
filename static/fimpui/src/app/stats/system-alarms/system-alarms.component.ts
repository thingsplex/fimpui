
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
  displayedColumns = ['name','device_type','vinc_dev_id','tech','dev_address','power_source','prod_hash','wakeup_int',
                      'status','mon_type','mon_op_status','last_contact','last_wakeup','last_failure','last_recovery','last_ping','last_notify'];
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
        if (fimpMsg.mtype == "evt.angry_dog.device_list_report") {
          console.log("Message from angry dog evt.angry_dog.device_list_report");
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
    let msgType = "cmd.angry_dog.get_all_devices";

    let msg  = new FimpMessage("angry_dog",msgType,"string","all",null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:angry_dog/ad:1",msg.toString());
  }

  onModeChange(event:any) {
    this.loadDataFromMq(this.mode);
  }

}
