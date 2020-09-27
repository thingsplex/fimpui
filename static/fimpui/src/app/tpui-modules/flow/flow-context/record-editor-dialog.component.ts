import { Component, OnInit,Inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BACKEND_ROOT } from "app/globals";
import {Variable} from "../flow-editor/flow-editor.component";
import {TableContextRec} from "./model";
import {ContextRecord} from "./model"
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {FimpService} from "../../../fimp/fimp.service";
import {Subscription} from "rxjs";
import {FimpMessage} from "../../../fimp/Message";

@Component({
    selector: 'record-editor-dialog',
    templateUrl: 'record-editor-dialog.html',
    styleUrls: ['./flow-context.component.css']
  })
  export class RecordEditorDialog {
    ctxRec : TableContextRec;
    private globalSub : Subscription;
    constructor(public dialogRef: MatDialogRef<RecordEditorDialog>, @Inject(MAT_DIALOG_DATA) public data: TableContextRec, public snackBar: MatSnackBar, private fimp : FimpService) {
          this.ctxRec = data;
          console.dir(data)
    }

    save(){
      let request = new ContextRecord();
      request.Name = this.ctxRec.Name;
      request.Variable = new Variable();
      if (this.ctxRec.Value == undefined) {
        request.Variable.Value = "";
      }else {
        request.Variable.Value = this.ctxRec.Value;
      }

      request.Variable.ValueType = this.ctxRec.ValueType;
      request.Description = this.ctxRec.Description;
      let payload = {"flow_id":"global","rec":request}
      if (this.ctxRec.FlowId ) {
        payload["flow_id"] = this.ctxRec.FlowId;
      }
      let msg  = new FimpMessage("tpflow","cmd.flow.ctx_update_record","object",payload,null,null)
      msg.src = "tplex-ui";
      msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1";
      this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg.toString());


    }
    onTypeSelected(event) {
      console.log("Type selected")
      if (this.ctxRec.ValueType == "int" || this.ctxRec.ValueType == "float") {
        if ( typeof this.ctxRec.Value == "string" || typeof this.ctxRec.Value == "boolean" || this.ctxRec.Value == undefined) {
          this.ctxRec.Value = 0;
        }
      }else if (this.ctxRec.ValueType == "bool") {
        if (typeof this.ctxRec.Value == "string"|| typeof this.ctxRec.Value == "number" || this.ctxRec.Value == undefined) {
          this.ctxRec.Value = true;
        }
      }else {
        if (this.ctxRec.Value == undefined || typeof this.ctxRec.Value == "number" || typeof this.ctxRec.Value == "boolean") {
          this.ctxRec.Value = "";
        }
      }


    }
    delete() {
      let val = {"flow_id":"global","name":this.ctxRec.Name}
      if (this.ctxRec.FlowId ) {
        val["flow_id"] = this.ctxRec.FlowId;
      }
      let msg  = new FimpMessage("tpflow","cmd.flow.ctx_delete","str_map",val,null,null)
      msg.src = "tplex-ui";
      msg.resp_to = "pt:j1/mt:rsp/rt:app/rn:tplex-ui/ad:1";
      this.fimp.publish("pt:j1/mt:cmd/rt:app/rn:tpflow/ad:1",msg.toString());
    }

}
