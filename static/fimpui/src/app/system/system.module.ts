import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { HttpModule } from '@angular/http';
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
import {CpuChartComponent} from "./charts/cpu-chart.component";


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
     HttpModule,
  ],
  exports:[],
  declarations: [SystemDashboardComponent,CpuChartComponent]
})
export class SystemModule { }
