import {Injectable} from "@angular/core";
import * as firebase from "firebase";
import {stringify} from "querystring";

var fireConfig = {
  apiKey: "AIzaSyBc53fzFqEtPSVIl1iCOSCyPZNx8BtJayY",
  authDomain: "thingsplex.firebaseapp.com",
  databaseURL: "https://thingsplex.firebaseio.com",
  storageBucket: "thingsplex.appspot.com",
  projectId: "thingsplex",
};

firebase.initializeApp(fireConfig);
@Injectable()
export class FireService{
  // Get a reference to the storage service, which is used to create references in your storage bucket
  // Initialize Cloud Firestore through Firebase
  private db : any;
  private storage : any;

  constructor() {
    this.db = firebase.firestore();
    this.storage = firebase.app().storage();
    // Disable deprecated features
    this.db.settings({
      timestampsInSnapshots: true
    });
  }

  public addFlow(flow) {
    var flowMeta = {Id:flow.Id,Name:flow.Name,ClasSId:"",Description:flow.Description,Author:""};
    this.db.collection("flows").add(flowMeta)
      .then(function(docRef) {
        console.log("Document written with ID: ", docRef.id);
      })
      .catch(function(error) {
        console.error("Error adding document: ", error);
      });
    var storageRef = this.storage.ref();
    // Create a reference to 'mountains.jpg'
    var flowRef = storageRef.child("flows/"+flow.Id+".json");
    flowRef.putString(JSON.stringify(flow)).then(function(snapshot) {
      console.log('Uploaded a raw string!');
    });


  }


  public getFlows() {
    return this.db.collection("flows").get();
  }

  public getFlowUrlById(Id:string) {
    return this.storage.ref().child("flows/"+Id+".json").getDownloadURL();
  }

}
