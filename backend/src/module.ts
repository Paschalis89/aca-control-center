import {Module} from '@nestjs/common';import {APP_GUARD} from '@nestjs/core';import {JwtModule} from '@nestjs/jwt';import {ScheduleModule} from '@nestjs/schedule';
import {Db} from './db.service';import {SessionGuard} from './auth/auth';import {AuthController} from './auth/auth.controller';import {Audit} from './audit/audit.service';import {ExpensesController,RecurringController} from './expenses/expenses.controller';import {ForecastsController} from './forecasts/forecasts.controller';import {OverviewController} from './overview/overview.controller';import {SettingsController,ActivityController} from './settings/settings.controller';import {UsersController} from './users/users.controller';import {RecurrencesService} from './recurrences/recurrences.service';import {Controller,Get} from '@nestjs/common';import {Public} from './auth/auth';
import {CommerceController} from './commerce/commerce.controller';
import {ShopifySync} from './commerce/shopify.service';
import {PartnersController} from './partners/partners.controller';
import {MarketingController} from './marketing/marketing.controller';
import {ReportsController} from './reports/reports.controller';
import {InsightsController} from './insights/insights.controller';
@Controller()class HealthController{@Public()@Get('healthz')health(){return {ok:true,service:'aca-control-center'};}}
@Module({imports:[JwtModule.register({secret:process.env.JWT_SECRET,signOptions:{expiresIn:'1d'}}),ScheduleModule.forRoot()],controllers:[AuthController,ExpensesController,RecurringController,ForecastsController,OverviewController,SettingsController,ActivityController,UsersController,HealthController,CommerceController,PartnersController,MarketingController,ReportsController,InsightsController],providers:[Db,Audit,RecurrencesService,ShopifySync,{provide:APP_GUARD,useClass:SessionGuard}]})
export class AppModule{}
