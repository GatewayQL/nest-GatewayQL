import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ScopesService } from '../services/scopes.service';
import { ScopeEntity } from '../models/scope.entity';
import { CreateScopeInput } from '../dto/create-scope.input';
import { UpdateScopeInput } from '../dto/update-scope.input';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../users/models/user.interface';

@Resolver(() => ScopeEntity)
export class ScopesResolver {
  constructor(private readonly scopesService: ScopesService) {}

  @Mutation(() => ScopeEntity)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async createScope(
    @Args('createScopeInput') createScopeInput: CreateScopeInput,
  ): Promise<ScopeEntity> {
    return await this.scopesService.create(createScopeInput);
  }

  @Query(() => [ScopeEntity], { name: 'scopes' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getAllScopes(): Promise<ScopeEntity[]> {
    return await this.scopesService.findAll();
  }

  @Query(() => ScopeEntity, { name: 'scope' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getScope(
    @Args('id', { type: () => String }) id: string,
  ): Promise<ScopeEntity> {
    return await this.scopesService.findOne(id);
  }

  @Query(() => ScopeEntity, { name: 'scopeByName' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getScopeByName(
    @Args('name', { type: () => String }) name: string,
  ): Promise<ScopeEntity> {
    return await this.scopesService.findByName(name);
  }

  @Mutation(() => ScopeEntity)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateScope(
    @Args('updateScopeInput') updateScopeInput: UpdateScopeInput,
  ): Promise<ScopeEntity> {
    return await this.scopesService.update(
      updateScopeInput.id,
      updateScopeInput,
    );
  }

  @Mutation(() => ScopeEntity)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeScope(
    @Args('id', { type: () => String }) id: string,
  ): Promise<ScopeEntity> {
    return await this.scopesService.remove(id);
  }
}
