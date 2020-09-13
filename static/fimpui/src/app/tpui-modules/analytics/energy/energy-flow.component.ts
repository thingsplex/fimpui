import {Component,OnInit} from '@angular/core';
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

export interface EnergyRecord {
  deviceId : number;
  name: string;
  type: string;
  power: number;
  eToday: number;
  eWeek: number;
  eMonth: number;
}

@Component({
  selector: 'energy-flow',
  templateUrl: './energy-flow.component.html',
  styleUrls: ['./energy-flow.component.css']
})
export class EnergyFlowComponent implements OnInit {
  private _refreshRate :number = 60;
  gSize : number = 350;
  importFilter = {"tags":{"dir":"import"}}
  toTime :string = "";
  fromTime:string = "";
  pImportMaxValue:number = 5000;
  globalSub : Subscription;
  thingAlias : string = "";

  displayedColumns: string[] = ['name', 'type', 'power', 'eToday','eWeek','eMonth'];
  dataSource : EnergyRecord[];
  eData : EnergyRecord[];

  importLineVisibility : string = "hidden";
  consumptionLineVisibility: string = "hidden";
  productionToConsumptionLineVisibility: string = "hidden";
  productionLineVisibility: string = "hidden";

  importPower : number = 0;
  exportPower : number = 0;

  productionPower : number = 0;
  consumptionPower : number = 0;

  constructor(private registry:ThingsRegistryService,private fimp : FimpService,private settings:AnalyticsSettingsService) {
    this.eData = [
      {deviceId:-1, name: "Total", type: '', power: 0, eToday: 0,eWeek:0,eMonth:0},
      {deviceId:-2, name: "Unknown", type: '', power: 0, eToday: 0,eWeek:0,eMonth:0},
    ];
    this.dataSource = this.eData;
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
      if (fimpMsg.service == "meter_elec" ){
        let importPower:number = 0;
        if (fimpMsg.mtype == "evt.meter_ext.report") {
          if (fimpMsg.val) {
           importPower = fimpMsg.val.p_import
          }
        }else if (fimpMsg.mtype == "evt.meter.report") {
          if(fimpMsg.props["unit"]=="W")
            importPower = fimpMsg.val;
          else
            return;
        }
        importPower = this.roundPower(importPower)

        let t = this.registry.getServiceByAddress(msg.topic)
        if(t.length > 0) {
          let dev = this.registry.getDeviceById(t[0].container_id)
          if(dev) {
            if (dev.type == "meter.main_elec") {
              this.importPower =
              this.thingAlias = dev.alias
              this.importPower =  importPower;
              this.consumptionPower = importPower;
              this.updateFlowLines();
              if(this.importPower>this.pImportMaxValue)
                this.pImportMaxValue = this.importPower + 20;
              this.dataSource[0].power = importPower;
            }else {
              console.log("New non meter report")
              let rec : EnergyRecord = {deviceId:dev.id,name:dev.alias,type:"",power:importPower,eMonth:0,eToday:0,eWeek:0}
              this.updateEnergyDataRecord(rec)

            }
          }
        }
      }
    });
  }

  roundPower(power:number):number {
    if (power>10)
      return Math.round(power)
    else
      return Math.round(power * 10)/10
  }

  updateEnergyDataRecord(rec:EnergyRecord) {
    let sRecs = this.eData.filter(drec => drec.deviceId == rec.deviceId)
    if(sRecs.length>0) {
      sRecs[0] = rec
    }else {
      this.eData.push(rec)
    }
    this.dataSource = [...this.eData];
  }

    updateFlowLines() {
      if(this.importPower>0)
        this.importLineVisibility = "visible"
      if(this.consumptionPower>0)
        this.consumptionLineVisibility = "visible"
    }

   saveToStorage() {
    let configs = {};
    this.settings.updateDashboardConfigs("genericEnergy",configs);
    this.settings.save();
  }

  loadFromStorage():boolean {
    let configs = this.settings.getDashboardConfigs("genericEnergy");
    if (configs) {
      return true
    }
    return false;
  }

}
