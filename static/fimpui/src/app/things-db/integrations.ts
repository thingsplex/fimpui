import { FimpMessage } from '../fimp/Message';
import { Thing , Service , Interface } from '../things-db/thing-model';

export function MapFimpInclusionReportToThing(fimpMsg : FimpMessage ):Thing{
    let val = fimpMsg.val;
    return MapJsonToThingObject(val);
}


export function MapJsonToThingObject(val:any):Thing {
    let thing = new Thing();
    thing.address = val.address;
    thing.alias = val.alias;
    thing.commTech = val.comm_tech;
    thing.deviceId = val.device_id;
    thing.productName = val.product_name;
    thing.hwVersion = val.hw_ver;
    thing.swVersion = val.sw_ver;
    thing.manufacturerId = val.manufacturer_id;
    thing.powerSource = val.power_source;
    thing.productHash = val.product_hash;
    thing.productId = val.product_id;
    thing.category = val.category;
    thing.security = val.security
    thing.wakeupInterval = val.wakeup_interval;
    thing.locationId = val.location_id;
    thing.locationAlias = val.location_alias;
    for (let fimpService of val.services ) {
        let service = new Service();
        service.name = fimpService.name;
        service.address = fimpService.address;
        service.enabled = fimpService.enabled;
        service.groups = fimpService.groups;
        service.props = fimpService.props;
        for (let fimpIntf of fimpService.interfaces) {
            let intf = new Interface();
            intf.msgType = fimpIntf.msg_t;
            intf.type = fimpIntf.intf_t;
            intf.valueType = fimpIntf.val_t;
            service.interfaces.push(intf);
        }
        thing.services.push(service);
    }
    return thing;
}