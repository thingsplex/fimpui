import {Injectable} from "@angular/core";
import * as firebase from "firebase";
// import {stringify} from "querystring";
import * as firebaseui from 'firebaseui'

var fireConfig = {
  apiKey: "AIzaSyBc53fzFqEtPSVIl1iCOSCyPZNx8BtJayY",
  authDomain: "thingsplex.firebaseapp.com",
  databaseURL: "https://thingsplex.firebaseio.com",
  storageBucket: "thingsplex.appspot.com",
  projectId: "thingsplex",
};


@Injectable()
export class FireService{
  // Get a reference to the storage service, which is used to create references in your storage bucket
  // Initialize Cloud Firestore through Firebase
  private db : any;
  private storage : any;
  private firebaseAuthUi:any;
  // public user:any;

  constructor() {

    console.log("Firebase service initialized")
    firebase.initializeApp(fireConfig);
    this.db = firebase.firestore();
    this.storage = firebase.app().storage();
    // Disable deprecated features
    this.db.settings({
      timestampsInSnapshots: true
    });
    // this.configureUserAuthListener()
    // this.initFirebaseUi()
  }

  public addFlow(flow) {
    var flowMeta = {Id:flow.Id,Name:flow.Name,ClassId:"",Description:flow.Description,Author:"",UpdatedAt:firebase.firestore.Timestamp.now()};
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

  // public initFirebaseUi(){
  //   var uiConfig = {
  //     // signInSuccessUrl: 'http://localhost:4200/fimp/flow/overview',
  //     signInOptions: [
  //       // Leave the lines as is for the providers you want to offer your users.
  //       firebase.auth.GoogleAuthProvider.PROVIDER_ID,
  //       firebase.auth.FacebookAuthProvider.PROVIDER_ID,
  //       firebase.auth.TwitterAuthProvider.PROVIDER_ID,
  //       firebase.auth.GithubAuthProvider.PROVIDER_ID,
  //       firebase.auth.EmailAuthProvider.PROVIDER_ID,
  //       firebase.auth.PhoneAuthProvider.PROVIDER_ID,
  //       firebaseui.auth.AnonymousAuthProvider.PROVIDER_ID
  //     ],
  //     // tosUrl and privacyPolicyUrl accept either url string or a callback
  //     // function.
  //     // Terms of service url/callback.
  //     signInFlow:"popup",
  //     callbacks: {
  //       signInSuccess: () => false,
  //     },
  //     tosUrl: '<your-tos-url>',
  //     // Privacy policy url/callback.
  //     privacyPolicyUrl: function() {
  //       window.location.assign('http://localhost:4200/fimp/flow/overview');
  //     }
  //   };
  //
  //   if (this.firebaseAuthUi == undefined) {
  //     // Initialize the FirebaseUI Widget using Firebase.
  //     this.firebaseAuthUi = new firebaseui.auth.AuthUI(firebase.auth());
  //   }
  //
  //   // The start method will wait until the DOM is loaded.
  //   this.firebaseAuthUi.start('#firebaseui-auth-container', uiConfig);
  //
  // }

  public signIn(email:string , password:string) {
    console.log("User signed in with email = "+email);
    firebase.auth().signInWithEmailAndPassword(email, password)
      .catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode === 'auth/wrong-password') {
          alert('Wrong password.');
        } else {
          alert(errorMessage);
        }
        console.log(error);
      });
  }

  public signUp(email:string , password:string) {
    console.log("User signed in with email = "+email);
    firebase.auth().createUserWithEmailAndPassword(email, password)
      .catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode === 'auth/weak-password') {
          alert('Wrong password.');
        } else {
          alert(errorMessage);
        }
        console.log(error);
      });
  }

  public checkUserAuth() {
    console.log("User auth")
    console.dir(firebase.auth().currentUser)
    return firebase.auth().currentUser
  }





  public signOut() {
    firebase.auth().signOut()
  }

  public deleteFlow(docId) {
    this.db.collection("flows").doc(docId).delete().then(function() {
      console.log("Document successfully deleted!");
    }).catch(function(error) {
      console.error("Error removing document: ", error);
    });
  }

  public getFlows() {
    return this.db.collection("flows").get();
  }

  public getFlowUrlById(Id:string) {
    return this.storage.ref().child("flows/"+Id+".json").getDownloadURL();
  }

}
