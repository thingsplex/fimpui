import {Component, Input, OnInit} from '@angular/core';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import {ThingsRegistryService} from "../../registry/registry.service";
import {AnalyticsSettingsService} from "../charts/settings.service";
import {FimpService} from "../../../fimp/fimp.service";
import {Subscription} from "rxjs";
import {NewFimpMessageFromString} from "../../../fimp/Message";

@Component({
  selector: 'app-analytics-explore',
  templateUrl: './energy.component.html',
  styleUrls: ['./energy.component.css']
})
export class EnergyComponent implements OnInit {
  public selectedChartTypes :any[] = ["pImport","eImport","battery"];
  public listOfChartTypes : any[] = ["pImport","pExport","eImport","eExport","battery"] ;
  timeFromNow :string = "1d";
  groupByTime :string = "1h";
  groupByTag  :string = "location_id";
  private _refreshRate :number = 60;
  gSize : number = 350;
  importFilter = {"tags":{"dir":"import"}}
  exportFilter = {"tags":{"dir":"export"}}
  fillGaps : boolean = false;
  dataProcFunc : string = "mean";
  dataTransformFuncV : string = "";
  reloadSignal:boolean;
  intervalTimer:any;
  toTime :string = "";
  fromTime:string = "";
  globalSub : Subscription;
  selectedProductionMeter:string;
  productionMeterId:number;
  pMaxValue:number;

  set refreshRate(rate : number) {
    if (rate==-1)
      return;
    this._refreshRate = rate;
    if (this.intervalTimer!=undefined) {
      clearInterval(this.intervalTimer);
    }
    this.intervalTimer = setInterval(r=>this.reload(),this._refreshRate*1000);

  }
  get refreshRate():number {
    return this._refreshRate;
  }

  get availableMeters():any {
    return this.registry.getDevicesFilteredByService("meter_elec")
  }

  constructor(private registry:ThingsRegistryService,private fimp : FimpService,private settings:AnalyticsSettingsService) {
  }
  ngOnInit() {
    this.loadFromStorage();
  }

  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((msg) => {
      let fimpMsg = NewFimpMessageFromString(msg.payload.toString());

    });
  }

  reload() {
    if(this.reloadSignal)
      this.reloadSignal = false;
    else {
      this.reloadSignal = true;
    }
  }
  save() {
    this.saveToStorage()
  }

  fromDateChange(event) {
    if(event.value)
      this.fromTime = event.value.format("YYYY-MM-DDTHH:mm:ss")+"Z";
    else
      this.fromTime = "";
  }

  toDateChange(event) {
    if(event.value)
      this.toTime = event.value.format("YYYY-MM-DDTHH:mm:ss")+"Z";
    else
      this.toTime = "";
  }

  saveToStorage() {
    let configs = {};
    configs["selectedChartTypes"] = this.selectedChartTypes;
    configs["groupByTag"] = this.groupByTag;
    configs["groupByTime"] = this.groupByTime;
    configs["timeFromNow"] = this.timeFromNow;
    configs["gSize"] = this.gSize;
    configs["refreshRate"] = this.refreshRate;
    configs["fillGaps"] = this.fillGaps;
    configs["dataProcFunc"] = this.dataProcFunc;
    configs["productionMeterId"] = this.productionMeterId;
    configs["pMaxValue"] = this.pMaxValue;
    this.settings.updateDashboardConfigs("genericEnergy",configs);
    this.settings.save();
  }

  loadFromStorage():boolean {
    let configs = this.settings.getDashboardConfigs("genericEnergy");
    if (configs) {
      if (configs["selectedChartTypes"])
        this.selectedChartTypes = configs["selectedChartTypes"];
      this.groupByTag = configs["groupByTag"];
      this.groupByTime = configs["groupByTime"];
      this.timeFromNow = configs["timeFromNow"];
      this.gSize = configs["gSize"];
      this.refreshRate = configs["refreshRate"];
      this.fillGaps = configs["fillGaps"];
      this.dataProcFunc = configs["dataProcFunc"];
      this.productionMeterId = configs["productionMeterId"];
      if (configs["pMaxValue"])
        this.pMaxValue = configs["pMaxValue"];
      else
        this.pMaxValue = 7000;
      if (this.productionMeterId)
        this.selectedProductionMeter = this.productionMeterId.toString();

      return true
    }
    console.log("GMaxValue = "+this.pMaxValue)
    return false;
  }

  updateListOfChartTypes() {

  }
  updateProductionMeter() {
    this.productionMeterId = Number(this.selectedProductionMeter)
    console.log("Production meter id = "+this.productionMeterId);
  }

}
