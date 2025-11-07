import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { UsersService } from './../services/users.service';
import { UserEntity } from '../models/user.entity';
import { User, UserRole } from '../models/user.interface';
import { CreateUserInput } from './../dto/create-user.input';
import { UpdateUserInput } from './../dto/update-user.input';
import { catchError, map } from 'rxjs/operators';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UsersPipe } from '../pipes/users.pipe';

@Resolver(() => UserEntity)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => UserEntity)
  async createUser(
    @Args('createUserInput', new UsersPipe()) createUserInput: CreateUserInput,
  ) {
    return await this.usersService.create(createUserInput);
  }

  @Query(() => [UserEntity], { name: 'users' })
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  @Query(() => UserEntity, { name: 'userById' })
  async getUser(@Args('id', { type: () => String }) id: string) {
    return await this.usersService.findOne(id);
  }

  @Query(() => UserEntity, { name: 'userByUsername' })
  async getUserByUsername(
    @Args('username', { type: () => String }) username: string,
  ) {
    return await this.usersService.findByUsername(username);
  }

  @Query(() => UserEntity, { name: 'userByEmail' })
  async getUserByEmail(@Args('email', { type: () => String }) email: string) {
    return await this.usersService.findByemail(email);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => UserEntity)
  async updateUser(
    @Args('updateUserInput', new UsersPipe()) updateUserInput: UpdateUserInput,
  ) {
    return await this.usersService.updateOne(
      updateUserInput.id,
      updateUserInput,
    );
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => UserEntity)
  async removeUser(@Args('id', { type: () => String }) id: string) {
    return await this.usersService.deleteOne(id);
  }
}
