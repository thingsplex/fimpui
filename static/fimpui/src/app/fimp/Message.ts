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

	src : string;

	resp_to: string;

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
        this.src = "";
        this.version = "1";
        this.uid = this.getUuid();
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
        if(this.src=="" || this.src == undefined ) {
          this.src = "tplex-ui"
        }
        if(this.version == "") {
          this.version = "1";
        }
        let msg = {"serv":this.service,
          "type":this.mtype,
          "val_t":this.valueType,
          "val":this.val,
          "props":this.props,
          "tags":this.tags,
          "resp_to":this.resp_to,
          "src":this.src,
          "ver":this.version,
          "uid":this.uid,
          "topic":this.topic
        };
        return JSON.stringify(msg);
    }

  getUuid(){
    var dt = new Date().getTime();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = (dt + Math.random()*16)%16 | 0;
      dt = Math.floor(dt/16);
      return (c=='x' ? r :(r&0x3|0x8)).toString(16);
    });
    return uuid;
  }

}

export function NewFimpMessageFromString(jsonString:string):FimpMessage{
        let jobj = JSON.parse(jsonString);
        let msg = new FimpMessage(jobj["serv"],jobj["type"],jobj["val_t"],jobj["val"],jobj["props"],jobj["tags"])
        msg.ctime = jobj["ctime"];
        msg.src = jobj["src"];
        if (msg.src == "" || msg.src == undefined)
          msg.src = "-"
        msg.corid = jobj["corid"];
        msg.topic = jobj["topic"];
        msg.resp_to = jobj["resp_to"];
        return msg ;
}
