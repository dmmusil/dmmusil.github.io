import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { MainComponent } from './main/main.component';
import { AngularOnGithubPagesComponent } from './posts/angular-on-github-pages/angular-on-github-pages.component';
import { AzureSqlServerlessComponent } from './posts/azure-sql-serverless/azure-sql-serverless.component';

const routes: Routes = [
  { path: '', component: MainComponent },
  {
    path: 'about',
    component: AboutComponent,
  },
  {
    path: 'posts',
    children: [
      { 
        path: 'azure-sql-serverless', 
        component: AzureSqlServerlessComponent,
        title: 'Azure SQL serverless cost control'
      },
      {
        path: 'angular-on-github-pages',
        component: AngularOnGithubPagesComponent,
        title: 'Angular on Github Pages'
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
