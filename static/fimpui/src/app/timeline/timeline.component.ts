import { FimpService} from 'app/fimp/fimp.service'
import { FimpMessage,NewFimpMessageFromString } from '../fimp/Message';
import {Component, ElementRef, ViewChild,OnInit,Input,Output,EventEmitter,Inject} from '@angular/core';
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
import {MatDialog, MatDialogRef,MAT_DIALOG_DATA,MatSnackBar, MatTableDataSource} from '@angular/material';
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
  displayedColumns = ['time','topic','service','msgType','value'];
  // dataSource: MatTableDataSource<FimpMessage>;
  dataSource: TimelineDataSource|null;
  constructor(private fimp: FimpService,public dialog: MatDialog) {
    this.fimpService = fimp;
    var filter = fimp.getFilter();
    this.topicFilter = filter.topicFilter;
    this.serviceFilter = filter.serviceFilter;
    this.msgTypeFilter = filter.msgTypeFilter;
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
      this.getServiceByAddress(this.fimpMsg.topic)
    }

  close(): void {
    this.dialogRef.close();
  }

  getServiceByAddress(address:string) {
    this.http.get(BACKEND_ROOT+'/fimp/api/registry/service', { params: new HttpParams().set('address', address) } )
      .subscribe(result=>{this.service = result; });

  }


}

