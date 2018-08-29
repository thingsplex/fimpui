export class Thing {
    alias :string
    address :string ;
    commTech :string ;
    productHash : string;
    productName:string;
    manufacturerId : string;
    productId : string ; 
    deviceId :string ;
    hwVersion :string ;
    swVersion :string ;
    powerSource : string;
    wakeupInterval : string;
    services:Service[]=[];
    category:string;
    security:string;
    locationId:number;
    locationAlias:string;
    propertySets : Map<string,Map<string,any>>;
    techSpecificProps : Map<string,string>;

}

export class Service {
    name : string;
    address : string ;
    enabled: boolean;
    groups : string[];
    location : string ;
    props : Map<string,any>;
    propSetRef : string;
    interfaces : Interface[]=[];
}

export class Interface {
    type :string ;
    msgType : string ;
    valueType : string ;
    lastValue : any ;
    version : string ;
}

