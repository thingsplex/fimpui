import { Component, OnInit,Inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import {FimpService} from "app/fimp/fimp.service";
import {FimpMessage} from "app/fimp/Message";

@Component({
    selector: 'device-editor-dialog',
    templateUrl: 'device-editor-dialog.html',
  })
  export class DeviceEditorDialog {
    locationId : number;
    alias : string;
    deviceId : number;
    type : string;
    constructor(public dialogRef: MatDialogRef<DeviceEditorDialog>,@Inject(MAT_DIALOG_DATA) public data: any,public snackBar: MatSnackBar,private fimp:FimpService) {
          console.dir(data)
          this.deviceId = data.id;
          this.alias = data.alias;
          this.locationId = data.locationId;
          this.type = data.type;
    }
    onLocationSelected(locationId:number ) {
        console.log("Location selected = "+locationId)
        this.locationId = locationId
    }
    save(){
      let val = {"id":this.deviceId,"alias":this.alias,"location_id":this.locationId}
      let msg  = new FimpMessage("tpflow","cmd.registry.update_device","object",val,null,null)
      this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg);
      this.dialogRef.close("ok");
    }

    saveToVinculum() {
      let spType = this.type.split(".")
      let vType = spType[0];
      let vSubtype:string;
      if(spType.length==2)
        vSubtype = spType[1];
      else
        vSubtype = null;

      let val = {
        "cmd": "edit",
        "component": "device",
        "id": this.deviceId,
        "client": {
          "name": this.alias
        },
        "param": {
          "room": this.locationId,
          "type": {
            "type": vType,
            "subtype": vSubtype
          }
        },
        "requestId": null
      }
      let msg  = new FimpMessage("vinculum","cmd.pd7.request","object",val,null,null)
      msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1";
      console.debug(msg)
      this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:vinculum/ad:1",msg);
      this.dialogRef.close("ok");
    }
    /*
    pt:j1/mt:cmd/rt:app/rn:vinculum/ad:1
    {
  "serv": "vinculum",
  "type": "cmd.pd7.request",
  "val_t": "object",
  "val": {
    "cmd": "edit",
    "component": "device",
    "id": 124,
    "client": {
      "name": "Hue go "
    },
    "param": {
      "room": 7,
      "type": {
        "type": "light",
        "subtype": null
      }
    },
    "requestId": null
  },
  "props": null,
  "tags": null,
  "src": "app",
  "ver": "1",
  "uid": "39b89f63-8901-4fb1-94ce-d54cf969eb0a",
  "topic": "pt:j1/mt:cmd/rt:app/rn:vinculum/ad:1"
}

Response

{
  "serv": "vinculum",
  "type": "evt.pd7.response",
  "val_t": "object",
  "val": {
    "errors": null,
    "param": null,
    "requestId": null,
    "success": true
  },
  "props": {},
  "tags": null,
  "src": "tplex-ui",
  "ver": "1",
  "uid": "640b64c8-f37d-4203-93e2-ed3af387eddd",
  "topic": "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1"
}
     */



  }
