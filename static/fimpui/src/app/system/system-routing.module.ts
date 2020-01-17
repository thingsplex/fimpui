import { RouterModule, Routes } from '@angular/router';
import { NgModule } from "@angular/core";
import {SystemDashboardComponent} from "./dashboard/systemDashboardComponent";


@NgModule({
  imports: [RouterModule.forChild([
    { path: 'system/dashboard', component: SystemDashboardComponent },
  ])],
  exports: [RouterModule]
})
export class SystemRoutingModule {}
