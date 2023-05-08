import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AboutComponent } from './about/about.component';
import { AngularOnGithubPagesComponent } from './posts/angular-on-github-pages/angular-on-github-pages.component';
import { AzureSqlServerlessComponent } from './posts/azure-sql-serverless/azure-sql-serverless.component';
import { MainComponent } from './main/main.component';

const routes: Routes = [
  {
    path: '',
    component: AboutComponent,
    title: 'Dylan Musil',
  },
  {
    path: 'about',
    component: AboutComponent,
    title: 'Dylan Musil',
  },
  {
    path: 'posts',
    component: MainComponent,
  },
  {
    path: 'posts/angular-on-github-pages',
    component: AngularOnGithubPagesComponent,
    title: 'Angular on Github Pages',
  },
  {
    path: 'posts/azure-sql-serverless',
    component: AzureSqlServerlessComponent,
    title: 'Azure SQL serverless cost control',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
