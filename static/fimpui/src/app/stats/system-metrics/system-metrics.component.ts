
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

class MeterMetric {
  name:string;
  rate15m:number;
  rate5m:number;
  rate1m:number;
  count:number;
  meanRate:number;
}

@Component({
  selector: 'app-system-metrics',
  templateUrl: './system-metrics.component.html',
  styleUrls: ['./system-metrics.component.css']
})
export class SystemMetricsComponent implements OnInit {
  displayedColumns = ['name','count','meanRate','rate1m','rate5m','rate15m'];
  dataSource = new MatTableDataSource();
  restartTime:string; 
  @ViewChild(MatSort) sort: MatSort;
  constructor(private http : Http) { 
  }

  ngOnInit() {
    this.loadData()  
  }
  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }
  round(value:number):number {
    return Math.round(value*10000)/10000
  }


  loadData() {
    this.http.get(BACKEND_ROOT+'/fimp/api/stats/metrics/meters',{})
    .map((res: Response)=>{
      let result = res.json();
      return result;
    }).subscribe(result=>{
      let metrics:MeterMetric[] = [];
      for(var key in result.metrics){
        let metric = new MeterMetric();
        metric.name = key;
        metric.count = result.metrics[key]["count"];
        metric.rate1m = this.round(result.metrics[key]["1m.rate"]);
        metric.rate5m = this.round(result.metrics[key]["5m.rate"]);
        metric.rate15m = this.round(result.metrics[key]["15m.rate"]);
        metric.meanRate = this.round(result.metrics[key]["mean.rate"]);  
        metrics.push(metric)
      }
      console.dir(metrics);
      this.dataSource.data = metrics;
    });
  }
}
