import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AppsService } from '../services/apps.service';
import { AppEntity } from '../models/app.entity';
import { CreateAppInput } from '../dto/create-app.input';
import { UpdateAppInput } from '../dto/update-app.input';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/models/user.interface';
import { Public } from '../../policies/decorators/public.decorator';

@Resolver(() => AppEntity)
export class AppsResolver {
  constructor(private readonly appsService: AppsService) {}

  @Mutation(() => AppEntity)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async createApp(
    @Args('createAppInput') createAppInput: CreateAppInput,
  ): Promise<AppEntity> {
    return await this.appsService.create(createAppInput);
  }

  @Query(() => [AppEntity], { name: 'apps' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllApps(): Promise<AppEntity[]> {
    return await this.appsService.findAll();
  }

  @Query(() => AppEntity, { name: 'app' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getApp(
    @Args('id', { type: () => String }) id: string,
  ): Promise<AppEntity> {
    return await this.appsService.findOne(id);
  }

  @Query(() => [AppEntity], { name: 'appsByUser' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getAppsByUserId(
    @Args('userId', { type: () => String }) userId: string,
  ): Promise<AppEntity[]> {
    return await this.appsService.findByUserId(userId);
  }

  @Query(() => AppEntity, { name: 'appByName', nullable: true })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getAppByName(
    @Args('name', { type: () => String }) name: string,
  ): Promise<AppEntity> {
    return await this.appsService.findByName(name);
  }

  @Query(() => AppEntity, { name: 'appByNameAndUser', nullable: true })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getAppByNameAndUserId(
    @Args('name', { type: () => String }) name: string,
    @Args('userId', { type: () => String }) userId: string,
  ): Promise<AppEntity> {
    return await this.appsService.findByNameAndUserId(name, userId);
  }

  @Query(() => [AppEntity], { name: 'activeApps' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getActiveApps(): Promise<AppEntity[]> {
    return await this.appsService.findActiveApps();
  }

  @Query(() => [AppEntity], { name: 'inactiveApps' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getInactiveApps(): Promise<AppEntity[]> {
    return await this.appsService.findInactiveApps();
  }

  @Mutation(() => AppEntity)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async updateApp(
    @Args('updateAppInput') updateAppInput: UpdateAppInput,
  ): Promise<AppEntity> {
    return await this.appsService.update(updateAppInput.id, updateAppInput);
  }

  @Mutation(() => AppEntity)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async activateApp(
    @Args('id', { type: () => String }) id: string,
  ): Promise<AppEntity> {
    return await this.appsService.activate(id);
  }

  @Mutation(() => AppEntity)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async deactivateApp(
    @Args('id', { type: () => String }) id: string,
  ): Promise<AppEntity> {
    return await this.appsService.deactivate(id);
  }

  @Mutation(() => AppEntity)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeApp(
    @Args('id', { type: () => String }) id: string,
  ): Promise<AppEntity> {
    return await this.appsService.remove(id);
  }
}
