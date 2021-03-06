import {Component, Inject, OnInit} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from "@angular/material/dialog";
import { Observable } from 'rxjs';


export interface Item { name: string; }

@Component({
  selector: 'flow-lib',
  templateUrl: 'flow-lib.component.html',
  styleUrls: ['flow-lib.component.css']
})
export class FlowLibComponent implements OnInit {
  // private itemsCollection: AngularFirestoreCollection<Item>;
  items: Observable<Item[]>;
  flows: any[];
  constructor(public dialog: MatDialog) {
    // this.flowSourceText = JSON.stringify(data, null, 2)
    // this.itemsCollection = afs.collection<Item>('items');
    // this.items = this.itemsCollection.valueChanges();
    this.flows = [];
  }
  ngOnInit() {
    // this.fire.configureUserAuthListener();
    // this.loadListOfFlows();
    // if (this.fire.checkUserAuth()){
    //
    // }else {
    //   // this.fire.initFirebaseUi();
    // }
  }
  // loadListOfFlows() {
  //   this.fire.getFlows().then((querySnapshot) => {
  //     querySnapshot.forEach((doc) => {
  //       console.log(`${doc.id} => ${doc.data()}`);
  //
  //       var prepData = doc.data()
  //       prepData.DocId = doc.id
  //       if (prepData.UpdatedAt) {
  //         prepData.UpdatedAtDate = prepData.UpdatedAt.toDate();
  //       }
  //
  //
  //       console.dir(prepData);
  //       this.flows.push(prepData)
  //     })
  //   }).catch((error) => {
  //     console.error("Error Loading documents: ", error);
  //     // this.showSignInDialog()
  //   });
  // }

  // showSignInDialog() {
  // let dialogRef = this.dialog.open(SignInDialog,{
  //   width: '450px',
  // });
  // dialogRef.afterClosed().subscribe(result => {
  //   if (result)
  //   {
  //
  //   }
  // });
  // }

  deleteFlow(docId) {
    // this.fire.deleteFlow(docId);
  }

  signOut() {
    // this.fire.signOut();
  }
  // signIn() {
  //   this.fire.initFirebaseUi();
  // }

  importFlow(flow){
    // let headers = new Headers({ 'Content-Type': 'application/json' });
    // let options = new RequestOptions({headers:headers});
    // this.http
    //   .post(BACKEND_ROOT+'/fimp/flow/definition/import',JSON.stringify(flow),  options )
    //   .subscribe ((result) => {
    //     console.log("Flow was saved");
    //   });

    // this.fire.getFlowUrlById(flow.Id).then((flowUrl) => {
    //   console.log("Flow URL:"+flowUrl);
    //
    //   this.http.put(BACKEND_ROOT+'/fimp/flow/definition/import_from_url', {Url:flowUrl,Token:""}).subscribe((res:any) => console.log(res.json()));
    //
    // });



  }


}


