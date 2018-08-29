import { Component, OnInit } from '@angular/core';
import { BACKEND_ROOT } from "app/globals";
import { Http, Response,URLSearchParams }  from '@angular/http';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {

  constructor(private http : Http) { }

  ngOnInit() {
  }

  public vinculumSync(){
    this.http
      .get(BACKEND_ROOT+'/fimp/vinculum/import_to_registry')
      .subscribe ((result) => {
         console.log("Synced");
      });
  }

  public clearRegistry(){
    this.http
    .delete(BACKEND_ROOT+'/fimp/api/registry/clear_all')
    .subscribe ((result) => {
       console.log("All entries were deleted");
    });
  }
 
  public reindexRegistry(){
    this.http
    .post(BACKEND_ROOT+'/fimp/api/registry/reindex',null)
    .subscribe ((result) => {
       console.log("DB reindexed successfully");
    });
  }
}
