import {Component, ElementRef, ViewChild,OnInit,Input} from '@angular/core';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import {Subscription} from "rxjs";
import {FimpService} from "../../fimp/fimp.service";
import {FimpMessage, NewFimpMessageFromString} from "../../fimp/Message";

declare var moment: any;
declare var Chart: any;

@Component({
  selector: 'cpu-chart',
  templateUrl: './cpu-chart.html'
})
export class CpuChartComponent implements OnInit  {
  @Input() title : string;
  @Input() dataSrc : any;
  globalSub : Subscription;
  @ViewChild('canvas')
  canvasElement: ElementRef;

  chart : any;
  public chartLabels:string[] = [];
  public chartType:string = 'line';
  public chartLegend:boolean = true;
  public chartData:any[] = [];
  public data1:any[] = [];
  // public data5:any[] = [];
  // public data15:any[] = [];
  private lastRequestId : string ;
  private timer:any;

  constructor(private fimp : FimpService) {
  }

  initDatasets() {
    console.log('Requesting data')
    this.chartLabels.splice(0,this.chartLabels.length)
    this.chartData.splice(0,this.chartData.length)
    // console.dir(this.data1);
    let data1:any[] = [];
    let data5:any[] = [];
    let data15:any[] = [];
    this.chartData.push({
      data:data1,
      label:"1 min avg",
      borderColor:"rgba(63, 191, 63,1)",
      fill:false,
      pointRadius:1.5,
      lineTension:0.2
      // backgroundColor: 'rgba(27,255,16,0.23)',
    });
    this.chartData.push({
      data:data5,
      label:"5 min avg",
      borderColor:"rgb(162,126,10)",
      fill:false,
      pointRadius:1.5,
      lineTension:0.2
      // backgroundColor: 'rgba(27,255,16,0.23)',
    });
    this.chartData.push({
      data:data15,
      label:"15 min avg",
      borderColor:"rgb(179,8,21)",
      fill:false,
      pointRadius:1.5,
      lineTension:0.2
      // backgroundColor: 'rgba(27,255,16,0.23)',
    });
    this.chart.update();

  }
  ngOnInit() {
  }

  ngAfterViewInit() {
   this.initChart();
   this.initDatasets();
   this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
     if(fimpMsg.mtype == "evt.systemos.activity_report" )
     {
        let rep = fimpMsg.val;
        console.dir(rep);
        // this.data1.push({y1:rep.cpu.load1,y5:rep.cpu.load5,y15:rep.cpu.load15,x:new Date()})
        let dt = new Date()
        this.chart.data.datasets[0].data.push({y:rep.cpu.load1,x:dt})
        this.chart.data.datasets[1].data.push({y:rep.cpu.load5,x:dt})
        this.chart.data.datasets[2].data.push({y:rep.cpu.load15,x:dt})
        if (this.chart.data.datasets[0].data.length>50) {
          this.chart.data.datasets[0].data.shift();
          this.chart.data.datasets[1].data.shift();
          this.chart.data.datasets[2].data.shift();
        }
       this.chart.update(0);
     }
    });

    this.timer=setInterval(()=>(this.requestButlerActivitySystemReport()),5000);

  }
  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
    if(this.timer)
      clearInterval(this.timer);
  }
  requestButlerActivitySystemReport(){
    let msg  = new FimpMessage("fhbutler","cmd.systemos.get_activity_report","string","",null,null)
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplexui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:fhbutler/ad:1",msg);
  }

  initChart() {
    var ctx = this.canvasElement.nativeElement.getContext('2d');
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        // labels: this.chartLabels,
        datasets: this.chartData
      },
      options: {
        maintainAspectRatio:false,
        title:{text:this.title,display:true},
        scales: {
          xAxes: [{
            type: 'time',
            bounds:'ticks',
            distribution: 'linear',
            ticks: {
              source: 'auto',
              autoSkip:false
            },
            time:{
              unit:"second",
              displayFormats: {
                second: 'mm.ss'
              }
            }

          }],
          yAxes: [{
            distribution: 'logarithmic',
            ticks: {
              min:0,
              max:1.5,
              beginAtZero: true,
              autoSkip:true
            }
          }]
        }
      }
    });
  }



}
