import {HttpClient, HttpHeaders} from "@angular/common/http";
import {BACKEND_ROOT} from "../globals";
import {Injectable} from "@angular/core";

const FIMP_SERVICE_LIST = [
    {"name":"basic","label":"Generic level","icon":""},
    {"name":"dev_sys","label":"Device system services","icon":""},
    {"name":"out_bin_switch","label":"On/off switch/relay","icon":""},
    {"name":"out_lvl_switch","label":"Level switch/dimmer","icon":""},
    {"name":"meter_elec","label":"Electricity meter","icon":""},
    {"name":"meter_gas","label":"Gas meter","icon":""},
    {"name":"meter_water","label":"Water meter","icon":""},
    {"name":"sensor_temp","label":"Temperature sensor","icon":""},
    {"name":"sensor_lumin","label":"Luminance sensor","icon":""},
    {"name":"sensor_contact","label":"Open/close sensor","icon":""},
    {"name":"sensor_presence","label":"Presence detection sensor","icon":""},
    {"name":"alarm_fire","label":"Fire alarm","icon":""},
    {"name":"alarm_heat","label":"Heat alarm","icon":""},
    {"name":"alarm_burglar","label":"Intrusion alarm","icon":""},
    {"name":"battery","label":"Battery level","icon":""},
    {"name":"thermostat","label":"Thermostat","icon":""},
    {"name":"door_lock","label":"Door lock","icon":""},
    {"name":"color_ctrl","label":"Color control","icon":""},
    {"name":"scene_ctrl","label":"Scene controller","icon":""},
    {"name":"fan_ctrl","label":"Fan speed and modes","icon":""},
    {"name":"siren_ctrl","label":"Siren control","icon":""}

];

export function getFimpServiceList() {
    return FIMP_SERVICE_LIST
}

export interface InterfaceMeta {
  name :string
  label:string
  type :string
}

export interface ServiceMeta {
  name :string
  label:string
  icon :string
}


@Injectable()
export class FimpApiMetadataService {
  private interfaces : InterfaceMeta[];
  private services : ServiceMeta[];
  constructor(private http : HttpClient) {
  this.loadFimpApiMetadata();
  }

  loadFimpApiMetadata() {
    const headers = new HttpHeaders({'Cache-Control':  'no-cache, no-store, must-revalidate, post-check=0, pre-check=0','Pragma': 'no-cache','Expires': '0'});
    this.http
      .get(BACKEND_ROOT+'/fimp/misc/fimp-api.json',{headers:headers} )
      .subscribe ((result) => {
        console.log("List of autocomplete interfaces 1:")
        console.dir(result);
       this.interfaces = result["interfaces"];
       this.services = result["services"];
        console.dir(this.interfaces);
      });
  }
  getInterfaceMetaByName(name:string):InterfaceMeta {
    let r = this.interfaces.filter(rec => rec.name == name)
    if (r.length > 0)
      return r[0]
    else
      return null
  }

  getListOfInterfaces():InterfaceMeta[] {
    return this.interfaces;
  }

  getServiceMetaByName(name:string):ServiceMeta {
    let r = this.services.filter(rec => rec.name == name)
    if (r.length > 0)
      return r[0]
    else
      return null
  }

}
