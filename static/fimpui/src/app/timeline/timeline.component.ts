import { FimpService} from 'app/fimp/fimp.service'
import { FimpMessage,NewFimpMessageFromString } from '../fimp/Message';
import {Component, ElementRef, ViewChild,OnInit,Input,Output,EventEmitter,Inject} from '@angular/core';
import {DataSource} from '@angular/cdk/collections';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import { BACKEND_ROOT } from "app/globals";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import {HttpClient, HttpParams} from "@angular/common/http";

@Component({
  selector: 'timeline',
  //providers:[FimpService],
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css']
})
export class TimelineComponent implements OnInit {
  topic :string;
  payload:string;
  topicFilter:string;
  serviceFilter:string;
  msgTypeFilter:string;
  fimpService:FimpService;
  displayedColumns = ['time','topic','src','service','msgType','value'];
  // dataSource: MatTableDataSource<FimpMessage>;
  dataSource: TimelineDataSource|null;
  isStreamEnabled : boolean;
  constructor(private fimp: FimpService,public dialog: MatDialog) {
    this.fimpService = fimp;
    this.isStreamEnabled = fimp.getMessageCaptureState()
    var filter = fimp.getFilter();
    this.topicFilter = filter.topicFilter;
    this.serviceFilter = filter.serviceFilter;
    this.msgTypeFilter = filter.msgTypeFilter;
    if (this.topic == "" || this.topic == undefined) {
      this.topic = "pt:j1/mt:cmd/rt:app/rn:put_app_name_here/ad:1"
    }
    if (this.payload == "" || this.payload == undefined) {
      this.payload = "{\n" +
        "  \"type\": \"cmd.app.something\",\n" +
        "  \"serv\": \"set_service_name_here\",\n" +
        "  \"val_t\": \"str_map\",\n" +
        "  \"val\": {\n" +
        "    \"location_id\": \"\"\n" +
        "  },\n" +
        "  \"tags\": null,\n" +
        "  \"props\": null,\n" +
        "  \"ver\": \"1\",\n" +
        "  \"corid\": \"\",\n" +
        "  \"src\": \"tplex-ui\",\n" +
        "  \"ctime\": \"2019-09-13T11:12:51.597+09:00\",\n" +
        "  \"uid\": \"08d2da8b-0d2c-4a2c-a0d7-8facc48b3026\"\n" +
        "}"
    }
    // this.messages = this.fimp.getFilteredMessagLog();
  }

  ngOnInit() {
    this.dataSource = new TimelineDataSource(this.fimpService);
    // this.dataSource = new MatTableDataSource();
    // this.dataSource.data = this.fimpService.getMessagLog();
  }

  filter() {
    this.fimp.setFilter(this.topicFilter,this.serviceFilter,this.msgTypeFilter);
    this.dataSource.setFilter();
  }
  resetFilter(){
    this.topicFilter = "";
    this.serviceFilter = "";
    this.msgTypeFilter = "";
    this.fimp.setFilter(this.topicFilter,this.serviceFilter,this.msgTypeFilter);
    this.dataSource.resetFilter();
  }
  copyToMqttClient(topic:string ,payload:string) {
    this.topic = topic ;
    this.payload = JSON.stringify(JSON.parse(payload),null,2);
  }
  sendMessage(topic:string,payload:string) {
    this.fimp.publish(topic,payload);
  }
  startStream(state:boolean) {
    this.fimp.enableMessageCapture(state);
    this.isStreamEnabled = state;
  }
  openDialog(fimpMsg:FimpMessage): void {
    let dialogRef = this.dialog.open(MsgDetailsDialog, {
      width: '600px',
      data: {"fimp":fimpMsg,"parent":this}
    });

  }

}

export class TimelineDataSource extends DataSource<any> {
  events : FimpMessage[] = [];
  eventsObs = new BehaviorSubject<FimpMessage[]>([]);

  constructor(private fimp: FimpService) {
    super();
    this.events = fimp.getMessagLog();

    this.eventsObs.next(this.events);

    this.fimp.getGlobalObservable().subscribe((msg) => {
       this.eventsObs.next(this.events);
    });
  }
  setFilter(){
    this.events = this.fimp.getFilteredMessagLog()
    this.eventsObs.next(this.events);
  }
  resetFilter(){
    this.events = this.fimp.getMessagLog();
    this.eventsObs.next(this.events);
  }

  connect(): Observable<FimpMessage[]> {
    return this.eventsObs;
  }
  disconnect() {}
}


@Component({
  selector: 'msg-details-dialog',
  templateUrl: 'msg-details-dialog.html',
})
export class MsgDetailsDialog {
  fimpMsg : FimpMessage;
  parentComp : TimelineComponent;
  service :any;
  constructor(
    public dialogRef: MatDialogRef<MsgDetailsDialog>,private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: any) {
      this.fimpMsg = data.fimp;
      this.fimpMsg.raw = JSON.stringify(JSON.parse(this.fimpMsg.raw),null,2)
      this.parentComp = data.parent;
      // this.getServiceByAddress(this.fimpMsg.topic)
    }

  close(): void {
    this.dialogRef.close();
  }

  getServiceByAddress(address:string) {
    this.http.get(BACKEND_ROOT+'/fimp/api/registry/service', { params: new HttpParams().set('address', address) } )
      .subscribe(result=>{this.service = result; });

  }


}

