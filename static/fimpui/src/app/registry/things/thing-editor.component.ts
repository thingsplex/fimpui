import { Component, OnInit,Inject } from '@angular/core';
import { Http, Response,URLSearchParams,RequestOptions,Headers }  from '@angular/http';
import { MatDialog, MatDialogRef,MatSnackBar} from '@angular/material';
import { MAT_DIALOG_DATA} from '@angular/material';
import { BACKEND_ROOT } from "app/globals";

@Component({
    selector: 'thing-editor-dialog',
    templateUrl: 'thing-editor-dialog.html',
  })
  export class ThingEditorDialog {
    locationId : number;
    alias : string;
    thingId : number;     
    constructor(public dialogRef: MatDialogRef<ThingEditorDialog>,@Inject(MAT_DIALOG_DATA) public data: any,public snackBar: MatSnackBar,private http : Http) {
          console.dir(data)
          this.thingId = data.id
          this.alias = data.alias
          this.locationId = data.locationId
    }
    onLocationSelected(locationId:number ) {
        console.log("Location selected = "+locationId) 
        this.locationId = locationId
    }
    save(){
      let headers = new Headers({ 'Content-Type': 'application/json' });
      let options = new RequestOptions({headers:headers});
      let request = {"id":this.thingId,"alias":this.alias,"location_id":this.locationId}
      this.http
        .put(BACKEND_ROOT+'/fimp/api/registry/thing',JSON.stringify(request),  options )
        .subscribe ((result) => {
           console.log("Thing fields were saved");
           this.dialogRef.close("ok");
        });
    }
    
  }
  