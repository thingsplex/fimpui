import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/debounceTime';
import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/observable/fromEvent';
import {ThingsRegistryService} from "../../registry/registry.service";
import {SimplePieChartComponent} from "../charts/simple-pie-chart.component";
import {Subscription} from "rxjs";
import {AnalyticsSettingsService} from "../charts/settings.service";

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {


  @ViewChild('locationsChart') locationsChartRef: SimplePieChartComponent;
  @ViewChild('thingsByTechChart') thingsByTechChartRef: SimplePieChartComponent;
  @ViewChild('thingsByPowerChart') thingsByPowerChartRef: SimplePieChartComponent;


  public totalThings :number;
  public totalServices : number;
  public totalLocations :number;

  public thingsByTechnology : number[];
  public thingsTechLabels : string[];

  public thingsByPower : number[] = [];
  public thingsPowerLabels : string[] = [];

  public locationNames : string[] = [];
  public thingsPerLocation : number[]=[];

  private registrySub: Subscription = null;

  constructor(private registry:ThingsRegistryService,private settings:AnalyticsSettingsService ) {

  }

  ngOnInit() {
    console.log("Dashboard initialized");
    this.thingsByTechnology = [];
    this.thingsTechLabels = [];

    if (!this.registry.isRegistryInitialized()) {
      if (!this.registrySub) {
        this.registrySub = this.registry.registryState$.subscribe((state) => {
          if(state=="allLoaded") {
            this.calculateDevicesPerLocation();
            this.calculateThingsByType();
            this.calculateRegistryTotals();
            this.updateAllCharts();
            console.log("new registry state = allLoaded");

          }
          console.log("new registry state = "+state);

        });
      }else {
        console.log("sub already initialised ")
      }
    }else {
      console.log("Just calculation ")
      this.calculateDevicesPerLocation();
      this.calculateThingsByType();
      this.calculateRegistryTotals();
    }
    this.calculateFlowStats();
  }

  ngOnDestroy() {
    if(this.registrySub)
      this.registrySub.unsubscribe();
  }

  updateAllCharts() {
    this.locationsChartRef.update();
    this.thingsByTechChartRef.update();
    this.thingsByPowerChartRef.update();
  }

  calculateRegistryTotals() {
    if (this.registry.things == undefined || this.registry.services == undefined || this.registry.locations == undefined) {
      return
    }
    this.totalThings = this.registry.things.length;
    this.totalServices = this.registry.services.length;
    this.totalLocations = this.registry.locations.length;
  }

  calculateDevicesPerLocation() {
    this.locationNames.splice(0,this.locationNames.length)
    this.thingsPerLocation.splice(0,this.thingsPerLocation.length)
    if (this.registry.locations == undefined)
      return;
    for (let loc of this.registry.locations) {
      let locObj = this.registry.getThingsForLocation(loc.id);
      if (locObj == undefined)
        continue;
      let count = locObj.length;
      this.locationNames.push(loc.alias+": "+count);
      this.thingsPerLocation.push(count);
    }
  }

  calculateThingsByType() {
    if (this.registry.things == undefined)
      return;
    let thingsByTech : any = {};
    let thingsByPower : any = {};
    for (let thing of this.registry.things) {
      if (thingsByTech[thing.comm_tech]==undefined)
        thingsByTech[thing.comm_tech] = 1 ;
      else
        thingsByTech[thing.comm_tech]++;  // power source

      if (thingsByPower[thing.power_source]==undefined)
        thingsByPower[thing.power_source] = 1 ;
      else
        thingsByPower[thing.power_source]++;  // power source
    }
    for (let t in thingsByTech) {
      this.thingsTechLabels.push(t+": "+thingsByTech[t]);
      this.thingsByTechnology.push(thingsByTech[t])
    }
    for (let t in thingsByPower) {
      this.thingsPowerLabels.push(t+": "+thingsByPower[t]);
      this.thingsByPower.push(thingsByPower[t])
    }
  }

  calculateFlowStats() {

  }




}
