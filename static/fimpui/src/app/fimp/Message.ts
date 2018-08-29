export class FimpMessage {
    // interface type (message type)
	mtype : string ;
	// value type
	valueType : string;
    // value
    val : any;
	// service name
	service :  string;
	// properties
	props : Map<string,string> ;
	// tags
	tags : Array<string> ;
	// version
	version : string;
	// correlation id
	corid : string;
	// creation time
	ctime : string;
	// UID
	uid : string;

    // private field

    topic : string;
    // raw otiginal message
    raw : string
    // browser timestamp
    localTs: number
    // local counter
    localId:number

    constructor(service:string,messageType:string,valueType:string,value:any,props:Map<string,string>,tags : Array<string>) {
        this.service = service;
        this.mtype = messageType;
        this.valueType = valueType;
        this.val = value;
        this.props = props;
        this.tags = tags;
        this.version = "1";
    }
    toString() {
        /*
        jvalue["type"] = mtype;
        jvalue["val_t"] = valueType;
        jvalue["serv"] = service;
        jvalue["tags"] = tags;
        jvalue["props"] = props;
        jvalue["ctime"] = timestamp(mctime);
        */
        let msg = {"serv":this.service,"type":this.mtype,"val_t":this.valueType,"val":this.val,"props":this.props,"tags":this.tags};
        return JSON.stringify(msg);
    }

}

export function NewFimpMessageFromString(jsonString:string):FimpMessage{
        let jobj = JSON.parse(jsonString);
        let msg = new FimpMessage(jobj["serv"],jobj["type"],jobj["val_t"],jobj["val"],jobj["props"],jobj["tags"])
        msg.ctime = jobj["ctime"]
        return msg ;
}
