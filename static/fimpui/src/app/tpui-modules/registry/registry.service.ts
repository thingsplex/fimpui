import { Injectable } from '@angular/core';
import {FimpService} from "app/fimp/fimp.service";
import {HttpClient} from "@angular/common/http";
import {Subject, Subscription} from "rxjs";
import {FimpMessage, NewFimpMessageFromString} from "../../fimp/Message";
import {FimpApiMetadataService} from "../../fimp/fimp-api-metadata.service";

@Injectable()
export class ThingsRegistryService{

  public services : any = [];
  public locations : any = [];
  public things : any = [];
  public devices :any = [];
  private locResponseReceived = false;
  private thingsResponseReceived = false;
  private servicesResponseReceived = false;
  private registryStateSource = new Subject<string>();
  public registryState$ = this.registryStateSource.asObservable();
  private globalSub : Subscription;
  private lastRequestId:string;
  private thingsQueryRequestId:string;
  private devicesQueryRequestId:string;
  constructor(private fimp: FimpService, private fimpMeta: FimpApiMetadataService) {
    console.log("registry service constructor")
    this.fimp.getConnStateObservable().subscribe((state: any) => {
        console.log(" reg: FimpService onConnect . State = ",state);
        if (this.fimp.isConnected()) {
          console.log("---------Loading registry ----------------------")
          this.configureFimpListener()
          this.loadAllComponents();
        }
      });

  }
  public init() {
  }

  configureFimpListener() {
    this.globalSub = this.fimp.getGlobalObservable().subscribe((fimpMsg) => {
      if (fimpMsg.service == "tpflow" ){
        if (fimpMsg.mtype == "evt.registry.locations_report") {
          if (fimpMsg.val) {
            this.locResponseReceived = true;
            this.locations = fimpMsg.val;
            this.registryStateSource.next("locationsLoaded");
            this.notifyRegistryState();
            console.log("Locations loaded !!!!!")
          }
        } else if (fimpMsg.mtype == "evt.registry.things_report") {
          if (fimpMsg.val) {
            if (this.thingsQueryRequestId == fimpMsg.corid) {
              this.thingsResponseReceived = true;
              this.things = fimpMsg.val;
              this.registryStateSource.next("thingsLoaded");
              this.notifyRegistryState();
            } else if (this.devicesQueryRequestId == fimpMsg.corid) {
              this.devices = fimpMsg.val;
              this.registryStateSource.next("devicesLoaded");
              this.notifyRegistryState();
              console.log("Things loaded !!!!!")
            }
          }
        } else if (fimpMsg.mtype == "evt.registry.services_report") {
          if (fimpMsg.val) {
            this.servicesResponseReceived = true;
            this.services = fimpMsg.val;
            this.enrichServicesReport();
            // console.log("Enriched services:")
            // console.dir(this.services);
            this.registryStateSource.next("servicesLoaded");
            this.notifyRegistryState();
            console.log("Services loaded !!!!!")
          }
        }
      }
    });
  }

  loadAllComponents() {
    this.loadLocations();
    this.loadThings();
    this.loadDevices();
    this.loadServices();
  }

  loadServices() {
    console.log("reg: Requesting services")
    let val = {
        "filter_without_alias": "",
        "location_id": "",
        "service_name": "",
        "thing_id": ""
      };
    let msg  = new FimpMessage("tpflow","cmd.registry.get_services","str_map",val,null,null)
    msg.src = "tplex-ui"
    this.lastRequestId = msg.uid;
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }
  loadLocations() {
    console.log("reg: Requesting locations")
    let msg  = new FimpMessage("tpflow","cmd.registry.get_locations","str_map",{},null,null)
    msg.src = "tplex-ui"
    this.lastRequestId = msg.uid;
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

  loadThings() {
    console.log("reg: Requesting things")
    let msg  = new FimpMessage("tpflow","cmd.registry.get_things","str_map",{},null,null)
    msg.src = "tplex-ui"
    this.thingsQueryRequestId = msg.uid;
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

  loadDevices() {
    console.log("reg: Requesting devices")
    let msg  = new FimpMessage("tpflow","cmd.registry.get_devices","str_map",{},null,null)
    msg.src = "tplex-ui"
    this.devicesQueryRequestId = msg.uid;
    msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
    this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
  }

  notifyRegistryState() {
    if (this.isRegistryInitialized()) {
      this.registryStateSource.next("allLoaded");
    }
  }

  isRegistryInitialized():boolean {
    if (this.thingsResponseReceived && this.locResponseReceived && this.servicesResponseReceived)
      return true;
    else
      return false;
  }


  getLocationById(locationId:number) {
    if(this.locations)
      return this.locations.filter(location => location.id == locationId)
    else
      return []
  }

  getThingsForLocation(locationId:number) {
    if(this.things)
      return this.things.filter(thing => thing.location_id == locationId)
    else
      return []
  }

  getDevicesForLocation(locationId:number) {
    if(this.devices)
      return this.devices.filter(device => device.location_id == locationId)
    else
      return []
  }

  getDevicesForThing(thingId:number) {
    if(this.devices)
      return this.devices.filter(device => device.thing_id == thingId)
    else
      return []
  }

  getThingById(thingId:number) {
    if(this.things)
      return this.things.filter(thing => thing.id == thingId)[0]
  }

  getDeviceById(devId:number) {
    if (this.devices)
      return this.devices.filter(dev => dev.id == devId)[0]
  }

  getThingByAddress(tech:string,address:string) {
    // console.dir(this.things);
    let fullAddress = "/rn:"+tech+"/ad:1/ad:"+address;
    let things = this.things.filter(thing => (thing.address == fullAddress ))
    return things
  }

  getThingByFullAddress(address:string) {
    // console.dir(this.things);
    if(this.things)
      return this.things.filter(thing => (thing.address == address ))
    else
      return []
  }

  getServiceByAddress(address:string) {
    if (this.services)
      return this.services.filter(service => address.indexOf(service.address)>=0)
    else
      return []
  }

  getServicesForThing(thingId:number) {
    if (this.services)
      return this.services.filter(service => service.container_id == thingId)
    else
      return []
  }

  getServicesForDevice(deviceId:number) {
    if (this.services)
      return this.services.filter(service => service.container_id == deviceId && service.container_type == "dev")
    else
      return []
  }

  getServiceById(serviceId:number) {
    if (this.services)
      return this.services.filter(service => service.id == serviceId)[0]
  }

  getServiceByDeviceIdAndName(deviceId:number,name: string) {
    this.enrichServicesReport();
    if (this.services)
      return this.services.filter(service => service.container_id == deviceId && service.container_type == "dev" && service.name == name )[0]
  }

  getDevicesFilteredByService(serviceName:string) {
    if (this.services) {
      let services = this.services.filter(service => service.container_type == "dev" && service.name == serviceName)
      let result = [];
      for (let svc of services) {
        let dev = this.getDeviceById(svc.container_id)
        if (dev)
          result.push(dev)
      }
      return result;
    } else {
      return []

    }
  }
  /* {
      "id": 0,
      "integr_id": "",
      "container_id": 122,
      "container_type": "dev",
      "name": "scene_ctrl",
      "enabled": false,
      "alias": "zw_398_4_24",
      "address": "/rt:dev/rn:zw/ad:1/sv:scene_ctrl/ad:41_0",
      "groups": null,
      "location_id": 0,
      "props": null,
      "tags": null,
      "interfaces": [
        {
          "intf_t": "",
          "msg_t": "cmd.scene.get_report",
          "val_t": "",
          "ver": ""
        },
        {
          "intf_t": "",
          "msg_t": "cmd.scene.set",
          "val_t": "",
          "ver": ""
        },
        {
          "intf_t": "",
          "msg_t": "evt.scene.report",
          "val_t": "",
          "ver": ""
        }
      ],
      "attributes": null
    }

   */
  enrichServicesReport() {
    console.log("Enriching services")
    if (this.services) {
      for (let svc of this.services) {
        let svcMeta = this.fimpMeta.getServiceMetaByName(svc.name);
        if (svcMeta) {
          svc.alias = svcMeta.label;
        }
        for (let intf of svc.interfaces) {
          let intfMeta = this.fimpMeta.getInterfaceMetaByName(intf.msg_t);
          if (intfMeta) {
            intf["alias"] = intfMeta.label
            if (intf.val_t == "") {
              intf["val_t"] = intfMeta.type
            }
          }

        }

      }
    }
  }

}


