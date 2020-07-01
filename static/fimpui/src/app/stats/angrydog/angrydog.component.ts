
import {Component, ElementRef, ViewChild,OnInit,Input,Output,EventEmitter} from '@angular/core';
import {DataSource} from '@angular/cdk/collections';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import {FimpService} from "../../fimp/fimp.service";
import {FimpMessage, NewFimpMessageFromString} from "../../fimp/Message";
import {Subscription} from "rxjs/Subscription";


@Component({
  selector: 'angrydog',
  templateUrl: './angrydog.component.html',
  styleUrls: ['./angrydog.component.css']
})
export class AngrydogComponent implements OnInit {
  displayedColumns = ['name','device_type','vinc_dev_id','tech','dev_address','power_source','prod_hash','wakeup_int',
                      'status','mon_type','mon_op_status','health_index','time_since_last_contact','last_contact','last_wakeup','last_failure','last_recovery','last_ping','last_notify'];
  displayedColumnsRifleTest = ['SeqNumber','NodeId','DeltaTime','ElapsedTime','Status']

  globalSub : Subscription;
  dataSource = new MatTableDataSource();
  dataSourceRifleTest = new MatTableDataSource();
  rifleTestReport : any;
  rifleTestMode  = 0;
  mode :string;
  resendInterval = 30;
  globalTimeout = 0;
  noOpTimeout  = 60;
  @ViewChild(MatSort) sort: MatSort;
  constructor(private fimp:FimpService) {
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
          if (fimpMsg.val) {
            this.dataSource.data = this.loadDeviceExtendedInfo(fimpMsg.val);

          }else
            this.dataSource.data = [];
        }else  if (fimpMsg.mtype == "evt.systest.mdu_rifle_report") {
            this.dataSourceRifleTest.data = fimpMsg.val.Devices;
            this.rifleTestReport = fimpMsg.val;
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

  resyncAngrydogDB() {
    let msgType = "cmd.angry_dog.resync";
    let msg  = new FimpMessage("angry_dog",msgType,"string","all",null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:angry_dog/ad:1",msg.toString());

  }

  reloadRifleTestReport() {
    this.dataSourceRifleTest.data = [];
    this.rifleTestReport = {"Status":"running"};
    let msgType = "cmd.systest.get_mdu_rifle_report";
    let msg  = new FimpMessage("angry_dog",msgType,"null",null,null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:angry_dog/ad:1",msg.toString());
  }

  runRifleTest() {
    this.dataSourceRifleTest.data = [];
    this.rifleTestReport = {"Status":"running"};
    let msgType = "cmd.systest.run_mdu_rifle";
    let msg  = new FimpMessage("angry_dog",msgType,"int_map",{
      "global_timeout":this.globalTimeout ,
      "resend_interval":this.resendInterval ,
      "no_activity_timeout":this.noOpTimeout,
      "mode":this.rifleTestMode},null,null)
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:angry_dog/ad:1",msg.toString());
  }


  loadDeviceExtendedInfo(val:any) {
    if (localStorage.getItem("zwaveNodesList")!=null){
      var nodes :any;
      nodes = JSON.parse(localStorage.getItem("zwaveNodesList"));
      for (let dev of val){
        for(let node of nodes) {
          if (dev.dev_address == node.address) {
            dev.name = node.room +" "+ node.alias;
          }
        }
      }

    }
    return val
  }

  onModeChange(event:any) {
    this.loadDataFromMq(this.mode);
  }

}
