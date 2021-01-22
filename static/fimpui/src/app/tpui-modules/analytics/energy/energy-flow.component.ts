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

export interface EnergyRecord {
  deviceId : number;
  name: string;
  type: string;
  power: number;
  powerRatio:number;
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
  @Input() pMaxValue:number;
  @Input() productionMeterId:number;
  globalSub : Subscription;
  thingAlias : string = "";

  displayedColumns: string[] = ['name', 'type', 'power', 'eToday','eWeek','eMonth'];
  dataSource : EnergyRecord[];
  eData : EnergyRecord[];

  importLineVisibility : string = "hidden";
  consumptionLineVisibility: string = "hidden";
  productionToConsumptionLineVisibility: string = "hidden";
  productionLineVisibility: string = "hidden";
  detailedPowerOverviewVisibility : string = "hidden";

  batteryImportVisibility : string = "hidden"
  batteryExportingVisibility : string = "hidden"


  // Grid import and export
  importPower : number = 0;
  exportPower : number = 0;
  // Solar or wind production
  productionPower : number = 0;
  // Household consumption
  consumptionPower : number = 0;

  // Battery charge controller;
  batteryImportPower : number = 0;
  batteryExportPower : number = 0;

  batteryLevel : number = 0;
  batteryHealth: number = 0;
  batteryTemp : number = 0;

  constructor(private registry:ThingsRegistryService,private fimp : FimpService,private settings:AnalyticsSettingsService) {
    this.eData = [
      {deviceId:-1, name: "Total",powerRatio:100,type: '', power: 0, eToday: 0,eWeek:0,eMonth:0},
      {deviceId:-2, name: "Unknown",powerRatio:100 ,type: '', power: 0, eToday: 0,eWeek:0,eMonth:0},
    ];
    this.dataSource = this.eData;
  }
  ngOnInit() {
    console.log("eFlow - Production meter id =",this.productionMeterId);
    // this.setDemoMode();
  }

  ngOnDestroy() {
    if(this.globalSub)
      this.globalSub.unsubscribe();
  }

  setDemoMode() {
    this.importPower =  100;
    this.exportPower =  100;
    this.productionPower = 1000;
    this.consumptionPower = 900;
    this.calculateConsumption();
    this.updateFlowLines();
    this.calculatePowerDistribution();
  }

  toggleDetailedPowerGridVisibility() {
    console.log("toggle button pressed")
    if (this.detailedPowerOverviewVisibility == "hidden")
      this.detailedPowerOverviewVisibility = "visible"
    else
      this.detailedPowerOverviewVisibility = "hidden"
  }

  ngAfterViewInit() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "meter_elec" || fimpMsg.service == "sensor_power" || fimpMsg.service == "inverter_grid_conn" ||
        fimpMsg.service == "inverter_solar_conn" || fimpMsg.service == "inverter_consumer_conn" || fimpMsg.service == "battery_charge_ctrl" ){
        let importPower:number = 0;
        let exportPower:number = 0;
        if (fimpMsg.mtype == "evt.meter_ext.report") {
          if (fimpMsg.val) {
           if (fimpMsg.val.p_import)
              importPower = fimpMsg.val.p_import;
            if (fimpMsg.val.p_export)
              exportPower = fimpMsg.val.p_export;
          }
        }else if (fimpMsg.mtype == "evt.meter.report" || fimpMsg.mtype == "evt.sensor.report") {
          if(fimpMsg.props["unit"]=="W")
            importPower = fimpMsg.val;
          else
            return;
        }
        importPower = this.roundPower(importPower)
        exportPower = this.roundPower(exportPower)
        // some meters can report export using negative values
        if (importPower<0) {
          exportPower = Math.abs(importPower);
          importPower = 0;
        }
        let t = this.registry.getServiceByAddress(fimpMsg.topic)
        if(t.length > 0) {
          let dev = this.registry.getDeviceById(t[0].container_id)
          if(dev) {
            if (dev.id == this.productionMeterId || fimpMsg.service == "inverter_solar_conn") {
              this.productionPower = exportPower;
              console.log("Production report "+this.productionPower)
              this.calculateConsumption();
              this.updateFlowLines();
              this.calculatePowerDistribution();
            }else if (dev.type == "meter.main_elec" || fimpMsg.service == "inverter_grid_conn") {
              this.thingAlias = dev.alias
              this.importPower = importPower;
              this.exportPower = exportPower;
              if (this.productionPower == 0 && this.exportPower > 0) // This is the case if production meter is not present
                this.productionPower = this.exportPower;
              this.calculateConsumption();
              this.updateFlowLines();
              this.calculatePowerDistribution();
              this.dataSource[0].power = importPower;

            }else if (fimpMsg.service == "battery_charge_ctrl")  {

            }else {
              let rec : EnergyRecord = {deviceId:dev.id,name:dev.alias,type:dev.type,power:importPower,powerRatio:0,eMonth:0,eToday:0,eWeek:0}
              this.updateEnergyDataRecord(rec);
              this.calculatePowerDistribution();
            }
          }
        }
      }
    });
  }

  calculateConsumption() {
    if (this.productionPower > 0) {
      this.consumptionPower = this.productionPower + this.importPower - this.exportPower;
    }else {
      this.consumptionPower = Math.abs(this.importPower - this.exportPower);
    }
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
      sRecs[0].power =  rec.power
    }else {
      this.eData.push(rec);
      this.dataSource = [...this.eData];
    }
  }
  calculatePowerDistribution() {
    let sumPower = 0;
    for (let rec of this.eData) {
      if (rec.deviceId>=0) {
        sumPower+=rec.power;
        rec.powerRatio = Math.round(((rec.power*100)/this.consumptionPower)*10)/10;
      }
    }
    this.eData.filter(drec =>drec.deviceId == -1)[0].power = this.consumptionPower;
    let unknownPower = (this.consumptionPower-sumPower);
    let unknownDev = this.eData.filter(drec =>drec.deviceId == -2)[0];
    unknownDev.power = unknownPower
    unknownDev.powerRatio = Math.round( ((unknownPower*100)/this.consumptionPower)*10)/10
  }

  updateFlowLines() {
      if(this.importPower>0)
        this.importLineVisibility = "visible"
      else
        this.importLineVisibility = "hidden"

      if(this.consumptionPower>0)
        this.consumptionLineVisibility = "visible"
      else
        this.consumptionLineVisibility = "hidden"

      if(this.exportPower>0)
        this.productionLineVisibility = "visible"
      else
        this.productionLineVisibility = "hidden"

      if(this.productionPower>0)
        this.productionToConsumptionLineVisibility = "visible"
      else
        this.productionToConsumptionLineVisibility = "hidden"

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
