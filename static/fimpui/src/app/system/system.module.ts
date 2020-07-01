import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { SystemRoutingModule } from "./system-routing.module";
import { last } from 'rxjs/operator/last';
import { FormsModule } from '@angular/forms';
import { MatTableModule,
  MatSortModule,
  MatFormFieldModule,
  MatCheckboxModule,
  MatInputModule,
  MatSelectModule,
  MatChipsModule,
  MatButtonModule,
  MatRadioModule,
  MatCardModule,
  MatIconModule,
  MatSliderModule,
  MatListModule,
  MatDialogModule,
  MatTabsModule,
  MatExpansionModule} from '@angular/material';
import {SystemDashboardComponent} from "./dashboard/systemDashboardComponent";
import {AppsManComponent} from "./apps/apps-man.component";
import {AppConfigComponent} from "./apps/app-config.component";
import {CpuChartComponent} from "./charts/cpu-chart.component";
import {AppsRegistryService} from "./apps/apps-registry.service";


@NgModule({
  imports: [
    CommonModule,
    SystemRoutingModule,
    FormsModule,
    CdkTableModule,
    MatTableModule,
    MatButtonModule,
    MatSortModule,
    MatCardModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatTableModule,
    MatListModule,
    MatIconModule,
    MatRadioModule,
    MatSliderModule,
    MatDialogModule,
    MatExpansionModule,
    MatTabsModule,
  ],
  exports:[],
  providers:[AppsRegistryService],
  declarations: [SystemDashboardComponent,AppsManComponent,AppConfigComponent,AppsManComponent,CpuChartComponent]
})
export class SystemModule { }
