import {Component, Inject, OnInit} from '@angular/core';
import {Flow} from "../flow-editor/flow-editor.component";
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from "@angular/material";
import { Observable } from 'rxjs';
import {FireService} from "../../firebase/fire.service";
import {Headers, Http, RequestOptions} from "@angular/http";
import {BACKEND_ROOT} from "../../globals";


export interface Item { name: string; }

@Component({
  selector: 'flow-share-dialog',
  templateUrl: 'flow-share.component.html',
  styleUrls: ['flow-overview.component.css']
})
export class FlowShareDialog {
  // private itemsCollection: AngularFirestoreCollection<Item>;
  items: Observable<Item[]>;
  flows: any[];
  constructor(public dialogRef: MatDialogRef<FlowShareDialog>,private fire:FireService,private http : Http) {
    // this.flowSourceText = JSON.stringify(data, null, 2)
    // this.itemsCollection = afs.collection<Item>('items');
    // this.items = this.itemsCollection.valueChanges();
    this.flows = [];
    this.loadListOfFlows();

  }

  loadListOfFlows() {
    this.fire.getFlows().then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        console.log(`${doc.id} => ${doc.data()}`);
        console.dir(doc.data());
        this.flows.push(doc.data())
      });
    });
  }

  importFlow(flow){
    // let headers = new Headers({ 'Content-Type': 'application/json' });
    // let options = new RequestOptions({headers:headers});
    // this.http
    //   .post(BACKEND_ROOT+'/fimp/flow/definition/import',JSON.stringify(flow),  options )
    //   .subscribe ((result) => {
    //     console.log("Flow was saved");
    //   });

    this.fire.getFlowUrlById(flow.Id).then((flowUrl) => {
      console.log("Flow URL:"+flowUrl);
      // this.http.get(flowUrl).subscribe ((result) => {

        // This can be downloaded directly:
        // var xhr = new XMLHttpRequest();
        // xhr.responseType = 'blob';
        // xhr.onload = function(event) {
        //   var blob = xhr.response;
        //   xhr.open('GET', flowUrl);
        //   xhr.send();
        //   console.log("Flow is loaded");
        //   let headers = new Headers({ 'Content-Type': 'application/json' });
        //   let options = new RequestOptions({headers:headers});
        //   this.http
        //     .post(BACKEND_ROOT+'/fimp/flow/definition/import',blob,  options )
        //     .subscribe ((result) => {
        //       console.log("Flow was saved");
        //     });
        //
        //
        // };



      // });
    });



  }


}

/*
 apiKey: "AIzaSyBc53fzFqEtPSVIl1iCOSCyPZNx8BtJayY",
    authDomain: "thingsplex.firebaseapp.com",
    databaseURL: "https://thingsplex.firebaseio.com",
    projectId: "thingsplex",
    storageBucket: "thingsplex.appspot.com",
    messagingSenderId: "867239467755"
 */
