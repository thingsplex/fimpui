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
import {MatDialog, MatDialogRef,MatSnackBar} from '@angular/material';

@Component({
  selector: 'app-event-log',
  templateUrl: './event-log.component.html',
  styleUrls: ['./event-log.component.css']
})
export class EventLogComponent implements OnInit {
  displayedColumns = ['timestamp','resourceType','address','code','errSource','msg'];
  dataSource: EventLogDataSource | null;
  constructor(private http : Http,public dialog: MatDialog) {
  }

  ngOnInit() {
    this.dataSource = new EventLogDataSource(this.http);
  }
  dropDb() {
    this.dataSource.dropDb();
  }
}

export class EventLogDataSource extends DataSource<any> {
  events : any[] = [];
  eventsObs = new BehaviorSubject<any[]>([]);
  aggrErrorsByDevice : any[] = [];

  constructor(private http : Http) {
    super();
    this.getData();
  }

  aggregatedErrorsByDevice(events:any[]):any[]{
    var resultTmp = {};
    for(let i in events) {
        // console.dir(events[i]["ThingAddress"]);

        if (events[i]["Value"]=="TX_ERROR")
        {
          if (resultTmp[events[i]["ThingAddress"]]== undefined)
            resultTmp[events[i]["ThingAddress"]] = 1;
          else
            resultTmp[events[i]["ThingAddress"]] = resultTmp[events[i]["ThingAddress"]]+1;
        }
    }
    var resultArray = [];
    for(let thingAddr in resultTmp) {
      resultArray.push({"address":thingAddr,"count":resultTmp[thingAddr]})
    }
    return resultArray.sort(function(a,b){
      if(a.count<b.count)
         return 1;
      if(a.count>b.count)
         return -1;
      return 0;
    })
  }

  getData() {
    let params: URLSearchParams = new URLSearchParams();
    params.set('pageSize', '500');
    params.set('page', '0');
    this.http
        .get(BACKEND_ROOT+'/fimp/api/stats/event-log',{search:params})
        .map((res: Response)=>{
          let result = res.json();
          return result;
        }).subscribe(result=>{
          this.aggrErrorsByDevice = this.aggregatedErrorsByDevice(result);
          console.dir(this.aggrErrorsByDevice);
          this.eventsObs.next(result);
        });

  }

  dropDb() {
    this.http
      .post(BACKEND_ROOT+'/fimp/api/stats/drop-eventsdb',{})
      .map((res: Response)=>{
        let result = res.json();
        return result;
      }).subscribe(result=>{
        this.getData();
    });

  }

  connect(): Observable<Location[]> {
    return this.eventsObs;
  }
  disconnect() {}


}

@Component({
  selector: 'events-per-device-chart',
  templateUrl: './events-per-device-chart.html'
})
export class EventsPerDeviceChart implements OnInit  {
  @Input() events: any[];
  public barChartOptions:any = {
    scaleShowVerticalLines: false,
    responsive: true
  };
  public barChartLabels:string[] = [];
  public barChartType:string = 'bar';
  public barChartLegend:boolean = true;

  public barChartData:any[] = [
    {data: [], label: 'ERRORs'},
    // {data: [28, 48, 40, 19, 86, 27, 90], label: 'Series B'}
  ];


  ngOnInit() {

    this.loadData();
  }

  loadData(){
    console.log("Loading data");
    console.dir(this.events);
    this.barChartLabels = [];
    for(let i in this.events) {
      this.barChartLabels.push(this.events[i].address)
    }
    this.barChartData[0]["data"] = [];
    for(let i in this.events) {
      this.barChartData[0]["data"].push(this.events[i].count)
    }
  }


}
