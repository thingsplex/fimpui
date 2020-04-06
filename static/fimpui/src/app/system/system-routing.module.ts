import { RouterModule, Routes } from '@angular/router';
import { NgModule } from "@angular/core";
import {SystemDashboardComponent} from "./dashboard/systemDashboardComponent";
import {AppsManComponent} from "./apps/apps-man.component";
import {AppConfigComponent} from "./apps/app-config.component";


@NgModule({
  imports: [RouterModule.forChild([
    { path: 'system/dashboard', component: SystemDashboardComponent },
    { path: 'system/apps-man', component: AppsManComponent },
    { path: 'system/app-config/:name/:version', component: AppConfigComponent },
  ])],
  exports: [RouterModule]
})
export class SystemRoutingModule {}
